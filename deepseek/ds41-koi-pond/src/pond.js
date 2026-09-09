/* ------------------------------------------------------------------ *
 *  pond.js — 池底与水生植物（鹅卵石 / 沙床 / 石岸 / 水草 / 睡莲）
 *  池底为一次性离屏渲染；水草与睡莲每帧重绘以产生摆动。
 * ------------------------------------------------------------------ */

import { TAU, clamp, lerp, mulberry32, rand, randInt, pick, makeNoise2D, rgba } from './util.js';

const PEBBLE_COLORS = [
  [178, 168, 150], [152, 142, 126], [198, 188, 170], [128, 120, 108],
  [162, 150, 130], [185, 172, 148], [140, 132, 122], [170, 160, 148],
  [202, 192, 176], [116, 112, 106], [174, 160, 134], [148, 138, 124],
  [190, 178, 152], [134, 126, 112], [158, 152, 144], [206, 196, 178],
];

/** 不规则轮廓半径（环形平滑） */
function lumpy(rng, n, wob) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = 1 + (rng() - 0.5) * wob;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (a[(i - 1 + n) % n] + a[i] * 2 + a[(i + 1) % n]) * 0.25;
  }
  return out;
}

export function createPond({ w, h, rs = 1, seed = 20240918 }) {
  const rng = mulberry32(seed);
  const noise = makeNoise2D(seed + 7);
  const S = Math.min(w, h);
  const rim = Math.max(14, S * 0.035);          // 石岸宽度
  const bounds = {
    pad: rim * 1.35 + S * 0.02,
    radius: Math.max(24, S * 0.09),
  };

  /* ---------------------------------------------------------- 池底静态层 */
  const floor = document.createElement('canvas');
  floor.width = Math.max(2, Math.round(w * rs));
  floor.height = Math.max(2, Math.round(h * rs));
  const f = floor.getContext('2d');
  f.scale(rs, rs);

  // 沙床底色
  const base = f.createLinearGradient(0, 0, w * 0.25, h);
  base.addColorStop(0, '#c2b394');
  base.addColorStop(0.45, '#b3a487');
  base.addColorStop(1, '#9d9077');
  f.fillStyle = base;
  f.fillRect(0, 0, w, h);

  const depth = f.createRadialGradient(w * 0.5, h * 0.48, S * 0.06, w * 0.5, h * 0.5, S * 0.8);
  depth.addColorStop(0, 'rgba(32,60,68,0.40)');
  depth.addColorStop(0.5, 'rgba(44,70,72,0.18)');
  depth.addColorStop(1, 'rgba(74,84,70,0.0)');
  f.fillStyle = depth;
  f.fillRect(0, 0, w, h);

  // 细沙颗粒（克制）
  const grain = document.createElement('canvas');
  grain.width = grain.height = 128;
  const g = grain.getContext('2d');
  const grng = mulberry32(seed + 3);
  for (let i = 0; i < 2400; i++) {
    const v = grng();
    g.fillStyle = v > 0.5
      ? `rgba(255,250,238,${0.03 + grng() * 0.07})`
      : `rgba(62,56,44,${0.02 + grng() * 0.06})`;
    g.fillRect(grng() * 128, grng() * 128, 1, 1);
  }
  const grainPat = f.createPattern(grain, 'repeat');
  f.globalAlpha = 0.7;
  f.fillStyle = grainPat;
  f.fillRect(0, 0, w, h);
  f.globalAlpha = 1;

  // 苔藓 / 藻斑
  for (let i = 0; i < 44; i++) {
    const x = rand(rng, 0, w), y = rand(rng, 0, h);
    const r = rand(rng, S * 0.03, S * 0.13);
    const n = noise(x / 260, y / 260);
    const a = 0.04 + n * 0.1;
    const gg = f.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, `rgba(76,104,62,${a})`);
    gg.addColorStop(0.6, `rgba(66,94,58,${a * 0.45})`);
    gg.addColorStop(1, 'rgba(60,88,56,0)');
    f.fillStyle = gg;
    f.beginPath();
    f.ellipse(x, y, r * rand(rng, 0.8, 1.5), r * rand(rng, 0.7, 1.3), rand(rng, 0, TAU), 0, TAU);
    f.fill();
  }

  /* ------------------------------------------------------------- 鹅卵石 */
  const pebbleCount = clamp(Math.round((w * h) / 1050), 700, 2600);
  const innerPad = bounds.pad * 0.72;
  const pebbles = [];
  for (let i = 0; i < pebbleCount; i++) {
    const x = rand(rng, innerPad * 0.4, w - innerPad * 0.4);
    const y = rand(rng, innerPad * 0.4, h - innerPad * 0.4);
    const big = rng() < 0.14;
    const r = big ? rand(rng, S * 0.011, S * 0.024) : rand(rng, S * 0.0035, S * 0.0115);
    pebbles.push({
      x, y, r,
      rx: r * rand(rng, 0.85, 1.35),
      ry: r * rand(rng, 0.66, 1.02),
      rot: rand(rng, 0, TAU),
      pts: lumpy(rng, 9, 0.30),
      c: pick(rng, PEBBLE_COLORS),
      tone: rand(rng, -0.09, 0.1),
      z: big ? 1 : 0,
    });
  }
  pebbles.sort((a, b) => a.z - b.z);

  for (const p of pebbles) {
    const [cr, cg, cb] = p.c;
    const t = p.tone;
    const K = p.pts.length;
    const path = (ox, oy, scale) => {
      f.beginPath();
      for (let i = 0; i <= K; i++) {
        const a = ((i % K) / K) * TAU + p.rot;
        const rr = p.pts[i % K] * scale;
        const px = p.x + ox + Math.cos(a) * p.rx * rr;
        const py = p.y + oy + Math.sin(a) * p.ry * rr;
        if (i === 0) f.moveTo(px, py); else f.lineTo(px, py);
      }
      f.closePath();
    };

    // 投影
    f.fillStyle = 'rgba(30,34,28,0.115)';
    path(p.r * 0.13, p.r * 0.19, 1.0);
    f.fill();

    // 主体（单一光源方向：左上亮、右下暗）
    const lg = f.createLinearGradient(
      p.x - p.rx, p.y - p.ry, p.x + p.rx * 0.9, p.y + p.ry * 1.1
    );
    lg.addColorStop(0, rgba(cr * 1.16 + 14, cg * 1.15 + 12, cb * 1.14 + 10, 1));
    lg.addColorStop(0.48, rgba(cr * (1 + t * 0.5), cg * (1 + t * 0.5), cb * (1 + t * 0.5), 1));
    lg.addColorStop(1, rgba(cr * 0.74, cg * 0.74, cb * 0.72, 1));
    f.fillStyle = lg;
    path(0, 0, 1.0);
    f.fill();

    // 顶缘柔光（不是高光点）
    f.strokeStyle = `rgba(255,251,238,${0.07 + p.tone * 0.25})`;
    f.lineWidth = Math.max(0.5, p.r * 0.16);
    path(-p.r * 0.03, -p.r * 0.05, 0.94);
    f.stroke();

    // 底缘暗边
    f.strokeStyle = 'rgba(48,46,38,0.09)';
    f.lineWidth = Math.max(0.5, p.r * 0.12);
    path(p.r * 0.04, p.r * 0.07, 0.97);
    f.stroke();
  }

  // 大石头：不规则外形 + 裂纹 + 苔
  for (let i = 0; i < 6; i++) {
    const x = rand(rng, w * 0.13, w * 0.87);
    const y = rand(rng, h * 0.13, h * 0.87);
    const r = rand(rng, S * 0.032, S * 0.062);
    const rot = rand(rng, 0, TAU);
    const pts = lumpy(rng, 12, 0.34);
    const rx = r * rand(rng, 1.0, 1.35), ry = r * rand(rng, 0.7, 0.95);
    const K = pts.length;
    const path = (ox, oy, sc) => {
      f.beginPath();
      for (let k = 0; k <= K; k++) {
        const a = ((k % K) / K) * TAU + rot;
        const rr = pts[k % K] * sc;
        const px = x + ox + Math.cos(a) * rx * rr;
        const py = y + oy + Math.sin(a) * ry * rr;
        if (k === 0) f.moveTo(px, py); else f.lineTo(px, py);
      }
      f.closePath();
    };

    f.fillStyle = 'rgba(28,32,28,0.24)';
    path(r * 0.1, r * 0.15, 1.02);
    f.fill();

    const lg = f.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
    lg.addColorStop(0, '#a49a88');
    lg.addColorStop(0.42, '#847d6f');
    lg.addColorStop(1, '#4f4d46');
    f.fillStyle = lg;
    path(0, 0, 1);
    f.fill();

    // 斑驳
    for (let k = 0; k < 9; k++) {
      const a = rand(rng, 0, TAU), d = rand(rng, 0, r * 0.7);
      const sr = rand(rng, r * 0.08, r * 0.24);
      f.fillStyle = `rgba(${rng() < 0.5 ? '70,68,60' : '176,168,150'},${rand(rng, 0.06, 0.16)})`;
      f.beginPath();
      f.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, sr, sr * rand(rng, 0.5, 0.9), rand(rng, 0, TAU), 0, TAU);
      f.fill();
    }
    // 裂纹
    f.strokeStyle = 'rgba(42,42,38,0.34)';
    for (let k = 0; k < 3; k++) {
      const a0 = rand(rng, 0, TAU);
      const a1 = a0 + rand(rng, 1.2, 2.6);
      const l0 = r * rand(rng, 0.25, 0.75);
      const l1 = r * rand(rng, 0.25, 0.75);
      f.lineWidth = rand(rng, 0.6, 1.6);
      f.beginPath();
      f.moveTo(x + Math.cos(a0) * l0, y + Math.sin(a0) * l0);
      f.quadraticCurveTo(
        x + Math.cos((a0 + a1) / 2) * r * rand(rng, 0.1, 0.5),
        y + Math.sin((a0 + a1) / 2) * r * rand(rng, 0.1, 0.5),
        x + Math.cos(a1) * l1, y + Math.sin(a1) * l1
      );
      f.stroke();
    }
    // 苔
    for (let k = 0; k < 3; k++) {
      const a = rand(rng, 0, TAU);
      f.fillStyle = `rgba(72,102,58,${rand(rng, 0.12, 0.3)})`;
      f.beginPath();
      f.ellipse(x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42,
        r * rand(rng, 0.2, 0.42), r * rand(rng, 0.14, 0.3), rand(rng, 0, TAU), 0, TAU);
      f.fill();
    }
    // 顶面受光
    f.fillStyle = 'rgba(255,250,236,0.13)';
    path(-r * 0.1, -r * 0.12, 0.82);
    f.fill();
  }

  /* ------------------------------------------------------------- 石岸 */
  drawRim(f, w, h, rim, rng, noise);

  // 岸边内阴影，制造水深过渡
  const edge = f.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.28,
    w / 2, h / 2, Math.max(w, h) * 0.62
  );
  edge.addColorStop(0, 'rgba(20,34,34,0)');
  edge.addColorStop(0.72, 'rgba(18,32,34,0.14)');
  edge.addColorStop(1, 'rgba(10,22,26,0.46)');
  f.fillStyle = edge;
  f.fillRect(0, 0, w, h);

  /* --------------------------------------------- 景深：水越深越柔 */
  const blurCv = document.createElement('canvas');
  blurCv.width = floor.width;
  blurCv.height = floor.height;
  const bc = blurCv.getContext('2d');
  bc.filter = `blur(${Math.max(1.6, S * 0.016 * rs)}px)`;
  bc.drawImage(floor, 0, 0);
  bc.filter = 'none';
  bc.globalCompositeOperation = 'destination-in';
  const mask = bc.createRadialGradient(
    w * 0.5, h * 0.5, S * 0.06,
    w * 0.5, h * 0.5, S * 0.66
  );
  mask.addColorStop(0, 'rgba(0,0,0,0.95)');
  mask.addColorStop(0.55, 'rgba(0,0,0,0.5)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  bc.fillStyle = mask;
  bc.fillRect(0, 0, w, h);
  f.drawImage(blurCv, 0, 0, w, h);

  /* --------------------------------------------------------- 水草（动态） */
  const plants = [];
  const clusterCount = clamp(Math.round((w * h) / 42000), 18, 36);
  for (let i = 0; i < clusterCount; i++) {
    const edgeBias = rng() < 0.72;
    let x, y;
    if (edgeBias) {
      const side = randInt(rng, 0, 3);
      const t = rng();
      const m = bounds.pad + S * 0.05;
      if (side === 0) { x = lerp(m, w - m, t); y = m + rand(rng, 0, S * 0.09); }
      else if (side === 1) { x = lerp(m, w - m, t); y = h - m - rand(rng, 0, S * 0.09); }
      else if (side === 2) { x = m + rand(rng, 0, S * 0.09); y = lerp(m, h - m, t); }
      else { x = w - m - rand(rng, 0, S * 0.09); y = lerp(m, h - m, t); }
    } else {
      x = rand(rng, w * 0.2, w * 0.8);
      y = rand(rng, h * 0.2, h * 0.8);
    }
    const blades = [];
    const n = randInt(rng, 5, 10);
    const lean = rand(rng, -0.7, 0.7);
    const dark = rng() < 0.42;
    for (let b = 0; b < n; b++) {
      blades.push({
        dx: rand(rng, -S * 0.014, S * 0.014),
        dy: rand(rng, -S * 0.012, S * 0.012),
        len: rand(rng, S * 0.055, S * 0.16) * (dark ? 0.82 : 1),
        wdt: rand(rng, S * 0.0022, S * 0.0044),
        lean: lean + rand(rng, -0.55, 0.55),
        phase: rand(rng, 0, TAU),
        speed: rand(rng, 0.55, 1.05),
        amp: rand(rng, S * 0.006, S * 0.018),
        hue: dark ? rand(rng, 108, 132) : rand(rng, 86, 112),
        sat: dark ? rand(rng, 26, 40) : rand(rng, 34, 52),
        lit: dark ? rand(rng, 20, 28) : rand(rng, 27, 40),
      });
    }
    plants.push({ x, y, blades });
  }
  plants.sort((a, b) => a.y - b.y);

  /* ----------------------------------------------------------- 睡莲 / 浮叶 */
  const pads = [];
  const padCount = randInt(rng, 3, 5);
  for (let i = 0; i < padCount; i++) {
    pads.push({
      x: rand(rng, w * 0.16, w * 0.84),
      y: rand(rng, h * 0.16, h * 0.84),
      r: rand(rng, S * 0.042, S * 0.078),
      rot: rand(rng, 0, TAU),
      notch: rand(rng, 0.3, 0.62),
      phase: rand(rng, 0, TAU),
      drift: rand(rng, S * 0.004, S * 0.011),
      hue: rand(rng, 92, 118),
      lit: rand(rng, 26, 40),
      pts: lumpy(rng, 11, 0.17),
      flower: rng() < 0.34,
      flowerHue: rand(rng, 336, 352),
    });
  }

  /* --------------------------------------------------------------- 绘制 API */
  function drawPlantShadows(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (const c of plants) {
      ctx.fillStyle = 'rgba(38,50,40,0.18)';
      for (const b of c.blades) {
        const sway = Math.sin(time * b.speed + b.phase) * b.amp;
        const tipX = c.x + b.dx + b.lean * b.len * 0.55 + sway;
        const tipY = c.y + b.dy - b.len;
        ctx.beginPath();
        ctx.ellipse((c.x + tipX) / 2 + b.len * 0.07, (c.y + tipY) / 2 + b.len * 0.07,
          b.len * 0.17, b.len * 0.11, b.lean, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPlants(ctx, time) {
    for (const c of plants) {
      for (const b of c.blades) {
        const sway = Math.sin(time * b.speed + b.phase) * b.amp;
        const bx = c.x + b.dx, by = c.y + b.dy;
        const tipX = bx + b.lean * b.len * 0.55 + sway;
        const tipY = by - b.len;
        const ctrlX = bx + b.lean * b.len * 0.16 + sway * 0.28;
        const ctrlY = by - b.len * 0.58;

        const segs = 7;
        const left = [], right = [];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const it = 1 - t;
          const x = it * it * bx + 2 * it * t * ctrlX + t * t * tipX;
          const y = it * it * by + 2 * it * t * ctrlY + t * t * tipY;
          const tx = 2 * it * (ctrlX - bx) + 2 * t * (tipX - ctrlX);
          const ty = 2 * it * (ctrlY - by) + 2 * t * (tipY - ctrlY);
          const tl = Math.hypot(tx, ty) || 1;
          const nx = -ty / tl, ny = tx / tl;
          const hw = b.wdt * Math.pow(1 - t, 0.6) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.35)));
          left.push({ x: x + nx * hw, y: y + ny * hw });
          right.push({ x: x - nx * hw, y: y - ny * hw });
        }

        const grad = ctx.createLinearGradient(bx, by, tipX, tipY);
        grad.addColorStop(0, `hsl(${b.hue - 8},${b.sat}%,${b.lit * 0.5}%)`);
        grad.addColorStop(0.55, `hsl(${b.hue},${b.sat}%,${b.lit}%)`);
        grad.addColorStop(1, `hsl(${b.hue + 6},${b.sat + 6}%,${Math.min(64, b.lit + 16)}%)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
        for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = `hsla(${b.hue + 10},${b.sat}%,${Math.min(70, b.lit + 24)}%,0.4)`;
        ctx.lineWidth = Math.max(0.5, b.wdt * 0.22);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        ctx.stroke();
      }
    }
  }

  function padGeometry(p, time) {
    const t = time * 0.22 + p.phase;
    const x = p.x + Math.sin(t) * p.drift + Math.sin(t * 2.3 + 1.1) * p.drift * 0.3;
    const y = p.y + Math.cos(t * 0.83 + 0.6) * p.drift * 0.8;
    const rot = p.rot + Math.sin(t * 0.5) * 0.09;
    const r = p.r * (1 + Math.sin(t * 1.7) * 0.012);
    return { x, y, rot, r };
  }

  function drawPadShadows(ctx, time) {
    for (const p of pads) {
      const { x, y, rot, r } = padGeometry(p, time);
      ctx.save();
      ctx.translate(x + r * 0.1, y + r * 0.14);
      ctx.rotate(rot);
      const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.12);
      g.addColorStop(0, 'rgba(24,38,34,0.4)');
      g.addColorStop(0.75, 'rgba(24,38,34,0.18)');
      g.addColorStop(1, 'rgba(24,38,34,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.12, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function padPath(ctx, r, notch, rot, pts) {
    const a0 = rot + Math.PI * 0.5 - notch * 0.5;
    const a1 = rot + Math.PI * 0.5 + notch * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    if (!pts) { ctx.arc(0, 0, r, a1, a0 + TAU, false); ctx.closePath(); return; }
    const K = pts.length;
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const a = a1 + (a0 + TAU - a1) * (i / steps);
      const rr = r * pts[Math.floor((i / steps) * K) % K];
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  function drawPads(ctx, time) {
    for (const p of pads) {
      const { x, y, rot, r } = padGeometry(p, time);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      padPath(ctx, r, p.notch, 0, p.pts);
      const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
      g.addColorStop(0, `hsl(${p.hue + 10},40%,${p.lit + 15}%)`);
      g.addColorStop(0.6, `hsl(${p.hue},38%,${p.lit}%)`);
      g.addColorStop(1, `hsl(${p.hue - 6},34%,${p.lit * 0.7}%)`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = `hsla(${p.hue + 14},32%,${Math.min(70, p.lit + 20)}%,0.18)`;
      ctx.lineWidth = Math.max(0.6, r * 0.022);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          Math.cos(a + 0.16) * r * 0.5, Math.sin(a + 0.16) * r * 0.5,
          Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9
        );
        ctx.stroke();
      }
      ctx.strokeStyle = `hsla(${p.hue - 4},46%,${p.lit * 0.6}%,0.72)`;
      ctx.lineWidth = Math.max(0.8, r * 0.05);
      padPath(ctx, r, p.notch, 0, p.pts);
      ctx.stroke();
      ctx.fillStyle = 'rgba(240,252,255,0.10)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 0.34, r * 0.34, r * 0.16, -0.6, 0, TAU);
      ctx.fill();

      if (p.flower) {
        const petals = 7;
        for (let i = 0; i < petals; i++) {
          const a = (i / petals) * TAU + Math.sin(time * 0.4 + p.phase) * 0.05;
          const pr = r * 0.42;
          ctx.save();
          ctx.rotate(a);
          const pg = ctx.createLinearGradient(0, 0, pr, 0);
          pg.addColorStop(0, `hsla(${p.flowerHue},72%,88%,0.96)`);
          pg.addColorStop(1, `hsla(${p.flowerHue},64%,66%,0.96)`);
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.ellipse(pr * 0.6, 0, pr * 0.62, pr * 0.26, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = 'rgba(250,226,150,0.95)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.11, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  return {
    w, h, rs, S, rim, bounds, floor,
    plants, pads,
    drawPlantShadows, drawPlants, drawPadShadows, drawPads, padGeometry,
  };
}

/* ---------------------------------------------------------------- 石岸 */
function drawRim(f, w, h, rim, rng, noise) {
  const S = Math.min(w, h);
  const stones = [];
  const step = Math.max(10, S * 0.022);
  const edge = (t, side) => {
    if (side === 0) return { x: t, y: 0 };
    if (side === 1) return { x: w, y: t };
    if (side === 2) return { x: t, y: h };
    return { x: 0, y: t };
  };

  for (let side = 0; side < 4; side++) {
    const len = side === 0 || side === 2 ? w : h;
    for (let d = -step; d < len + step; d += step * rand(rng, 0.6, 1.05)) {
      const p = edge(d, side);
      const nx = side === 1 ? 1 : side === 3 ? -1 : 0;
      const ny = side === 0 ? -1 : side === 2 ? 1 : 0;
      const off = rand(rng, rim * 0.05, rim * 0.62);
      const jitter = rand(rng, -step * 0.45, step * 0.45);
      const x = p.x - nx * off + (ny ? jitter : 0);
      const y = p.y - ny * off + (nx ? jitter : 0);
      const r = rand(rng, rim * 0.42, rim * 0.92);
      stones.push({
        x, y, r,
        rx: r * rand(rng, 0.8, 1.5),
        ry: r * rand(rng, 0.7, 1.15),
        rot: rand(rng, 0, TAU),
        tone: rand(rng, 0.2, 0.62),
        moss: rand(rng, 0.15, 0.55),
        pts: lumpy(rng, 8, 0.26),
      });
    }
  }

  stones.sort((a, b) => (a.y + a.x) - (b.y + b.x));
  for (const s of stones) {
    const g = 62 + s.tone * 88;
    const warm = 1 + (noise(s.x / 300, s.y / 300) - 0.5) * 0.12;
    const K = s.pts.length;
    const path = (ox, oy) => {
      f.beginPath();
      for (let i = 0; i <= K; i++) {
        const a = ((i % K) / K) * TAU + s.rot;
        const rr = s.pts[i % K];
        const px = s.x + ox + Math.cos(a) * s.rx * rr;
        const py = s.y + oy + Math.sin(a) * s.ry * rr;
        if (i === 0) f.moveTo(px, py); else f.lineTo(px, py);
      }
      f.closePath();
    };

    f.fillStyle = 'rgba(10,16,18,0.5)';
    path(s.rx * 0.1, s.ry * 0.18);
    f.fill();
    const lg = f.createLinearGradient(
      s.x - s.rx, s.y - s.ry, s.x + s.rx, s.y + s.ry
    );
    lg.addColorStop(0, rgba(g * 1.22 * warm, g * 1.18, g * 1.04, 1));
    lg.addColorStop(0.55, rgba(g * warm, g * 0.96, g * 0.86, 1));
    lg.addColorStop(1, rgba(g * 0.6, g * 0.58, g * 0.54, 1));
    f.fillStyle = lg;
    path(0, 0);
    f.fill();

    f.fillStyle = `rgba(66,96,54,${0.1 + s.moss * 0.42})`;
    f.beginPath();
    f.ellipse(s.x + s.rx * 0.18, s.y + s.ry * 0.24, s.rx * 0.62, s.ry * 0.46, s.rot + 0.4, 0, TAU);
    f.fill();
    f.fillStyle = 'rgba(246,246,236,0.13)';
    f.beginPath();
    f.ellipse(s.x - s.rx * 0.22, s.y - s.ry * 0.3, s.rx * 0.42, s.ry * 0.2, s.rot - 0.4, 0, TAU);
    f.fill();
  }

  // 水面张力形成的亮边（贴着岸）
  const inset = rim * 0.55;
  f.strokeStyle = 'rgba(228,248,244,0.20)';
  f.lineWidth = Math.max(1.2, rim * 0.14);
  f.beginPath();
  f.roundRect(inset - rim * 0.2, inset - rim * 0.2, (w - inset * 2) + rim * 0.4, (h - inset * 2) + rim * 0.4, rim);
  f.stroke();
  // 水与岸的交界暗边
  f.strokeStyle = 'rgba(10,20,22,0.24)';
  f.lineWidth = Math.max(2, rim * 0.28);
  f.beginPath();
  f.roundRect(inset, inset, w - inset * 2, h - inset * 2, rim);
  f.stroke();
}
