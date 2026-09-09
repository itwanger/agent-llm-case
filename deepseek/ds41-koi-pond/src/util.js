/* ------------------------------------------------------------------ *
 *  util.js — 通用数学 / 绘图辅助
 * ------------------------------------------------------------------ */

export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);
export const mix = lerp;

/** 确定性伪随机（可复现的鱼体花纹） */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (rng, a, b) => a + (b - a) * rng();
export const randInt = (rng, a, b) => Math.floor(rand(rng, a, b + 1));
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/** 最短角差 (-PI, PI] */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** 角度插值（带最大转速限制） */
export function turnToward(cur, target, maxStep) {
  const d = angleDelta(cur, target);
  return cur + clamp(d, -maxStep, maxStep);
}

export function lerpAngle(cur, target, t) {
  return cur + angleDelta(cur, target) * clamp(t, 0, 1);
}

/** 平滑一维噪声（用于游动时的自然摆动） */
export function makeNoise1D(seed) {
  const rng = mulberry32(seed);
  const table = new Float32Array(256);
  for (let i = 0; i < 256; i++) table[i] = rng() * 2 - 1;
  return function (x) {
    const xi = Math.floor(x);
    const f = x - xi;
    const a = table[xi & 255];
    const b = table[(xi + 1) & 255];
    return lerp(a, b, smoothstep(f));
  };
}

/** 二维值噪声，用于卵石 / 苔藓分布 */
export function makeNoise2D(seed) {
  const rng = mulberry32(seed);
  const size = 256;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  const at = (x, y) => grid[((y & 255) * size) + (x & 255)];
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = smoothstep(xf), v = smoothstep(yf);
    const a = at(xi, yi), b = at(xi + 1, yi);
    const c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
}

/** Catmull-Rom 采样（width profile 之类） */
export function catmullRom(pts, t) {
  const n = pts.length;
  const x = clamp(t, 0, 1) * (n - 1);
  const i = Math.min(Math.floor(x), n - 2);
  const f = x - i;
  const p0 = pts[Math.max(i - 1, 0)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(i + 2, n - 1)];
  const f2 = f * f, f3 = f2 * f;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * f +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * f3
  );
}

/**
 * 通过点集的平滑闭合路径（二次贝塞尔中点法）。
 * 相比逐点 lineTo，能以更少的点获得柔顺轮廓。
 */
export function traceClosedSmooth(ctx, pts) {
  const n = pts.length;
  if (n < 3) return;
  let mx = (pts[n - 1].x + pts[0].x) * 0.5;
  let my = (pts[n - 1].y + pts[0].y) * 0.5;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    mx = (p.x + q.x) * 0.5;
    my = (p.y + q.y) * 0.5;
    ctx.quadraticCurveTo(p.x, p.y, mx, my);
  }
  ctx.closePath();
}

/** 平滑开放路径 */
export function traceOpenSmooth(ctx, pts) {
  const n = pts.length;
  if (n < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (n === 2) { ctx.lineTo(pts[1].x, pts[1].y); return; }
  for (let i = 1; i < n - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) * 0.5, (p.y + q.y) * 0.5);
  }
  ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
}

export function rgba(r, g, b, a) {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

/** hsl 字符串 */
export function hsl(h, s, l, a = 1) {
  return `hsla(${h},${s}%,${l}%,${a})`;
}

export function hexShade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amount >= 0) {
    r = r + (255 - r) * amount;
    g = g + (255 - g) * amount;
    b = b + (255 - b) * amount;
  } else {
    r *= 1 + amount; g *= 1 + amount; b *= 1 + amount;
  }
  return rgba(r, g, b, 1);
}

/** 判断点是否在圆角矩形内 */
export function insideRoundRect(x, y, w, h, pad, radius) {
  const ix = pad, iy = pad;
  const rw = w - pad * 2, rh = h - pad * 2;
  const cx = clamp(x, ix + radius, ix + rw - radius);
  const cy = clamp(y, iy + radius, iy + rh - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}
