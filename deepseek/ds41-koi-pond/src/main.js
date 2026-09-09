/* ------------------------------------------------------------------ *
 *  main.js — 场景装配 / 交互 / 渲染循环
 * ------------------------------------------------------------------ */

import { createPond } from './pond.js';
import { Water, makeCausticTile } from './water.js';
import { Koi } from './koi.js';
import { FoodField } from './food.js';
import { TAU, clamp, lerp, mulberry32, insideRoundRect, rand } from './util.js';

/* ---------------------------------------------------------------- 画布 */
const canvas = document.getElementById('pond');
const ctx = canvas.getContext('2d', { alpha: false });
const scene = document.createElement('canvas');
const sctx = scene.getContext('2d', { alpha: false });

const S = {
  W: 0, H: 0, S: 0,
  rs: 1, dpr: 1, quality: 1,
  time: 0, paused: false,
  fps: 60, frames: 0, fpsT: 0, slowT: 0, fastT: 0,
  down: false, dragging: false,
  adapt: true,
  flags: { warp: true, caustics: true, plants: true, fish: true, lighting: true },
};

const QUALITY_SCALE = [1, 1, 0.82, 0.68];
const QUALITY_TILE = [48, 48, 58, 72];

let pond = null;
let water = null;
let koi = [];
let food = null;
let rng = mulberry32(99173);
let ripples = [];
let motes = [];
let causticTile = null;
const patternCache = new Map();

function getCausticPattern(g) {
  let p = patternCache.get(g);
  if (!p) { p = g.createPattern(causticTile, 'repeat'); patternCache.set(g, p); }
  return p;
}

/* ------------------------------------------------------------ 世界接口 */
const world = {
  W: 0, H: 0, S: 0, bounds: { pad: 40, radius: 60 },
  koi: [],
  food: [],
  eat(pellet, fish) {
    if (pellet.dead) return;
    pellet.dead = true;
    food.eaten++;
    const gx = (pellet.x / S.W) * water.gw;
    const gy = (pellet.y / S.H) * water.gh;
    water.splash(gx, gy, 2.0, 0.10);
    ripples.push({
      x: pellet.x, y: pellet.y,
      r0: S.S * 0.004, r1: S.S * 0.030,
      age: 0, life: 0.85, a: 0.34,
    });
    fish.noFoodT = 0;
  },
};

/* --------------------------------------------------------------- 尺寸 */
function targetScale(W, H) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const maxPx = 2.45e6;
  const fit = Math.sqrt(maxPx / Math.max(1, W * H));
  return clamp(Math.min(dpr, fit), 0.5, 2);
}

function applySize(W, H, rebuild) {
  const oldW = S.W || W, oldH = S.H || H;
  S.W = W; S.H = H;
  S.S = Math.min(W, H);
  S.dpr = targetScale(W, H);
  S.rs = S.dpr * QUALITY_SCALE[S.quality];

  const dw = Math.max(2, Math.round(W * S.rs));
  const dh = Math.max(2, Math.round(H * S.rs));
  if (canvas.width !== dw || canvas.height !== dh) {
    canvas.width = dw;
    canvas.height = dh;
    scene.width = dw;
    scene.height = dh;
    patternCache.clear();
    tintCanvas = null;
  }
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  world.W = W; world.H = H; world.S = S.S;

  // 鱼的位置按比例迁移
  const kx = W / oldW, ky = H / oldH;
  for (const k of koi) {
    k.x *= kx; k.y *= ky;
    k.len = k.sizeFrac * S.S;
  }

  if (water) {
    const gw = 224;
    const gh = clamp(Math.round(gw * (H / W)), 64, 220);
    water.resize(gw, gh);
  }
  if (rebuild) rebuildPond();
  buildTintOverlay();
}

function rebuildPond() {
  pond = createPond({ w: S.W, h: S.H, rs: S.rs, seed: 20240918 });
  world.bounds.pad = pond.bounds.pad;
  world.bounds.radius = pond.bounds.radius;
  // 微粒
  motes = [];
  const mr = mulberry32(4242);
  const n = clamp(Math.round((S.W * S.H) / 26000), 24, 90);
  for (let i = 0; i < n; i++) {
    motes.push({
      x: rand(mr, 0, S.W), y: rand(mr, 0, S.H),
      r: rand(mr, 0.6, 2.1),
      a: rand(mr, 0.06, 0.2),
      vx: rand(mr, -3, 3), vy: rand(mr, -2, 2),
      ph: rand(mr, 0, TAU),
    });
  }
}

