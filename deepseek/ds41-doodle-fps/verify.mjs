/**
 * 自动化验证脚本：在真实浏览器里跑这个游戏，检查操作、碰撞、武器、死亡与重开。
 *
 *   node verify.mjs                 # 自动使用 / 启动 5185 端口的 dev server
 *   PORT=5199 node verify.mjs       # 指定端口
 *   HEADED=1 node verify.mjs        # 看着它跑
 *
 * 依赖 playwright（本地或全局安装皆可）。截图输出到 shots/。
 */

import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5185);
const BASE = `http://127.0.0.1:${PORT}/`;
const SHOTS = path.join(__dirname, 'shots');
mkdirSync(SHOTS, { recursive: true });

// ------------------------------------------------------------ playwright
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const root = execSync('npm root -g').toString().trim();
  ({ chromium } = require(path.join(root, 'playwright')));
}

// ------------------------------------------------------------ 结果
const results = [];
let failures = 0;

function check(name, cond, detail = '') {
  const ok = !!cond;
  if (!ok) failures++;
  results.push({ ok, name, detail });
  const mark = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${mark} ${name}${detail ? `  \x1b[90m${detail}\x1b[0m` : ''}`);
  return ok;
}

const near = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;

// ------------------------------------------------------------ server
async function ensureServer() {
  const alive = async () => {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(1200) });
      return r.ok;
    } catch {
      return false;
    }
  };
  if (await alive()) return null;
  console.log(`[verify] 启动 vite (${BASE}) …`);
  const proc = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: __dirname,
    stdio: 'ignore',
    detached: false,
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await alive()) return proc;
  }
  throw new Error('vite 启动超时');
}

// ------------------------------------------------------------ 主流程
const server = await ensureServer();

const browser = await chromium.launch({
  headless: !process.env.HEADED,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });

const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

console.log(`\n\x1b[1mDS41 · 横格纸涂鸦 FPS — 自动化验证\x1b[0m  ${BASE}\n`);

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction('window.__READY__ === true', null, { timeout: 20000 });

// 用固定步进，让断言可复现
const init = await page.evaluate(() => {
  window.__GAME__.setAutoUpdate(false);
  return window.__GAME__.snapshot();
});

const G = {
  snap: () => page.evaluate(() => window.__GAME__.snapshot()),
  step: (n = 1, dt = 1 / 60) =>
    page.evaluate(([n, dt]) => window.__GAME__.step(dt, n), [n, dt]),
  key: (code, down) => page.evaluate(([c, d]) => window.__GAME__.key(c, d), [code, down]),
  tap: (code) => page.evaluate((c) => window.__GAME__.tap(c), code),
  start: () => page.evaluate(() => window.__GAME__.start()),
  restart: () => page.evaluate(() => window.__GAME__.restart()),
  teleport: (x, y, z) => page.evaluate(([x, y, z]) => window.__GAME__.teleport(x, y, z), [x, y, z]),
  aimAt: (x, y, z) => page.evaluate(([x, y, z]) => window.__GAME__.aimAt(x, y, z), [x, y, z]),
  fire: () => page.evaluate(() => window.__GAME__.fire()),
  release: () => page.evaluate(() => window.__GAME__.release()),
  select: (i) => page.evaluate((i) => window.__GAME__.selectWeapon(i), i),
  reload: () => page.evaluate(() => window.__GAME__.reload()),
  refill: () => page.evaluate(() => window.__GAME__.refill()),
  damage: (n) => page.evaluate((n) => window.__GAME__.damage(n), n),
  killPlayer: () => page.evaluate(() => window.__GAME__.killPlayer()),
  clear: () => page.evaluate(() => window.__GAME__.clearEnemies()),
  spawn: (x, z) => page.evaluate(([x, z]) => window.__GAME__.spawnEnemy(x, z), [x, z]),
  blocked: (a, b) => page.evaluate(([a, b]) => window.__GAME__.rayBlocked(...a, ...b), [a, b]),
  ground: (x, z) => page.evaluate(([x, z]) => window.__GAME__.groundHeight(x, z), [x, z]),
  inside: (x, y, z) =>
    page.evaluate(([x, y, z]) => window.__GAME__.insideSolid(x, y, z), [x, y, z]),
  shot: (name) => page.screenshot({ path: path.join(SHOTS, name) }),
  text: (sel) => page.textContent(sel),
  cls: (sel) => page.getAttribute(sel, 'class'),
  setAmmo: (i, mag, reserve) =>
    page.evaluate(([i, mag, reserve]) => window.__GAME__.setAmmo(i, mag, reserve), [i, mag, reserve]),
  /** 瞄准当前还活着的第一个敌人 */
  aimEnemy: async () => {
    const e = await page.evaluate(() => {
      const s = window.__GAME__.snapshot();
      const alive = s.enemies.filter((x) => !x.dead);
      return alive.length ? { x: alive[0].x, z: alive[0].z } : null;
    });
    if (e) await G.aimAt(e.x, 1.0, e.z);
    return e;
  },
};

// ============================================================ 1. 初始状态
check('页面无 JS 异常', pageErrors.length === 0, pageErrors[0] || '');
check('初始状态为菜单', init.state === 'menu', init.state);
check('菜单遮罩可见', !(await G.cls('#overlay')).includes('hidden'));
check('初始 HUD 隐藏', (await G.cls('#hud')).includes('hidden'));
check('地图碰撞体数量合理', init.colliders > 40, `${init.colliders} 个`);
await G.shot('01-menu.png');

// ============================================================ 2. 开始游戏
await G.start();
await G.step(2);
let s = await G.snap();
check('点击开始后进入游戏', s.state === 'playing', s.state);
check('初始刷出 3 个火柴人', s.enemies.length === 3, `${s.enemies.length} 个`);
check('HUD 显示', !(await G.cls('#hud')).includes('hidden'));
check('遮罩隐藏', (await G.cls('#overlay')).includes('hidden'));
check('初始武器是步枪', s.weapon.id === 'rifle', s.weapon.name);
check('步枪初始弹药 30/150', s.weapon.mag === 30 && s.weapon.reserve === 150, `${s.weapon.mag}/${s.weapon.reserve}`);

// ============================================================ 3. WASD 移动
await G.clear();
await G.teleport(0, 0, 20);
await G.aimAt(0, 1.6, 0);
const base = await G.snap();

await G.key('KeyW', true);
await G.step(30);
await G.key('KeyW', false);
await G.step(5);
let w = await G.snap();
check('W 向前（-Z）移动', w.player.z < base.player.z - 1.2, `z ${base.player.z} → ${w.player.z}`);
check('W 不产生横向漂移', Math.abs(w.player.x - base.player.x) < 0.15, `x ${w.player.x}`);

await G.teleport(0, 0, 20);
await G.aimAt(0, 1.6, 0);
await G.key('KeyS', true);
await G.step(30);
await G.key('KeyS', false);
await G.step(5);
let back = await G.snap();
check('S 向后（+Z）移动', back.player.z > 20.8, `z ${back.player.z}`);

await G.teleport(0, 0, 20);
await G.aimAt(0, 1.6, 0);
await G.key('KeyA', true);
await G.step(30);
await G.key('KeyA', false);
await G.step(5);
let left = await G.snap();
check('A 向左（-X）移动', left.player.x < -1.0, `x ${left.player.x}`);

await G.teleport(0, 0, 20);
await G.aimAt(0, 1.6, 0);
await G.key('KeyD', true);
await G.step(30);
await G.key('KeyD', false);
await G.step(5);
let right = await G.snap();
check('D 向右（+X）移动', right.player.x > 1.0, `x ${right.player.x}`);

// 疾走比走路快
await G.teleport(0, 0, 20);
await G.aimAt(0, 1.6, 0);
await G.key('KeyW', true);
await G.key('ShiftLeft', true);
await G.step(30);
await G.key('KeyW', false);
await G.key('ShiftLeft', false);
await G.step(3);
const sprint = await G.snap();
check('Shift 疾走更快', 20 - sprint.player.z > 20 - w.player.z + 0.6, `疾走 ${(20 - sprint.player.z).toFixed(2)}m vs 走 ${(20 - w.player.z).toFixed(2)}m`);

// ============================================================ 4. 鼠标瞄准
await G.teleport(0, 0, 20);
const yaw0 = (await G.snap()).player.yaw;
await page.evaluate(() => window.__GAME__.look(200, 0));
await G.step(1);
const yaw1 = (await G.snap()).player.yaw;
check('鼠标横向移动改变朝向', Math.abs(yaw1 - yaw0) > 0.2, `yaw ${yaw0} → ${yaw1}`);
await page.evaluate(() => window.__GAME__.look(0, 200));
await G.step(1);
const pitch1 = (await G.snap()).player.pitch;
check('鼠标纵向移动改变俯仰', Math.abs(pitch1) > 0.2, `pitch ${pitch1}`);
check('俯仰被限制在 ±90° 内', Math.abs(pitch1) < Math.PI / 2, `pitch ${pitch1}`);

// ============================================================ 5. 碰撞
await G.teleport(-30, 0, 0);
await G.aimAt(0, 1.6, 0);
await G.key('KeyA', true);
await G.step(90);
await G.key('KeyA', false);
const wall = await G.snap();
check('墙壁挡住玩家（不会穿墙）', wall.player.x > -31.8, `x ${wall.player.x}（墙内沿 -32）`);
check('玩家没有卡在墙里', (await G.inside(wall.player.x, 0.9, wall.player.z)) === null);

// 高台底部可以钻过去，头顶的板不挡路
await G.teleport(3, 0, 8);
await G.aimAt(30, 1.6, 8);
await G.key('KeyW', true);
await G.step(60);
await G.key('KeyW', false);
const under = await G.snap();
check('可以从高台底下穿过', under.player.x > 5, `x ${under.player.x}`);

// ============================================================ 6. 楼梯 / 台阶
await G.teleport(-6.5, 0, 8);
await G.aimAt(20, 1.6, 8);
await G.key('KeyW', true);
await G.step(150);
await G.key('KeyW', false);
await G.step(10);
const stairs = await G.snap();
check('能沿楼梯爬上高台', stairs.player.y >= 2.85, `y ${stairs.player.y}`);
check('高台地面高度 ≈ 3.0', near(await G.ground(stairs.player.x, stairs.player.z), 3.0, 0.06));
check('站在台上没有卡进地板', (await G.inside(stairs.player.x, stairs.player.y + 0.9, stairs.player.z)) === null);
await G.shot('02-platform.png');

// ============================================================ 7. 跳跃上箱子
await G.teleport(0, 0, -3.6);
await G.aimAt(0, 1.6, -10);
await G.key('KeyW', true);
await G.tap('Space');
await G.step(22);
await G.key('KeyW', false);
await G.step(45);
const onCrate = await G.snap();
check('能跳上 1.3m 的木箱', onCrate.player.y > 1.2, `y ${onCrate.player.y}`);
check('落在木箱顶面高度 ≈ 1.3', near(onCrate.player.y, 1.3, 0.08), `y ${onCrate.player.y}`);

// ============================================================ 8. 射击 / 命中 / 弹药
await G.clear();
await G.teleport(0, 0, 16);
const eId = await G.spawn(0, 10);
await G.aimAt(0, 1.0, 10);
await G.step(1);
let before = await G.snap();
const hp0 = before.enemies.find((e) => e.id === eId).hp;

await G.fire();
await G.step(3);
await G.release();
await G.step(2);
let after1 = await G.snap();
check('左键射击消耗弹药', after1.weapon.mag === 29, `${before.weapon.mag} → ${after1.weapon.mag}`);
check('子弹命中敌人造成伤害', after1.enemies[0].hp < hp0, `hp ${hp0} → ${after1.enemies[0].hp}`);
check('命中产生墨迹贴花', after1.decals > 0, `${after1.decals} 个`);
check('命中产生飞溅颗粒', after1.particles > 0, `${after1.particles} 个`);
await G.shot('03-shooting.png');

// 两枪打死（26×2 > 34）
await G.step(10);
await G.aimEnemy();
await G.fire();
await G.step(3);
await G.release();
await G.step(5);
let killed = await G.snap();
check('击杀计数增加', killed.kills === 1, `kills ${killed.kills}`);
check('敌人被击杀', killed.enemies.length === 0 || killed.enemies[0].dead, `剩余 ${killed.enemies.length}`);

// ============================================================ 9. 墙挡住子弹
await G.clear();
await G.teleport(0, 0, 3);
const behind = await G.spawn(0, -6);
await G.aimAt(0, 1.0, -6);
await G.step(1);
const blocked = await G.blocked([0, 1.6, 3], [0, 1.0, -6]);
check('射线判定：矮墙挡住视线', blocked === true);
const hpBefore = (await G.snap()).enemies.find((e) => e.id === behind).hp;
await G.fire();
await G.step(3);
await G.release();
await G.step(2);
const wallShot = await G.snap();
const hpAfter = wallShot.enemies.find((e) => e.id === behind)?.hp;
check('墙后的敌人打不到', hpAfter === hpBefore, `hp ${hpBefore} → ${hpAfter}`);
check('子弹在墙上留下墨点', wallShot.decals > 0, `${wallShot.decals} 个`);

// ============================================================ 10. 霰弹枪
await G.clear();
await G.teleport(0, 0, 13);
await G.spawn(0, 10);
await G.aimAt(0, 1.0, 10);
await G.select(1);
await G.step(25);
let sg = await G.snap();
check('按 2 切到霰弹枪', sg.weapon.id === 'shotgun', sg.weapon.name);
check('霰弹枪弹匣 6 发', sg.weapon.mag === 6, `${sg.weapon.mag}`);
await G.fire();
await G.step(3);
await G.release();
await G.step(4);
let sgAfter = await G.snap();
check('霰弹枪开火消耗 1 发', sgAfter.weapon.mag === 5, `${sgAfter.weapon.mag}`);
check('近距离霰弹能一击打死火柴人', sgAfter.kills >= 1, `kills ${sgAfter.kills}`);

// ============================================================ 11. 武士刀
await G.clear();
await G.teleport(0, 0, 12.4);
await G.spawn(0, 10);
await G.aimAt(0, 1.0, 10);
await G.select(2);
await G.step(25);
let katana = await G.snap();
check('按 3 切到武士刀', katana.weapon.id === 'katana', katana.weapon.name);
check('武士刀不消耗弹药（显示 ∞）', katana.weapon.mag === 0 && katana.weapon.reserve === 0);
await G.fire();
await G.step(4);
await G.release();
await G.step(4);
let katanaHit = await G.snap();
check('武士刀挥砍命中并击杀（62 伤害）', katanaHit.kills >= 1, `kills ${katanaHit.kills}`);
check('武士刀攻击后仍有墨迹特效', katanaHit.particles > 0 || katanaHit.decals > 0);
await G.shot('04-katana.png');

// ============================================================ 12. 换弹
await G.clear();
await G.select(0);
await G.step(25);
await G.refill();
await G.teleport(0, 0, 24);
await G.aimAt(0, 1.6, 0);
await G.fire();
await G.step(4);
await G.release();
await G.step(1);
let lowMag = await G.snap();
check('射击后弹匣减少', lowMag.weapon.mag === 29, `${lowMag.weapon.mag}`);
await G.reload();
await G.step(20);
let reloading = await G.snap();
check('R 换弹进入换弹状态', reloading.weapon.reloading === true);
await G.step(110);
let reloaded = await G.snap();
check('换弹完成补满弹匣', reloaded.weapon.mag === 30, `${reloaded.weapon.mag}`);
check('换弹扣除备弹', reloaded.weapon.reserve === 149, `${reloaded.weapon.reserve}`);

// 弹匣打空后再扣扳机会自动换弹
await G.setAmmo(0, 1, 60);
await G.step(2);
await G.fire();
await G.step(4);
await G.release();
await G.step(2);
let empty = await G.snap();
check('最后一发打空', empty.weapon.mag === 0, `mag ${empty.weapon.mag}`);
await G.fire();
await G.step(4);
await G.release();
let autoReload = await G.snap();
check('打空后自动开始换弹', autoReload.weapon.reloading === true, `reloading ${autoReload.weapon.reloading}`);
await G.step(110);
check('自动换弹完成', (await G.snap()).weapon.mag === 30);

// ============================================================ 13. 敌人会追击和攻击
await G.clear();
await G.select(0);
await G.step(20);
await G.teleport(0, 0, 0);
const chaser = await G.spawn(-14, 0);
await G.step(1);
const c0 = (await G.snap()).enemies.find((e) => e.id === chaser) || (await G.snap()).enemies[0];
const d0 = Math.hypot(c0.x - 0, c0.z - 0);
await G.step(150); // 2.5s
let chased = await G.snap();
const ch = chased.enemies.find((e) => e.id === chaser) || chased.enemies[0];
const d1 = ch ? Math.hypot(ch.x - chased.player.x, ch.z - chased.player.z) : 999;
check('敌人会朝玩家追击', d1 < d0 - 2, `距离 ${d0.toFixed(1)} → ${d1.toFixed(1)}`);
await G.step(240); // 再等 4s，让它打到玩家
let hurt = await G.snap();
check('敌人能攻击并扣血', hurt.player.hp < 100, `hp ${hurt.player.hp}`);
await G.shot('05-enemies.png');

// 敌人能爬楼梯追到高台
await G.clear();
await G.teleport(6, 3.0, 8);
await G.spawn(-5, 8);
await G.step(420);
const climb = await G.snap();
const climber = climb.enemies[0];
check(
  '敌人会爬楼梯追到高台',
  !!climber && climber.y > 1.5,
  climber ? `敌人 y=${climber.y.toFixed(2)}，距离 ${Math.hypot(climber.x - climb.player.x, climber.z - climb.player.z).toFixed(1)}` : '敌人消失了',
);

// ============================================================ 14. 死亡与重开
await G.killPlayer();
await G.step(5);
let dead = await G.snap();
check('血量归零后进入死亡状态', dead.state === 'dead', dead.state);
check('死亡后显示结算遮罩', await page.isVisible('#overlay'));
check('死亡后 HUD 收起', (await G.cls('#hud')).includes('hidden'));
const deadTitle = await G.text('#overlay-title');
check('结算标题正确', deadTitle.includes('红笔'), deadTitle);
const deadStats = await G.text('.death-stats');
check('结算显示击杀 / 存活 / 命中率', /击杀/.test(deadStats) && /存活/.test(deadStats) && /命中率/.test(deadStats));
await G.shot('06-death.png');

await G.restart();
await G.step(3);
let restarted = await G.snap();
check('重开后回到游戏状态', restarted.state === 'playing', restarted.state);
check('重开后血量满', restarted.player.hp === 100, `${restarted.player.hp}`);
check('重开后击杀数清零', restarted.kills === 0, `${restarted.kills}`);
check('重开后重新刷怪', restarted.enemies.length === 3, `${restarted.enemies.length}`);
check('重开后弹药重置', restarted.weapon.mag === 30 && restarted.weapon.reserve === 150, `${restarted.weapon.mag}/${restarted.weapon.reserve}`);
check('重开后位置回到出生点', near(restarted.player.z, 20, 0.6), `z ${restarted.player.z}`);

// 按 Enter 也能重开
await G.killPlayer();
await G.step(5);
check('再次死亡', (await G.snap()).state === 'dead');
await G.tap('Enter');
await G.step(3);
check('死亡后按 Enter 重开', (await G.snap()).state === 'playing');

// ============================================================ 15. HUD 文本
await G.teleport(0, 0, 20);
await G.step(2);
check('HUD 显示血量', (await G.text('#hp-num')).length > 0, await G.text('#hp-num'));
check('HUD 显示弹药', (await G.text('#ammo-mag')).length > 0, await G.text('#ammo-mag'));
check('HUD 显示击杀数', (await G.text('#kill-count')).length > 0, await G.text('#kill-count'));

// 长时间运行稳定性：跑 10 秒模拟
await G.clear();
for (let i = 0; i < 600; i++) {
  await page.evaluate(() => window.__GAME__.step(1 / 60, 1));
}
const longRun = await G.snap();
check('连续运行 600 帧无异常', longRun.state === 'playing' && pageErrors.length === 0);

// ============================================================ 16. 渲染开销
const perf = await page.evaluate(() => window.__GAME__.perf());
check('渲染批次在合理范围', perf.drawCalls > 50 && perf.drawCalls < 800, `${perf.drawCalls} draw calls / ${perf.triangles} 三角形`);
check('线条呼吸对象数量合理', perf.boilTargets > 50 && perf.boilTargets < 500, `${perf.boilTargets} 条描边`);
check('favicon 能加载', (await page.request.get(BASE + 'favicon.svg')).ok());

// ============================================================ 17. 页面错误
check('全程无未捕获异常', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
check('无 console.error', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

// ------------------------------------------------------------ 汇总
console.log(`\n\x1b[1m结果\x1b[0m  ${results.length - failures}/${results.length} 通过`);
if (failures > 0) {
  console.log('\x1b[31m失败项：\x1b[0m');
  for (const r of results.filter((x) => !x.ok)) console.log(`  - ${r.name} ${r.detail}`);
}

await browser.close();
if (server) server.kill();
process.exit(failures > 0 ? 1 : 0);
