#!/usr/bin/env node
/*
 * ds41-fluid 端到端验证
 * 用 agent-browser 驱动真实浏览器：真实鼠标拖动 + 合成触摸指针 + 真实按钮/键盘，
 * 并通过页面内的 GPU 探针（把浮点场降采样到 8bit 后 readPixels）做定量断言。
 *
 * 依赖：本机已安装 agent-browser（npm i -g agent-browser）与 Chrome。
 * 运行页面本身不需要它。
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SESSION = 'fluid';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + path.join(HERE, 'index.html');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ab(args) {
  return execFileSync('agent-browser', ['--session', SESSION, ...args], {
    encoding: 'utf8', maxBuffer: 1 << 26,
  }).trim();
}
function ev(js) {
  const out = ab(['eval', js]);
  try {
    const once = JSON.parse(out);
    if (typeof once === 'string') {
      try { return JSON.parse(once); } catch { return once; }
    }
    return once;
  } catch { return out; }
}
const J = (o) => JSON.stringify(o);

const info = () => ev('JSON.stringify(window.__fluid.info)');
const probe = () => ev('JSON.stringify(window.__fluid.probe())');
const probeVel = () => ev('JSON.stringify(window.__fluid.probeVelocity())');
const displayProbe = () => ev('JSON.stringify(window.__fluid.displayProbe())');
const clear = () => ev('window.__fluid.clear(); 1');
const setQuality = (q) => ev(`window.__fluid.setQuality(${JSON.stringify(q)}); 1`);
const setDiss = (v) => ev(`(()=>{const e=document.getElementById('dissipation');e.value='${v}';e.dispatchEvent(new Event('input',{bubbles:true}));return e.value;})()`);
const setCurl = (v) => ev(`(()=>{const e=document.getElementById('curl');e.value='${v}';e.dispatchEvent(new Event('input',{bubbles:true}));return e.value;})()`);
const mass = (p) => p.mean[0] + p.mean[1] + p.mean[2];

function mouse(args) { ab(['mouse', ...args]); }
async function drag(x0, y0, x1, y1, steps = 22) {
  mouse(['move', String(x0), String(y0)]);
  mouse(['down', 'left']);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    mouse(['move', String(Math.round(x0 + (x1 - x0) * t)), String(Math.round(y0 + (y1 - y0) * t))]);
    await sleep(14);
  }
  mouse(['up', 'left']);
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  —  ${detail}`);
}
const finite = (o) => JSON.stringify(o).match(/null|NaN|Infinity/) === null;

// 从 8×8 探针网格计算：行方向（y）质量分布 → 判断染料是否横向铺开
function rowMass(p) {
  const rows = new Array(8).fill(0);
  for (let i = 0; i < 64; i++) {
    const [r, g, b] = p.grid[i];
    rows[Math.floor(i / 8)] += r + g + b;
  }
  return rows;
}
function cellsWith(p, fn) {
  let n = 0;
  for (let i = 0; i < 64; i++) { const c = p.grid[i]; if (fn(c[0], c[1], c[2])) n++; }
  return n;
}

console.log('=== ds41-fluid · 实时二维彩色流体 验证 ===\n');
console.log('URL:', URL, '\n');

// ---------------------------------------------------------------- 启动
ab(['errors', '--clear']);
ab(['open', URL]);
await sleep(2600);
setQuality('medium');           // 固定画质，排除自适应干扰
await sleep(700);
clear();
await sleep(500);

const i0 = info();
check('页面加载且求解器就绪', i0 && i0.canvas[0] > 0 && i0.simW > 0 && i0.dyeW > 0,
  `canvas=${i0.canvas} 速度场=${i0.simW}×${i0.simH} 染料场=${i0.dyeW}×${i0.dyeH}`);

const e0 = ab(['errors']);
check('启动阶段无运行时错误', e0 === '' || /no errors/i.test(e0), e0 || '(clean)');

// ---------------------------------------------------------------- 清空
clear();
await sleep(400);
const pc = probe();
const sc = displayProbe();
check('清空后染料场归零', pc.lit === 0 && mass(pc) < 1e-3, `lit=${pc.lit} mean=${J(pc.mean)}`);
check('清空后显示输出为黑', sc.mean[0] + sc.mean[1] + sc.mean[2] < 1.5, `displayMean=${J(sc.mean)}`);

// ---------------------------------------------------------------- 鼠标拖动注入
await drag(360, 360, 920, 400, 26);
await sleep(120);
const p1 = probe();
const v1 = probeVel();
const s1 = displayProbe();
check('鼠标拖动注入染料', p1.lit > 250, `lit=${p1.lit}/4096`);
check('鼠标拖动注入推力（速度场非零）', mass(v1) > 0.02, `|v| 探针均值=${J(v1.mean)}`);
check('染料经显示着色器上屏', s1.lit > 200, `显示输出 lit=${s1.lit}/${s1.total}`);

// 连续拖动：多段路径叠加，检查覆盖率
await drag(400, 520, 900, 300, 24);
await drag(880, 520, 420, 300, 24);
const p2 = probe();
check('连续多次拖动持续累积染料', p2.lit > p1.lit * 1.15, `lit ${p1.lit} → ${p2.lit}`);

// ---------------------------------------------------------------- 颜色控制
ev(`(()=>{const a=document.getElementById('autoColor');a.checked=false;a.dispatchEvent(new Event('change',{bubbles:true}));
        const c=document.getElementById('color');c.value='#ff0040';c.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()`);
clear();
await sleep(300);
await drag(500, 360, 780, 360, 18);
await sleep(200);
const pRed = probe();
check('手动颜色控制生效（红主导）',
  pRed.max[0] > 0.3 && pRed.max[0] > pRed.max[1] * 1.6,
  `maxRGB=${J(pRed.max)}`);
ev(`(()=>{const a=document.getElementById('autoColor');a.checked=true;a.dispatchEvent(new Event('change',{bubbles:true}));return 1;})()`);

// ---------------------------------------------------------------- 涡旋结构
setDiss(0);
setCurl(40);
clear();
await sleep(300);
// 沿水平线注入，并给一个沿 +x 的剪切速度
ev(`(()=>{for(let i=0;i<9;i++){const x=0.22+i*0.07;window.__fluid.splat(x,0.5,520,0,0.5,0.35,0.15,0.9);}return 1;})()`);
await sleep(260);
const rowsBefore = rowMass(probe());
await sleep(2200);
const pCurl = probe();
const rowsAfter = rowMass(pCurl);
const spreadBefore = rowsBefore.filter((m) => m > 0.05).length;
const spreadAfter = rowsAfter.filter((m) => m > 0.05).length;
check('水平注射后染料横向铺开（存在卷曲/剪切）',
  spreadAfter > spreadBefore && spreadAfter >= 3,
  `占据行数 ${spreadBefore} → ${spreadAfter}（8 行网格）`);
check('涡旋强度控制写入生效', info().curlStrength === 40, `curl=${info().curlStrength}`);

// ---------------------------------------------------------------- 双色混合
setDiss(0.2);
clear();
await sleep(300);
ev(`(()=>{for(let k=0;k<6;k++){
        window.__fluid.splat(0.28,0.5,900,0,0.7,0.02,0.02,1.5);
        window.__fluid.splat(0.72,0.5,-900,0,0.02,0.02,0.7,1.5);
      }return 1;})()`);
await sleep(3600);
const pMix = probe();
const redCells = cellsWith(pMix, (r, g, b) => r > 0.05 && r > b * 1.3);
const blueCells = cellsWith(pMix, (r, g, b) => b > 0.05 && b > r * 1.3);
const mixCells = cellsWith(pMix, (r, g, b) => r > 0.03 && b > 0.03);
check('两处不同颜色同时存在', redCells > 0 && blueCells > 0, `红格=${redCells} 蓝格=${blueCells}`);
check('不同位置注入的颜色相互混合（出现品红区）', mixCells >= 2, `混合格=${mixCells}（8×8 网格）`);

// ---------------------------------------------------------------- 暂停
setDiss(0.9);
clear();
await sleep(300);
ev(`window.__fluid.splat(0.5,0.5,0,0,0.5,0.5,0.5,0.6); 1`);
await sleep(500);
ev(`window.__fluid.setPaused(true); 1`);
await sleep(250);
const pa = probe(); const ia = info();
await sleep(1400);
const pb = probe(); const ib = info();
check('暂停按钮/API 生效', ia.paused === true && ib.paused === true, `paused=${ib.paused}`);
check('暂停后物理时间冻结', Math.abs(ib.simTime - ia.simTime) < 0.02, `simTime ${ia.simTime} → ${ib.simTime}`);
check('暂停后染料场完全静止', mass(pa) === mass(pb) && pa.lit === pb.lit, `mass ${mass(pa).toFixed(6)} = ${mass(pb).toFixed(6)}`);
ev(`window.__fluid.setPaused(false); 1`);
await sleep(900);
const pd = probe();
check('恢复后继续演化', mass(pd) !== mass(pb), `mass ${mass(pb).toFixed(6)} → ${mass(pd).toFixed(6)}`);

// ---------------------------------------------------------------- 消散控制
setDiss(0);
clear();
await sleep(250);
ev(`window.__fluid.splat(0.5,0.5,0,0,0.5,0.5,0.5,0.8); 1`);
await sleep(350);
const slow0 = mass(probe());
await sleep(2400);
const slow1 = mass(probe());
check('消散=0 时染料基本保留', slow1 > slow0 * 0.8, `mass ${slow0.toFixed(4)} → ${slow1.toFixed(4)}`);

setDiss(4);
clear();
await sleep(250);
ev(`window.__fluid.splat(0.5,0.5,0,0,0.5,0.5,0.5,0.8); 1`);
await sleep(350);
const fast0 = mass(probe());
await sleep(2400);
const fast1 = mass(probe());
check('消散=4 时染料快速衰减', fast1 < fast0 * 0.35, `mass ${fast0.toFixed(4)} → ${fast1.toFixed(4)}`);

// ---------------------------------------------------------------- 触摸拖动（合成 PointerEvent）
setDiss(0.9);
clear();
await sleep(300);
const pe = (type, id, x, y) => `(()=>{const c=document.getElementById('c');
  c.dispatchEvent(new PointerEvent('${type}',{pointerId:${id},pointerType:'touch',clientX:${x},clientY:${y},
    bubbles:true,cancelable:true,isPrimary:${id === 1},button:0,buttons:${type === 'pointerup' ? 0 : 1}}));return 1;})()`;
ev(pe('pointerdown', 1, 420, 380));
await sleep(120);
const touchDownCount = ev('window.__fluid.pointerCount()');
for (let i = 1; i <= 8; i++) {
  ev(pe('pointermove', 1, 420 + i * 45, 380 + Math.sin(i) * 30));
  await sleep(60);
}
await sleep(200);
const touchP = probe();
ev(pe('pointerup', 1, 800, 380));
await sleep(150);
const touchUpCount = ev('window.__fluid.pointerCount()');
check('触摸指针被正确识别', touchDownCount === 1 && touchUpCount === 0, `down=${touchDownCount} up=${touchUpCount}`);
check('触摸拖动注入染料', touchP.lit > 120, `lit=${touchP.lit}/4096`);

// 双指同时注入
ev(pe('pointerdown', 2, 350, 250));
ev(pe('pointerdown', 3, 850, 500));
await sleep(150);
const twoCount = ev('window.__fluid.pointerCount()');
await sleep(400);
ev(pe('pointermove', 2, 450, 300));
ev(pe('pointermove', 3, 780, 430));
await sleep(300);
ev(pe('pointerup', 2, 450, 300));
ev(pe('pointerup', 3, 780, 430));
await sleep(200);
const pMulti = probe();
check('多指同时注入（不同颜色互不干扰）', twoCount === 2 && pMulti.lit > 60,
  `同时指针=${twoCount} lit=${pMulti.lit}`);

// ---------------------------------------------------------------- 键盘快捷键
ev(`window.__fluid.clear(); 1`);
await sleep(200);
ab(['press', 'Space']);
await sleep(250);
check('空格键暂停', info().paused === true, `paused=${info().paused}`);
ab(['press', 'Space']);
await sleep(200);
check('空格键恢复', info().paused === false, `paused=${info().paused}`);
ev(`window.__fluid.splat(0.5,0.5,0,0,0.5,0.5,0.5,0.7); 1`);
await sleep(300);
ab(['press', 'c']);
await sleep(400);
check('C 键清空', probe().lit === 0, `lit=${probe().lit}`);

// ---------------------------------------------------------------- 窗口缩放
clear();
await sleep(250);
ev(`window.__fluid.splat(0.5,0.5,0,0,0.6,0.3,0.9,0.9); 1`);
await sleep(300);
const beforeResize = info();
ab(['set', 'viewport', '820', '620']);
await sleep(900);
const afterResize = info();
const aspectBefore = beforeResize.canvas[0] / beforeResize.canvas[1];
const aspectAfter = afterResize.canvas[0] / afterResize.canvas[1];
check('窗口缩放后网格跟随纵横比重建',
  afterResize.canvas[0] > 0 && afterResize.simW > 0 &&
  Math.abs(aspectAfter - aspectBefore) > 0.2,
  `canvas ${J(beforeResize.canvas)} → ${J(afterResize.canvas)}，网格 ${beforeResize.simW}×${beforeResize.simH} → ${afterResize.simW}×${afterResize.simH}`);
await sleep(400);
const pResize = probe();
check('缩放后染料保留且继续演化', pResize.lit > 0 && finite(pResize), `lit=${pResize.lit}`);
ab(['set', 'viewport', '1280', '720']);
await sleep(700);
check('缩放回原尺寸无错误', ab(['errors']) === '' || /no errors/i.test(ab(['errors'])), ab(['errors']) || '(clean)');

// ---------------------------------------------------------------- 持续操作稳定性
console.log('\n— 持续操作压力测试（约 12s，随机拖动 + 注入）—');
setDiss(0.9);
setCurl(30);
let stressOk = true, stressDetail = '', minFps = 1e9, maxMean = 0;
const t0 = Date.now();
let k = 0;
while (Date.now() - t0 < 12000) {
  k++;
  const r = (n) => Math.round(n);
  if (k % 3 === 0) {
    await drag(r(120 + Math.random() * 900), r(120 + Math.random() * 480),
               r(120 + Math.random() * 900), r(120 + Math.random() * 480), 14);
  } else {
    ev(`window.__fluid.splat(${(Math.random()).toFixed(3)},${(Math.random()).toFixed(3)},
        ${(Math.random() * 900 - 450).toFixed(0)},${(Math.random() * 900 - 450).toFixed(0)},
        ${Math.random().toFixed(2)},${Math.random().toFixed(2)},${Math.random().toFixed(2)},0.8); 1`);
    await sleep(90);
  }
  const st = info();
  const pr = probe();
  minFps = Math.min(minFps, st.fps);
  maxMean = Math.max(maxMean, mass(pr));
  if (!finite(pr) || !finite(st) || st.errors.length > 0) {
    stressOk = false;
    stressDetail = '出现 NaN/Infinity 或错误: ' + J(st.errors);
    break;
  }
}
const endInfo = info();
check('持续操作 12s 无错误、无 NaN', stressOk && endInfo.errors.length === 0,
  stressOk ? `minFps=${minFps.toFixed(0)} 峰值染料均值=${maxMean.toFixed(3)}` : stressDetail);
check('持续操作后帧率仍 > 0', endInfo.fps > 0, `fps=${endInfo.fps}`);
check('染料未整体过曝（保留颜色层次）', maxMean < 2.2, `峰值均值=${maxMean.toFixed(3)}`);
check('压力测试后指针全部释放', endInfo.pointers === 0, `pointers=${endInfo.pointers}`);

// ---------------------------------------------------------------- 收尾
const eEnd = ab(['errors']);
check('全程无运行时错误', eEnd === '' || /no errors/i.test(eEnd), eEnd || '(clean)');

const pass = results.filter((r) => r.ok).length;
console.log(`\n=== 结果：${pass}/${results.length} 通过 ===`);
if (pass !== results.length) {
  console.log('\n失败项：');
  for (const r of results.filter((x) => !x.ok)) console.log('  -', r.name, '|', r.detail);
  process.exit(1);
}
