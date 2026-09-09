import * as THREE from 'three';

/**
 * 所有贴图都是运行时用 canvas 画出来的，项目里没有一张图片资源。
 * 目标：米白纸张 / 蓝圆珠笔排线 / 红笔墨点 / 手绘准星与枪口火光。
 */

const PAPER_BASE = '#f8f4e8';
const RULE_BLUE = 'rgba(112, 145, 190, 0.42)';
const MARGIN_RED = 'rgba(214, 96, 82, 0.42)';

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  return { c, ctx };
}

function tex(canvas, { repeat = 1, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

/** 轻微手抖的直线：圆珠笔永远画不直 */
function wobblyLine(ctx, x1, y1, x2, y2, amp = 1.1, steps = 26) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const n = Math.sin(t * 12.9 + x1 * 0.07 + y1 * 0.03) * 0.6 + Math.sin(t * 31.1) * 0.4;
    ctx.lineTo(x + n * amp, y + Math.cos(t * 9.3 + x2 * 0.05) * amp * 0.5);
  }
  ctx.stroke();
}

/** 纸张纤维颗粒 */
function addGrain(ctx, w, h, amount = 0.05, dark = '120,105,80') {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  // 少量深色纸屑
  ctx.fillStyle = `rgba(${dark},0.16)`;
  for (let i = 0; i < w * h * 0.00035; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random(), 1 + Math.random());
  }
}

/**
 * 地面：一整张横格纸。不重复，rules 由近及远自然汇聚。
 * 2048px 覆盖 64 个世界单位。
 */