/* ---------------------------------------------------------------- 初始化 */
function init() {
  const W = window.innerWidth, H = window.innerHeight;
  S.W = W; S.H = H; S.S = Math.min(W, H);
  S.dpr = targetScale(W, H);
  S.rs = S.dpr * QUALITY_SCALE[S.quality];
  canvas.width = Math.round(W * S.rs);
  canvas.height = Math.round(H * S.rs);
  scene.width = canvas.width;
  scene.height = canvas.height;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  world.W = W; world.H = H; world.S = S.S;

  rebuildPond();

  const gw = 224;
  const gh = clamp(Math.round(gw * (H / W)), 64, 220);
  water = new Water({ gw, gh });
  causticTile = makeCausticTile(256, 5);

  food = new FoodField(mulberry32(777));
  world.food = food.pellets;
  reset(true);

  bindInput();
  bindUI();
  requestAnimationFrame(frame);
}

function reset(initial) {
  rng = mulberry32(99173);
  koi = [];
  for (let i = 0; i < 11; i++) {
    koi.push(new Koi({ rng: mulberry32(4400 + i * 131), world, index: i }));
  }
  world.koi = koi;
  food.reset();
  water.reset();
  ripples = [];
  S.time = 0;
  S.paused = false;
  updatePauseUI();
  if (!initial) {
    toast('已重置');
    water.splash(water.gw * 0.5, water.gh * 0.5, 6, 0.10);
  }
  hideIdleSoon();
}

/* ---------------------------------------------------------------- 输入 */
let ptr = { x: 0, y: 0, px: 0, py: 0, t0: 0, lastT: 0, moved: 0, vx: 0, vy: 0 };

function bindInput() {
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    const x = e.clientX, y = e.clientY;
    S.down = true; S.dragging = false;
    ptr.x = ptr.px = x; ptr.y = ptr.py = y;
    ptr.t0 = ptr.lastT = performance.now();
    ptr.moved = 0; ptr.lastRing = 0; ptr.vx = 0; ptr.vy = 0;
    canvas.classList.add('grabbing');
    hideIdleSoon();
    if (!S.paused) {
      water.splash((x / S.W) * water.gw, (y / S.H) * water.gh, 2.4, 0.05);
      ripples.push({ x, y, r0: S.S * 0.005, r1: S.S * 0.12, age: 0, life: 1.5, a: 0.4 });
    }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    const x = e.clientX, y = e.clientY;
    if (!S.down) { wakeIdle(); return; }
    const now = performance.now();
    const dt = Math.max(6, now - ptr.lastT) / 1000;
    const dx = x - ptr.px, dy = y - ptr.py;
    ptr.moved += Math.hypot(dx, dy);
    ptr.lastT = now;
    if (S.paused) { ptr.px = x; ptr.py = y; return; }

    if (ptr.moved > 7) S.dragging = true;
    const spd = Math.hypot(dx, dy) / dt;
    const amp = clamp(spd / (S.S * 2.6), 0.04, 0.38) * (S.dragging ? 1 : 0.5);
    water.stir(
      (x / S.W) * water.gw,
      (y / S.H) * water.gh,
      (dx / S.W) * water.gw * 1.1,
      (dy / S.H) * water.gh * 1.1,
      amp
    );
    if (S.dragging && ptr.moved - ptr.lastRing > S.S * 0.045) {
      ptr.lastRing = ptr.moved;
      ripples.push({
        x, y,
        r0: S.S * 0.006, r1: S.S * 0.095,
        age: 0, life: 1.3, a: 0.44,
      });
    }
    ptr.px = x; ptr.py = y;
    wakeIdle();
  });

  const end = (e) => {
    if (!S.down) return;
    S.down = false;
    canvas.classList.remove('grabbing');
    const dt = performance.now() - ptr.t0;
    if (!S.paused && !S.dragging && ptr.moved < 9 && dt < 420) {
      feed(e.clientX, e.clientY);
    }
    hideIdleSoon();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', () => {
    S.down = false; canvas.classList.remove('grabbing');
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); togglePause(); }
    else if (k === 'r') reset(false);
    else if (k === 'f') toggleFullscreen();
    else if (k === 'd') {
      const hud = document.getElementById('hud');
      hud.hidden = !hud.hidden;
    }
  });

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    const W = window.innerWidth, H = window.innerHeight;
    applySize(W, H, false);
    rt = setTimeout(() => applySize(W, H, true), 180);
  });
}

