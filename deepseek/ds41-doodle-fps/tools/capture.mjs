/**
 * 截图工具：把游戏里几个代表性画面抓成 PNG，放到 shots/。
 * 用法：先 `npm run dev`，再 `node tools/capture.mjs`
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SH = path.join(ROOT, 'shots');
mkdirSync(SH, { recursive: true });

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const g = execSync('npm root -g').toString().trim();
  ({ chromium } = require(path.join(g, 'playwright')));
}

const PORT = Number(process.env.PORT || 5185);
const browser = await chromium.launch({
  headless: !process.env.HEADED,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e));
await page.goto(`http://127.0.0.1:${PORT}/`);
await page.waitForFunction('window.__READY__ === true');

const ev = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: path.join(SH, n) });
const step = (n) => ev(([n]) => window.__GAME__.step(1 / 60, n), [n]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await ev(() => window.__GAME__.start());
await step(2);
await wait(700); // 等开始遮罩淡出

// 1. 出生点望向场地中央
await ev(() => {
  const g = window.__GAME__;
  g.clearEnemies();
  g.teleport(0, 0, 22);
  g.aimAt(0, 1.6, 0);
  g.spawnEnemy(-6, -2);
  g.spawnEnemy(4, -6);
  g.spawnEnemy(-14, 4);
});
await step(40);
await wait(400);
await shot('10-spawn.png');

// 2. 站在高台上俯瞰（楼梯 / 集装箱 / 木箱）
await ev(() => {
  const g = window.__GAME__;
  g.clearEnemies();
  g.teleport(11, 3.0, 9);
  g.aimAt(-12, 1.0, -8);
});
await step(20);
await wait(150);
await shot('11-platform.png');

// 3. 步枪开火瞬间（冻结枪口火光 + 弹道线）—— 空地上，背景干净
await ev(() => {
  const g = window.__GAME__;
  g.clearEnemies();
  g.teleport(-6, 0, 12);
  g.aimAt(-6, 1.1, 6);
  g.spawnEnemy(-6, 6);
  g.selectWeapon(0);
});
await step(30);
await ev(() => window.__GAME__.setAutoUpdate(false));
await ev(() => {
  const g = window.__GAME__;
  g.aimAt(-6, 1.1, 6);
  g.fire();
});
await step(2);
await ev(() => window.__GAME__.render());
await shot('12-rifle-fire.png');
await ev(() => window.__GAME__.release());
await step(30);
await ev(() => window.__GAME__.render());
await shot('13-ink-hit.png');

// 4. 霰弹枪
await ev(() => {
  const g = window.__GAME__;
  g.clearEnemies();
  g.teleport(-6, 0, 9.4);
  g.aimAt(-6, 1.1, 6);
  g.spawnEnemy(-6, 6);
  g.selectWeapon(1);
});
await step(30);
await ev(() => {
  const g = window.__GAME__;
  g.aimAt(-6, 1.1, 6);
  g.fire();
});
await step(2);
await ev(() => window.__GAME__.render());
await shot('14-shotgun.png');
await ev(() => window.__GAME__.release());

// 5. 武士刀挥砍
await ev(() => {
  const g = window.__GAME__;
  g.clearEnemies();
  g.teleport(-6, 0, 8.6);
  g.aimAt(-6, 1.1, 6);
  g.spawnEnemy(-6, 6);
  g.selectWeapon(2);
});
await step(30);
await ev(() => {
  const g = window.__GAME__;
  g.aimAt(-6, 1.1, 6);
  g.fire();
});
await step(3);
await ev(() => window.__GAME__.render());
await shot('15-katana-slash.png');
await ev(() => window.__GAME__.release());

// 6. 被围攻 + 受伤晕染
await ev(() => {
  const g = window.__GAME__;
  g.selectWeapon(0);
  g.clearEnemies();
  g.teleport(-6, 0, 4);
  g.aimAt(-6, 1.0, -6);
  g.spawnEnemy(-6, -6);
  g.spawnEnemy(-2, -8);
  g.spawnEnemy(-10, -7);
});
await step(60);
await ev(() => window.__GAME__.damage(28));
await step(2);
await ev(() => window.__GAME__.render());
await shot('16-hurt.png');

// 7. 死亡结算
await ev(() => window.__GAME__.killPlayer());
await step(30);
await ev(() => window.__GAME__.render());
await wait(700); // 等结算卡片淡入
await shot('17-death.png');

await browser.close();
console.log('截图完成 →', SH);
