#!/usr/bin/env node
/* 用 agent-browser CLI 做端到端功能验证 */
import { execFileSync } from 'node:child_process';

const SESSION = 'koi';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ab(args) {
  return execFileSync('agent-browser', ['--session', SESSION, ...args], {
    encoding: 'utf8', maxBuffer: 1 << 24,
  }).trim();
}
function ev(js) {
  const out = ab(['eval', js]);
  // agent-browser 会把字符串结果再 JSON 引用一层
  try {
    const once = JSON.parse(out);
    if (typeof once === 'string') {
      try { return JSON.parse(once); } catch { return once; }
    }
    return once;
  } catch {
    return out;
  }
}
const info = () => ev('JSON.stringify(window.__koiPond.info)');
function mouse(args) { ab(['mouse', ...args]); }
async function click(x, y) {
  mouse(['move', String(x), String(y)]);
  mouse(['down', 'left']);
  await sleep(90);
  mouse(['up', 'left']);
}
const meanDist = (x, y) => ev(
  `(()=>{const f=window.__koiPond.fish();let s=0;for(const k of f)s+=Math.hypot(k.x-${x},k.y-${y});return (s/f.length).toFixed(1);})()`
);

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
}

console.log('=== 锦鲤池 · 功能验证 ===\n');

// --- 准备：固定画质，避免自适应干扰 ---
ab(['errors', '--clear']);
ab(['reload']);
await sleep(3000);
ev('window.__koiPond.setAdapt(false);window.__koiPond.setQuality(0);1');
await sleep(800);

const errs0 = ab(['errors']);
check('页面无运行时错误', errs0 === '' || /no errors|^$/.test(errs0), errs0 || '(clean)');

const i0 = info();
check('锦鲤数量 ≥ 8', i0.koi >= 8, `koi=${i0.koi}`);
check('初始无鱼食 / 全部巡游', i0.food === 0 && i0.states.wander === i0.koi, JSON.stringify(i0.states));

// --- 连续投食 ---
const spots = [[700, 400], [770, 440], [840, 400], [900, 440], [830, 480], [760, 470]];
for (const [x, y] of spots) { await click(x, y); await sleep(260); }
const i1 = info();
check('连续投食生成鱼食', i1.food > 0 && i1.fed >= 20, `food=${i1.food} fed=${i1.fed}`);
check('鱼群进入进食状态', (i1.states.feed || 0) >= 8, JSON.stringify(i1.states));
check('点击产生涟漪', i1.ripples > 0, `ripples=${i1.ripples}`);

const dBefore = +meanDist(800, 440);
await sleep(2200);
const i2 = info();
const dAfter = +meanDist(800, 440);
check('鱼群向投食点聚拢', dAfter < dBefore * 0.85, `meanDist ${dBefore} → ${dAfter}`);
check('鱼食被吃掉', i2.eaten > 0, `eaten=${i2.eaten} / fed=${i2.fed}`);

// --- 尾巴摆动 / 身体弯曲 ---
const spineA = ev('JSON.stringify(window.__koiPond.spine(0))');
await sleep(320);
const spineB = ev('JSON.stringify(window.__koiPond.spine(0))');
function tailLateral(sp) {
  const p = typeof sp === 'string' ? JSON.parse(sp) : sp;
  const n = p.length;
  const head = p[0], tail = p[n - 1];
  const dx = tail[0] - head[0], dy = tail[1] - head[1];
  const L = Math.hypot(dx, dy) || 1;
  // 尾端相对“头尾直线”的横向偏移
  let maxLat = 0;
  for (const q of p) {
    const lat = Math.abs((q[0] - head[0]) * dy - (q[1] - head[1]) * dx) / L;
    if (lat > maxLat) maxLat = lat;
  }
  return maxLat;
}
const bendA = tailLateral(spineA), bendB = tailLateral(spineB);
const tA = (typeof spineA === 'string' ? JSON.parse(spineA) : spineA).at(-1);
const tB = (typeof spineB === 'string' ? JSON.parse(spineB) : spineB).at(-1);
const dTail = Math.hypot(tA[0] - tB[0], tA[1] - tB[1]);
check('身体弯曲（脊线横向偏移）', bendA > 6 && bendB > 6, `bend=${bendA.toFixed(1)}px / ${bendB.toFixed(1)}px`);
check('尾部随摆动位移', dTail > 2, `tail moved ${dTail.toFixed(1)}px in 0.32s`);

// --- 吃完散开 ---
await sleep(7000);
const i3 = info();
const dDisperse = +meanDist(800, 440);
check('鱼食吃完', i3.food === 0 && i3.eaten === i3.fed, `food=${i3.food} eaten=${i3.eaten}/${i3.fed}`);
check('吃完后散开', dDisperse > dAfter * 1.15, `meanDist ${dAfter} → ${dDisperse}`);

// --- 暂停 ---
ab(['find', 'first', '#btnPause', 'click']);
await sleep(300);
const p1 = info();
const t1 = p1.time;
await sleep(1200);
const p2 = info();
check('暂停按钮生效', p2.paused === true, `paused=${p2.paused}`);
check('暂停后时间冻结', Math.abs(p2.time - t1) < 0.05, `time ${t1} → ${p2.time}`);
ab(['find', 'first', '#btnPause', 'click']);
await sleep(400);
check('恢复运行', info().paused === false, `paused=${info().paused}`);

// --- 重置 ---
ab(['find', 'first', '#btnReset', 'click']);
await sleep(600);
const r = info();
check('重置清空鱼食与计数', r.food === 0 && r.fed === 0 && r.eaten === 0, `food=${r.food} fed=${r.fed} eaten=${r.eaten}`);
check('重置后全部巡游', r.states.wander === r.koi, JSON.stringify(r.states));
check('重置后计时归零', r.time < 1.2, `time=${r.time}`);
check('重置后锦鲤仍为 11', r.koi === 11, `koi=${r.koi}`);

// --- 重置后再次投食（验证可重复） ---
await click(800, 450);
await sleep(1500);
const again = info();
check('重置后可再次投食', again.fed > 0 && (again.states.feed || 0) > 0, `fed=${again.fed} states=${JSON.stringify(again.states)}`);

// --- 键盘快捷键 ---
ab(['press', 'Space']);
await sleep(300);
check('空格暂停', info().paused === true, `paused=${info().paused}`);
ab(['press', 'Space']);
await sleep(200);
ab(['press', 'r']);
await sleep(500);
const rk = info();
check('R 键重置', rk.fed === 0 && rk.states.wander === rk.koi, `fed=${rk.fed} ${JSON.stringify(rk.states)}`);

// --- 窗口缩放 ---
ab(['set', 'viewport', '1280', '720']);
await sleep(900);
const rz = info();
check('窗口缩放后仍正常', rz.koi === 11 && rz.res[0] > 0, `res=${rz.res} rs=${rz.rs}`);
ab(['set', 'viewport', '1600', '900']);
await sleep(700);

const errs1 = ab(['errors']);
check('全程无运行时错误', errs1 === '' || /no errors|^$/.test(errs1), errs1 || '(clean)');

const pass = results.filter((r) => r.ok).length;
console.log(`\n=== 结果：${pass}/${results.length} 通过 ===`);
if (pass !== results.length) process.exit(1);