function feed(x, y) {
  const b = pond.bounds;
  const pad = b.pad + S.S * 0.02;
  const cx = clamp(x, pad, S.W - pad);
  const cy = clamp(y, pad, S.H - pad);

  const n = food.feed(cx, cy, S.S);
  water.splash((cx / S.W) * water.gw, (cy / S.H) * water.gh, 3.2, 0.30);
  ripples.push({ x: cx, y: cy, r0: S.S * 0.010, r1: S.S * 0.155, age: 0, life: 1.5, a: 0.5 });
  ripples.push({ x: cx, y: cy, r0: S.S * 0.018, r1: S.S * 0.255, age: 0.10, life: 1.9, a: 0.28 });
  ripples.push({ x: cx, y: cy, r0: S.S * 0.004, r1: S.S * 0.060, age: 0, life: 0.75, a: 0.42 });
  toast(n > 5 ? '投食 · 鱼群聚拢' : '投食');
  wakeIdle();
}

/* ------------------------------------------------------------------ UI */
const elToast = document.getElementById('toast');
const elHint = document.getElementById('hint');
const elUi = document.getElementById('ui');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const btnFull = document.getElementById('btnFull');
const elHud = document.getElementById('hud');
let toastTimer = 0;
let idleTimer = 0;

function toast(msg) {
  elToast.textContent = msg;
  elToast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove('show'), 1500);
}

function wakeIdle() {
  elUi.classList.remove('idle');
  hideIdleSoon();
}
function hideIdleSoon() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!S.paused) elUi.classList.add('idle');
  }, 6500);
}

function updatePauseUI() {
  const ico = btnPause.querySelector('.ico');
  const lbl = btnPause.querySelector('.lbl');
  ico.setAttribute('data-ico', S.paused ? 'play' : 'pause');
  lbl.textContent = S.paused ? '继续' : '暂停';
  btnPause.setAttribute('aria-pressed', String(S.paused));
  canvas.classList.toggle('paused', S.paused);
}

function togglePause() {
  S.paused = !S.paused;
  updatePauseUI();
  toast(S.paused ? '已暂停' : '继续');
  wakeIdle();
}

function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement) {
      const p = (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
      if (p && p.catch) p.catch(() => {});
    } else {
      const p = (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
      if (p && p.catch) p.catch(() => {});
    }
  } catch { /* 不支持全屏时忽略 */ }
}

function bindUI() {
  btnPause.addEventListener('click', togglePause);
  btnReset.addEventListener('click', () => reset(false));
  btnFull.addEventListener('click', toggleFullscreen);
  hideIdleSoon();
}

/* ---------------------------------------------------------------- 渲染 */
let tintCanvas = null;