export function makePaperTexture(size = 2048, worldSize = 64) {
  const { c, ctx } = canvas2d(size, size);
  ctx.fillStyle = PAPER_BASE;
  ctx.fillRect(0, 0, size, size);

  // 纸张本色不均匀
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(226,214,186,${0.03 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      60 + Math.random() * 220,
      40 + Math.random() * 160,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // 横格线：约 2.4 个世界单位一条
  const step = Math.round((2.4 / worldSize) * size);
  ctx.lineWidth = 2.1;
  ctx.strokeStyle = RULE_BLUE;
  for (let y = step; y < size; y += step) {
    wobblyLine(ctx, -20, y, size + 20, y, 1.5, 40);
  }

  // 左侧红色边线（本子的装订边）
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = MARGIN_RED;
  const mx = Math.round(0.17 * size);
  wobblyLine(ctx, mx, -20, mx, size + 20, 1.6, 40);

  // 打孔（装订孔），让「这是一页纸」更明确
  ctx.fillStyle = 'rgba(150,138,112,0.20)';
  const holeX = Math.round(0.062 * size);
  for (let y = step * 2; y < size; y += step * 3) {
    ctx.beginPath();
    ctx.arc(holeX + Math.sin(y * 0.01) * 3, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  addGrain(ctx, size, size, 0.05);
  return tex(c, { repeat: 1, aniso: 8 });
}

/** 排线（hatching）——物体表面的圆珠笔阴影 */
export function makeHatchTexture(size = 128, angleDeg = -42, gap = 9, width = 2.1, alpha = 0.3) {
  const { c, ctx } = canvas2d(size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.strokeStyle = `rgba(58, 88, 150, ${alpha})`;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  const span = size * 1.5;
  for (let x = -span; x <= span; x += gap) {
    // 每条排线自己带一点抖动和粗细变化
    const wob = Math.sin(x * 0.31) * 1.6;
    ctx.beginPath();
    ctx.moveTo(x + wob, -span);
    ctx.bezierCurveTo(x + wob + 1.5, -span / 2, x + wob - 1.5, span / 2, x + wob, span);
    ctx.stroke();
  }
  ctx.restore();
  return tex(c, { repeat: 1, aniso: 4 });
}

/** 交叉排线（更重的阴影） */
export function makeCrossHatchTexture(size = 128) {
  const { c, ctx } = canvas2d(size, size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  for (const ang of [-40, 38]) {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((ang * Math.PI) / 180);
    ctx.strokeStyle = 'rgba(58, 88, 150, 0.28)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const span = size * 1.4;
    for (let x = -span; x <= span; x += 11) {
      ctx.beginPath();
      ctx.moveTo(x, -span);
      ctx.lineTo(x, span);
      ctx.stroke();
    }
    ctx.restore();
  }
  return tex(c, { repeat: 1 });
}

/** 地面上的手绘投影：排线 + 羽化边缘 */
export function makeShadowTexture(size = 256) {
  const { c, ctx } = canvas2d(size, size);
  ctx.clearRect(0, 0, size, size);
  // 排线
  ctx.strokeStyle = 'rgba(64, 84, 138, 0.5)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let x = -size; x < size * 2; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size * 0.9, size);
    ctx.stroke();
  }
  // 用径向渐变挖掉边缘，形成手绘涂抹感
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.5);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.72, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  return tex(c, { repeat: 1 });
}

/**
 * 墨迹喷溅：随机圆斑 + 甩出去的墨点。
 * color 用 CSS 颜色字符串。
 */
export function makeSplatTexture(color = '#1f3d8c', size = 256, seed = 1) {
  const { c, ctx } = canvas2d(size, size);
  const rand = mulberry(seed);
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;

  const cx = size / 2;
  const cy = size / 2;

  // 主墨团：用一圈带噪声的贝塞尔拼出不规则形状
  const pts = 26;
  const radii = [];
  for (let i = 0; i < pts; i++) {
    radii.push(size * (0.16 + rand() * 0.16));
  }
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = radii[i % pts];
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // 核心更浓
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 甩出的墨滴
  const drops = 26 + Math.floor(rand() * 22);
  for (let i = 0; i < drops; i++) {
    const a = rand() * Math.PI * 2;
    const d = size * (0.18 + rand() * 0.3);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    const r = size * (0.006 + rand() * 0.035) * (1 - d / (size * 0.55));
    if (r <= 0.2) continue;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2);
    ctx.fill();
    // 拉长的飞溅
    if (rand() > 0.62) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 3.2, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  return tex(c, { repeat: 1, aniso: 2 });
}

/** 圆形墨点粒子（用于飞溅颗粒） */
export function makeInkDotTexture(size = 64) {
  const { c, ctx } = canvas2d(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  return tex(c, { repeat: 1, aniso: 1 });
}

/** 枪口火光：手绘星芒，收敛在中心附近，不会拉出长条射线 */
export function makeMuzzleTexture(size = 256) {
  const { c, ctx } = canvas2d(size, size);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  ctx.lineCap = 'round';

  // 短而粗的放射笔触（长度只有半径的 1/4 左右）
  const rays = 9;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + 0.35;
    const len = size * (0.1 + ((i * 37) % 7) / 55);
    ctx.strokeStyle = `rgba(240, 178, 60, ${0.9 - ((i * 13) % 3) * 0.12})`;
    ctx.lineWidth = 4 + ((i * 17) % 4);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * size * 0.07, cy + Math.sin(a) * size * 0.07);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }

  // 几滴甩出来的墨点
  ctx.fillStyle = 'rgba(245, 180, 70, 0.8)';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 1.1;
    const d = size * (0.16 + ((i * 29) % 5) / 45);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2.5 + ((i * 11) % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  // 中心高光
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.2);
  g.addColorStop(0, 'rgba(255, 250, 225, 1)');
  g.addColorStop(0.45, 'rgba(250, 190, 80, 0.75)');
  g.addColorStop(1, 'rgba(245, 170, 60, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  return tex(c, { repeat: 1 });
}

/** 一刀斩击的弧形笔触 */
export function makeSlashTexture(size = 256) {
  const { c, ctx } = canvas2d(size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';
  // 多道弧线叠出笔锋（够粗，才能在画面里读出「刀光」）
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = `rgba(36, 64, 142, ${0.85 - k * 0.17})`;
    ctx.lineWidth = 26 - k * 5;
    ctx.beginPath();
    const r = size * (0.42 - k * 0.028);
    ctx.arc(size * 0.5, size * 0.52, r, -2.35, 0.8);
    ctx.stroke();
  }
  // 笔尖拖尾（红色，像划破纸面）
  ctx.strokeStyle = 'rgba(216, 64, 47, 0.8)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.52, size * 0.45, -2.18, 0.62);
  ctx.stroke();
  // 起笔处的墨点
  ctx.fillStyle = 'rgba(36, 64, 142, 0.75)';
  ctx.beginPath();
  ctx.arc(size * 0.5 + Math.cos(-2.35) * size * 0.42, size * 0.52 + Math.sin(-2.35) * size * 0.42, 9, 0, Math.PI * 2);
  ctx.fill();
  return tex(c, { repeat: 1 });
}

/** 手绘「小十字」贴图：命中标记的 3D 版本 */
export function makeCrossTexture(size = 128) {
  const { c, ctx } = canvas2d(size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(216,64,47,0.95)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const m = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(m, m);
  ctx.lineTo(size - m, size - m);
  ctx.moveTo(size - m, m);
  ctx.lineTo(m, size - m);
  ctx.stroke();
  return tex(c, { repeat: 1 });
}

/** 确定性伪随机，保证同一个 seed 的墨迹长得一样 */
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PAPER_COLOR = new THREE.Color(PAPER_BASE);
export const INK_COLOR = new THREE.Color('#24408e');
export const RED_COLOR = new THREE.Color('#d8402f');
