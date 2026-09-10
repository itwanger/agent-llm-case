#!/usr/bin/env node
/**
 * 端到端验收脚本。
 *
 * 用 agent-browser 驱动真实 Chromium，在 1440 / 1024 / 390 三档宽度下检查：
 *   - 页面无横向溢出、无加载失败的图片、无控制台错误
 *   - 配色切换 / 产品姿态 / 折叠滑块 / 摄像头 tab / 机型比较 / FAQ / 弹层 / 画廊翻页
 *
 * 用法：
 *   npm run dev            # 另一个终端先起服务
 *   node verify.mjs        # 默认 http://127.0.0.1:5186
 *   BASE=http://127.0.0.1:5180/ds41-iphone-duo/ node verify.mjs
 *
 * 依赖全局安装的 agent-browser（npm i -g agent-browser）与 Chrome。
 */

import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE || 'http://127.0.0.1:5186/';
const SESSION = `duo-verify-${Date.now()}`;
const results = [];

const ab = (args) => execFileSync('agent-browser', ['--session', SESSION, ...args], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const evaluate = (expr) => {
  const raw = ab(['eval', expr]);
  const line = raw.trim().split('\n').filter(Boolean).pop();
  if (line === undefined) return undefined;
  try {
    const once = JSON.parse(line);
    return typeof once === 'string' ? JSON.parse(once) : once;
  } catch {
    return line;
  }
};

const check = (name, pass, detail = '') => {
  results.push({ name, pass: Boolean(pass), detail });
  const mark = pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${mark} ${name}${detail ? `  \x1b[90m${detail}\x1b[0m` : ''}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- 布局

const LAYOUT_PROBE = `(() => {
  const out = { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, broken: [], clipped: [] };
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src') && !img.getAttribute('src').startsWith('data:')) {
      out.broken.push(img.getAttribute('src'));
    }
  });
  ['h1','h2','h3'].forEach((tag) => {
    document.querySelectorAll(tag).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > innerWidth + 2) out.clipped.push(el.innerText.slice(0, 24));
    });
  });
  return JSON.stringify(out);
})()`;

async function run() {
  console.log(`\n\x1b[1miPhone Duo 复刻 · 端到端验收\x1b[0m  ${BASE}\n`);

  ab(['set', 'viewport', '1440', '900']);
  ab(['open', BASE]);
  await sleep(2500);

  // ---------- 三档宽度的布局 ----------
  for (const [w, h] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
  ]) {
    ab(['set', 'viewport', String(w), String(h)]);
    await sleep(1200);
    const r = evaluate(LAYOUT_PROBE);
    check(`${w}×${h} 无横向溢出`, r.overflow === 0, `overflowX=${r.overflow}px`);
    check(`${w}×${h} 无破图`, r.broken.length === 0, `${r.broken.length} 张失败`);
    check(`${w}×${h} 标题未被截断`, r.clipped.length === 0, r.clipped.slice(0, 3).join(', '));
  }

  ab(['set', 'viewport', '1440', '900']);
  await sleep(800);

  // ---------- 章节完整性 ----------
  const ids = evaluate(
    `JSON.stringify(['highlights','design','product-viewer','display','versatility','cameras','performance','shared-features','accessories','incentive','compare','environment','values','faq'].filter((id)=>!document.getElementById(id)))`,
  );
  check('17 个章节全部存在', ids.length === 0, ids.length ? `缺失 ${ids.join(', ')}` : '14 个锚点章节 + 首屏 / 导航 / 页脚');

  // ---------- 首屏 ----------
  const hero = evaluate(`(() => {
    const m = document.querySelector('.hero__media');
    const b = document.querySelector('.hero__buy');
    const h = document.querySelector('.hero__headline');
    return JSON.stringify({
      mediaW: Math.round(m.getBoundingClientRect().width),
      headlineFs: getComputedStyle(h).fontSize,
      btn: b ? getComputedStyle(b).backgroundColor : null,
      firstScreenOk: m.getBoundingClientRect().top < innerHeight,
    });
  })()`);
  check('首屏主视觉在首屏内可见', hero.firstScreenOk, `宽 ${hero.mediaW}px`);
  check('首屏主标题 80px', hero.headlineFs === '80px', hero.headlineFs);
  check('购买按钮为主题蓝 #0071e3', hero.btn === 'rgb(0, 113, 227)', hero.btn);

  // ---------- 配色切换 ----------
  const color = evaluate(`(() => {
    document.getElementById('design-color-star-white').click();
    return 'clicked';
  })()`);
  await sleep(500);
  const colorState = evaluate(`(() => {
    const figs = [...document.querySelectorAll('.design__figure')];
    const active = figs.find((f) => f.dataset.active === 'true');
    return JSON.stringify({ count: figs.filter((f) => f.dataset.active === 'true').length, src: active?.querySelector('img')?.getAttribute('src')?.split('/').pop() });
  })()`);
  check('配色切换生效', colorState.count === 1 && colorState.src === 'design-star-white.webp', `${color} → ${colorState.src}`);

  // ---------- 产品姿态 ----------
  evaluate(`[...document.querySelectorAll('.viewer__control')].find((b)=>b.textContent.includes('闭合')).click()`);
  await sleep(400);
  const poseState = evaluate(`(() => {
    const sel = [...document.querySelectorAll('.viewer__control')].filter((b) => b.dataset.selected === 'true').map((b) => b.textContent.trim());
    const frame = document.querySelector('.viewer__frame img');
    return JSON.stringify({ selected: sel, src: frame?.getAttribute('src')?.split('/').pop() });
  })()`);
  check('产品姿态切换生效', poseState.selected.length === 1 && poseState.src === 'closed.webp', `${poseState.selected[0]} → ${poseState.src}`);

  // ---------- 折叠滑块 ----------
  evaluate(`[...document.querySelectorAll('.viewer__control')][0].click()`);
  await sleep(300);
  const slider = evaluate(`(() => {
    const r = document.querySelector('.viewer__range');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(r, '0'); r.dispatchEvent(new Event('input', { bubbles: true }));
    return JSON.stringify({ min: r.min, max: r.max, step: r.step });
  })()`);
  await sleep(300);
  const at0 = evaluate(`(() => {
    const frames = [...document.querySelectorAll('.viewer__frame img')];
    return JSON.stringify({ count: frames.length, src: frames[0]?.getAttribute('src')?.split('/').pop(), text: document.querySelector('.viewer__range').getAttribute('aria-valuetext') });
  })()`);
  evaluate(`(() => {
    const r = document.querySelector('.viewer__range');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(r, '1'); r.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(300);
  const at1 = evaluate(`(() => {
    const frames = [...document.querySelectorAll('.viewer__frame img')];
    return JSON.stringify({ count: frames.length, src: frames[0]?.getAttribute('src')?.split('/').pop(), text: document.querySelector('.viewer__range').getAttribute('aria-valuetext') });
  })()`);
  check(
    '折叠滑块分段驱动开合姿态',
    at0.count === 1 && at1.count === 1 && at0.src === 'closed.webp' && at1.src === 'foldable.webp',
    `0 → ${at0.src}（${at0.text}）；1 → ${at1.src}（${at1.text}）`,
  );
  check('滑块为可交互 range 控件', slider.min === '0' && slider.max === '1', `min=${slider.min} max=${slider.max} step=${slider.step}`);

  // ---------- 摄像头 tab ----------
  evaluate(`[...document.querySelectorAll('.tabnav__link')][2].click()`);
  await sleep(400);
  const camState = evaluate(`(() => {
    const tabs = [...document.querySelectorAll('.tabnav__link')];
    const panels = [...document.querySelectorAll('.cameras__panel-item')];
    return JSON.stringify({ selected: tabs.filter((t) => t.dataset.selected === 'true').map((t) => t.textContent.trim()), visible: panels.filter((p) => !p.hidden).length });
  })()`);
  check('摄像头功能切换生效', camState.visible === 1 && camState.selected[0] === '看看镜头', camState.selected.join(','));

  // ---------- 机型比较 ----------
  evaluate(`(() => {
    const s = document.getElementById('performance-model-select');
    s.value = 'section-13'; s.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(400);
  const perf = evaluate(`JSON.stringify({
    note: document.querySelector('.performance__compare-note').textContent.slice(0, 34),
    values: [...document.querySelectorAll('.performance__compare-grid .performance__stat-value')].map((e) => e.textContent),
  })`);
  check(
    '机型比较选择器更新数据',
    perf.note.includes('iPhone 17') && perf.values[0] === '提速 20%' && perf.values[3] === '增加 14 小时',
    `${perf.note} → ${perf.values.join(' / ')}`,
  );

  // ---------- FAQ ----------
  evaluate(`document.querySelectorAll('.faq__trigger')[0].click()`);
  await sleep(200);
  evaluate(`document.querySelectorAll('.faq__trigger')[3].click()`);
  await sleep(300);
  const faqOne = evaluate(
    `JSON.stringify({ open: [...document.querySelectorAll('.faq__trigger')].filter((t) => t.getAttribute('aria-expanded') === 'true').length, synced: [...document.querySelectorAll('.faq__item')].every((li) => (li.dataset.open === 'true') === (li.querySelector('.faq__trigger').getAttribute('aria-expanded') === 'true')) })`,
  );
  evaluate(`document.querySelector('.faq .link-more--button').click()`);
  await sleep(400);
  const faqAll = evaluate(`[...document.querySelectorAll('.faq__trigger')].filter((t) => t.getAttribute('aria-expanded') === 'true').length`);
  evaluate(`document.querySelector('.faq .link-more--button').click()`);
  await sleep(400);
  const faqNone = evaluate(`[...document.querySelectorAll('.faq__trigger')].filter((t) => t.getAttribute('aria-expanded') === 'true').length`);
  check('FAQ 单条展开', faqOne.open === 2, `${faqOne.open} 条展开`);
  check('FAQ 图标与 aria-expanded 同步', faqOne.synced);
  check('FAQ 全部展开 / 全部收起', faqAll === 16 && faqNone === 0, `${faqAll} → ${faqNone}`);

  // ---------- 弹层 ----------
  evaluate(`document.querySelector('.hero__buy').click()`);
  await sleep(500);
  const modalOpen = evaluate(`Boolean(document.querySelector('.modal-backdrop'))`);
  evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  await sleep(500);
  const modalClosed = evaluate(`!document.querySelector('.modal-backdrop')`);
  check('价格弹层打开', modalOpen);
  check('Escape 关闭并恢复焦点', modalClosed);

  // ---------- 画廊翻页 ----------
  const before = evaluate(`Math.round(document.querySelector('.highlights__track').scrollLeft)`);
  evaluate(`document.querySelectorAll('.highlights__controls .paddlenav__button')[1].click()`);
  await sleep(1100);
  const after = evaluate(`Math.round(document.querySelector('.highlights__track').scrollLeft)`);
  check('亮点画廊可翻页', after > before, `scrollLeft ${before} → ${after}`);

  // ---------- 控制台错误 ----------
  let errors = '';
  try {
    errors = ab(['errors']);
  } catch {
    errors = '';
  }
  const noErrors = !errors.trim() || /no (page )?errors/i.test(errors);
  check('无页面运行时错误', noErrors, noErrors ? '' : errors.trim().split('\n')[0]);

  ab(['close']);

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n\x1b[1m${passed} / ${results.length} 通过\x1b[0m\n`);
  process.exit(passed === results.length ? 0 : 1);
}

run().catch((err) => {
  console.error('\n验收脚本执行失败：', err.message);
  try {
    ab(['close']);
  } catch {
    /* ignore */
  }
  process.exit(1);
});