/** 水色 / 阳光 / 暗角是静态的，预渲染成一张叠加层，每帧只 blit 一次 */
function buildTintOverlay() {
  const W = S.W, H = S.H;
  const cv = document.createElement('canvas');
  cv.width = Math.max(2, Math.round(W * S.rs));
  cv.height = Math.max(2, Math.round(H * S.rs));
  const g = cv.getContext('2d');
  g.setTransform(S.rs, 0, 0, S.rs, 0, 0);

  const lin = g.createLinearGradient(0, 0, W * 0.4, H);
  lin.addColorStop(0, 'rgba(58,138,140,0.19)');
  lin.addColorStop(0.45, 'rgba(38,104,116,0.20)');
  lin.addColorStop(1, 'rgba(22,74,92,0.27)');
  g.fillStyle = lin;
  g.fillRect(0, 0, W, H);

  const sun = g.createLinearGradient(0, 0, W * 0.55, H * 0.95);
  sun.addColorStop(0, 'rgba(240,252,246,0.15)');
  sun.addColorStop(0.5, 'rgba(240,252,246,0.04)');
  sun.addColorStop(1, 'rgba(236,250,244,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);

  const v = g.createRadialGradient(
    W * 0.5, H * 0.48, Math.min(W, H) * 0.32,
    W * 0.5, H * 0.48, Math.max(W, H) * 0.76
  );
  v.addColorStop(0, 'rgba(4,14,18,0)');
  v.addColorStop(0.62, 'rgba(4,14,18,0.09)');
  v.addColorStop(1, 'rgba(3,10,14,0.40)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  tintCanvas = cv;
}

function drawWaterTint(g, W, H) {
  if (!tintCanvas) buildTintOverlay();
  g.drawImage(tintCanvas, 0, 0, W, H);
}

function drawCaustics(g, W, H) {
  const causticPattern = getCausticPattern(g);
  if (!causticPattern) return;
  const t = S.time;
  const base = Math.max(W, H) / 1600;
  const layers = S.quality <= 1
    ? [
      { k: base * 1.15, a: 0.23, sx: 0.017, sy: 0.010, rot: 0.0 },
      { k: base * 1.95, a: 0.17, sx: -0.012, sy: 0.009, rot: 0.42 },
    ]
    : [
      { k: base * 1.35, a: 0.21, sx: 0.017, sy: 0.010, rot: 0.0 },
      { k: base * 2.30, a: 0.15, sx: -0.012, sy: 0.009, rot: 0.42 },
    ];
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const L of layers) {
    const tilePx = 256 * L.k;
    const ox = ((t * L.sx + water.meanGx * 26) * base * 900) % tilePx;
    const oy = ((t * L.sy + water.meanGy * 26) * base * 900) % tilePx;
    const ax = L.k * (L.ax || 1);
    const ay = L.k * (L.ay || 1);
    g.save();
    g.translate(W * 0.5 + ox, H * 0.5 + oy);
    if (L.rot) g.rotate(L.rot + Math.sin(t * 0.05) * 0.03);
    g.scale(ax, ay);
    g.globalAlpha = L.a * (0.80 + 0.20 * Math.sin(t * 0.55 + L.rot * 3));
    g.fillStyle = causticPattern;
    g.fillRect(-W / ax, -H / ay, (W * 2) / ax, (H * 2) / ay);
    g.restore();
  }
  g.restore();
}

function drawSurfaceSheen(g, W, H) {
  const causticPattern = getCausticPattern(g);
  const t = S.time;
  const base = Math.max(W, H) / 1600;
  g.save();
  g.globalCompositeOperation = 'lighter';

  // 天光：越靠上越亮，暗示水面朝向光源
  const sky = g.createLinearGradient(0, 0, W * 0.18, H);
  sky.addColorStop(0, 'rgba(224,246,250,0.115)');
  sky.addColorStop(0.38, 'rgba(224,246,250,0.035)');
  sky.addColorStop(1, 'rgba(224,246,250,0)');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // 水面自身的反光薄膜（比池底焦散更慢、更拉伸）
  if (causticPattern) {
    const k = base * 2.4;
    const ax = k * 1.7, ay = k * 0.72;
    const ox = ((t * 0.009 + water.meanGx * 14) * base * 900) % (256 * k);
    const oy = ((t * -0.006 + water.meanGy * 14) * base * 900) % (256 * k);
    g.translate(W * 0.5 + ox, H * 0.5 + oy);
    g.rotate(0.2 + Math.sin(t * 0.028) * 0.025);
    g.scale(ax, ay);
    g.globalAlpha = 0.10 * (0.82 + 0.18 * Math.sin(t * 0.4));
    g.fillStyle = causticPattern;
    g.fillRect(-W / ax, -H / ay, (W * 2) / ax, (H * 2) / ay);
  }
  g.restore();
}

function drawRipples(g) {
  if (!ripples.length) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    const t = clamp(r.age / r.life, 0, 1);
    const ease = 1 - Math.pow(1 - t, 2.4);
    const rad = lerp(r.r0, r.r1, ease);
    const fade = (1 - t) * (1 - t);
    g.strokeStyle = `rgba(232,250,255,${fade * r.a})`;
    g.lineWidth = 1 + 2.6 * (1 - t);
    g.beginPath();
    g.arc(r.x, r.y, rad, 0, TAU);
    g.stroke();
    g.strokeStyle = `rgba(255,255,255,${fade * r.a * 0.45})`;
    g.lineWidth = 1 + 1.6 * (1 - t);
    g.beginPath();
    g.arc(r.x, r.y, rad * 0.72, 0, TAU);
    g.stroke();
  }
  g.restore();
}

function drawMotes(g) {
  if (!motes.length) return;
  g.save();
  for (const m of motes) {
    g.fillStyle = `rgba(226,244,238,${m.a})`;
    g.beginPath();
    g.arc(m.x, m.y, m.r, 0, TAU);
    g.fill();
  }
  g.restore();
}

function render() {
  const { W, H, S: sz, rs } = S;
  if (!pond) return;

  sctx.setTransform(rs, 0, 0, rs, 0, 0);
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = 1;
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(pond.floor, 0, 0, W, H);
  if (S.flags.plants) {
    pond.drawPlantShadows(sctx, S.time);
    pond.drawPlants(sctx, S.time);
    pond.drawPadShadows(sctx, S.time);
  }
  // 焦散画在鱼之下：光网落在池底与鱼身之后，避免覆盖鱼体
  if (S.flags.caustics) drawCaustics(sctx, W, H);
  sctx.globalCompositeOperation = 'source-over';
  sctx.globalAlpha = 1;
  if (S.flags.fish) {
    for (const k of koi) k.draw(sctx);
    drawMotes(sctx);
  }

  ctx.setTransform(rs, 0, 0, rs, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (S.flags.warp) water.warp(scene, ctx, W, H, QUALITY_TILE[S.quality]);
  else ctx.drawImage(scene, 0, 0, W, H);

  drawWaterTint(ctx, W, H);

  // 水面高光与波纹驱动的动态焦散（叠在最上层）
  ctx.globalCompositeOperation = 'lighter';
  if (S.flags.lighting) {
    ctx.globalAlpha = 0.62;
    ctx.drawImage(water.light, 0, 0, W, H);
  }
  ctx.globalAlpha = 1;
  drawRipples(ctx);
  ctx.globalCompositeOperation = 'source-over';

  drawSurfaceSheen(ctx, W, H);

  pond.drawPads(ctx, S.time);
  food.draw(ctx, sz, S.time);
}

/* ------------------------------------------------------------ 主循环 */
let last = performance.now();
let acc = 0;
const FIXED = 1 / 60;
const bootTime = performance.now();
let hudT = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.12) dt = 0.12;
  if (dt <= 0) dt = 1 / 60;

  // FPS 统计
  S.frames++;
  if (now - S.fpsT > 500) {
    const inst = (S.frames * 1000) / (now - S.fpsT);
    S.fps = S.fps * 0.4 + inst * 0.6;
    S.frames = 0;
    S.fpsT = now;
    adaptQuality();
  }

  if (!S.paused) {
    S.time += dt;
    // 水面：固定步长
    acc += dt;
    let steps = 0;
    while (acc >= FIXED && steps < 3) {
      water.ambient(FIXED, rng);
      water.step(FIXED);
      acc -= FIXED;
      steps++;
    }
    if (acc > FIXED * 4) acc = 0;

    food.update(dt, S.S);
    for (let i = 0; i < koi.length; i++) koi[i].update(dt, world);

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age += dt;
      if (ripples[i].age >= ripples[i].life) ripples.splice(i, 1);
    }

    for (const m of motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vx += Math.sin(S.time * 0.7 + m.ph) * dt * 0.6;
      m.vy += Math.cos(S.time * 0.6 + m.ph * 1.7) * dt * 0.6;
      m.vx *= 0.995; m.vy *= 0.995;
      if (m.x < 0) m.x += S.W; else if (m.x > S.W) m.x -= S.W;
      if (m.y < 0) m.y += S.H; else if (m.y > S.H) m.y -= S.H;
    }
  }

  if (!S.paused || !water.smooth) water.updateLighting();
  render();

  // HUD
  if (!elHud.hidden && now - hudT > 400) {
    hudT = now;
    document.getElementById('hudFps').textContent = S.fps.toFixed(0);
    document.getElementById('hudFish').textContent = koi.length;
    document.getElementById('hudFood').textContent = food.count;
    const counts = {};
    for (const k of koi) counts[k.state] = (counts[k.state] || 0) + 1;
    document.getElementById('hudStates').textContent =
      Object.entries(counts).map(([a, b]) => `${a}:${b}`).join(' ');
    document.getElementById('hudRes').textContent =
      `${canvas.width}×${canvas.height} rs=${S.rs.toFixed(2)} tile=${QUALITY_TILE[S.quality]}`;
  }
}

/** 自适应画质：帧率偏低时降分辨率与网格密度 */
function adaptQuality() {
  if (!S.adapt) return;
  // 启动后的预热期不做判断（首帧有编译 / 生成开销）
  if (performance.now() - bootTime < 2500) return;
  if (S.fps < 46) {
    S.slowT += 1; S.fastT = 0;
    if (S.slowT >= 3 && S.quality < 3) {
      S.quality++; S.slowT = 0;
      applySize(S.W, S.H, true);
    }
  } else if (S.fps > 57) {
    S.fastT += 1; S.slowT = 0;
    if (S.fastT >= 10 && S.quality > 0) {
      S.quality--; S.fastT = 0;
      applySize(S.W, S.H, true);
    }
  } else {
    S.slowT = Math.max(0, S.slowT - 1);
  }
}

/* --------------------------------------------------------- 调试接口 */
window.__koiPond = {
  get info() {
    const counts = {};
    for (const k of koi) counts[k.state] = (counts[k.state] || 0) + 1;
    return {
      koi: koi.length,
      food: food.count,
      fed: food.fed,
      eaten: food.eaten,
      states: counts,
      paused: S.paused,
      fps: +S.fps.toFixed(1),
      time: +S.time.toFixed(1),
      res: [canvas.width, canvas.height],
      rs: +S.rs.toFixed(2),
      quality: S.quality,
      ripples: ripples.length,
    };
  },
  feed(x, y) { feed(x, y); },
  reset() { reset(false); },
  pause(v) { S.paused = v === undefined ? !S.paused : !!v; updatePauseUI(); },
  inside(x, y) { return insideRoundRect(x, y, S.W, S.H, pond.bounds.pad, pond.bounds.radius); },
  flags: S.flags,
  setFlag(k, v) { S.flags[k] = !!v; },
  setAdapt(v) { S.adapt = !!v; },
  setQuality(q) { S.quality = clamp(q | 0, 0, 3); applySize(S.W, S.H, false); },
  fish() {
    return koi.map((k) => ({
      x: +k.x.toFixed(1), y: +k.y.toFixed(1),
      speed: +k.speed.toFixed(1), state: k.state,
      depth: +k.depth.toFixed(2), len: +k.len.toFixed(1),
      phase: +k.phase.toFixed(2),
    }));
  },
  /** 脊线点，用于验证“身体弯曲带动尾巴” */
  spine(i = 0) {
    const k = koi[i];
    if (!k) return null;
    return k.spine.map((p) => [+p.x.toFixed(1), +p.y.toFixed(1)]);
  },
  sampleFps(ms = 1500) {
    return new Promise((res) => {
      const t0 = performance.now();
      const f0 = window.__koiPond._frames || 0;
      setTimeout(() => {
        const dt = performance.now() - t0;
        const f = (window.__koiPond._frames || 0) - f0;
        res(+(f / (dt / 1000)).toFixed(1));
      }, ms);
    });
  },
  _frames: 0,
};

/* 供 sampleFps 使用的帧计数 */
(function countFrames() {
  window.__koiPond._frames++;
  requestAnimationFrame(countFrames);
})();

/* ------------------------------------------------------------------ 启动 */
init();
window.__koiPond.ready = true;
