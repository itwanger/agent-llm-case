/* ------------------------------------------------------------------ *
 *  koi.js — 程序化锦鲤
 *
 *  身体：沿脊线积分曲率生成行波，头部稳定、尾部摆幅大，
 *        尾部鳍片跟随切线摆动 —— 弯曲带动尾巴。
 *  花纹：定义在 (s,t) 体坐标系内，经脊线映射到世界坐标，
 *        因此红斑 / 墨斑会随身体一起弯曲。
 * ------------------------------------------------------------------ */

import {
  TAU, clamp, lerp, lerpAngle, turnToward, catmullRom,
  traceClosedSmooth, rgba, rand,
} from './util.js';

/* 半宽轮廓（相对体长），0=吻端 1=尾柄 */
const WIDTH_PROFILE = [
  0.030, 0.062, 0.092, 0.106, 0.110, 0.104,
  0.090, 0.072, 0.054, 0.038, 0.024, 0.013,
];

const ROSTER = [
  { name: 'kohaku', size: 0.196, base: '#f6f1e6', accent: '#df4726', pattern: 'red', spots: 4 },
  { name: 'kohaku', size: 0.163, base: '#f4eee1', accent: '#e0502c', pattern: 'red', spots: 3 },
  { name: 'tancho', size: 0.171, base: '#f7f2e8', accent: '#d83d1e', pattern: 'tancho' },
  { name: 'sanke', size: 0.178, base: '#f5f0e5', accent: '#e04a26', ink: '#24242b', pattern: 'redink' },
  { name: 'showa', size: 0.168, base: '#efe9dd', accent: '#d63f1f', ink: '#1d1d25', pattern: 'inkred' },
  { name: 'ogon', size: 0.185, base: '#ffd95e', base2: '#d19a1c', metallic: true, pattern: 'none' },
  { name: 'yamabuki', size: 0.158, base: '#f4a834', base2: '#b26b12', metallic: true, pattern: 'none' },
  { name: 'platinum', size: 0.150, base: '#f8f8f4', base2: '#c6cbc7', metallic: true, pattern: 'none' },
  { name: 'bekko', size: 0.173, base: '#f2ece0', ink: '#212129', pattern: 'ink' },
  { name: 'shiro', size: 0.161, base: '#25252d', accent: '#f2ece0', pattern: 'whiteonink' },
  { name: 'kohaku', size: 0.140, base: '#f5f0e4', accent: '#e2552e', pattern: 'red', spots: 3 },
];

export class Koi {
  constructor({ rng, world, index }) {
    const spec = ROSTER[index % ROSTER.length];
    this.rng = rng;
    this.world = world;
    this.spec = spec;
    this.index = index;

    this.sizeFrac = spec.size * (0.93 + rng() * 0.15);
    this.len = spec.size * world.S;

    // 初始位置：均匀铺开
    const ang = (index / ROSTER.length) * TAU + rand(rng, -0.5, 0.5);
    const rad = 0.16 + rng() * 0.28;
    this.x = world.W * (0.5 + Math.cos(ang) * rad);
    this.y = world.H * (0.5 + Math.sin(ang) * rad);
    this.angle = rand(rng, 0, TAU);
    this.wanderAngle = this.angle;
    this.speed = 0.045 * world.S;
    this.cruise = (0.036 + rng() * 0.022) * world.S;
    this.turnRate = 1.9 + rng() * 1.1;

    this.phase = rng();
    this.beat = 1.25 + rng() * 0.5;
    this.prefDepth = rand(rng, 0.22, 0.72);
    this.depth = this.prefDepth;

    this.state = 'wander';
    this.stateT = 0;
    this.noFoodT = 0;
    this.chew = 0;
    this.focus = null;
    this.wobble = rng() * TAU;
    this.wobbleSpeed = rand(rng, 0.35, 0.7);

    // 鱼鳍摆动
    this.finPhase = rng() * TAU;

    this.spine = new Array(18).fill(0).map(() => ({ x: 0, y: 0 }));
    this.norm = new Array(18).fill(0).map(() => ({ x: 0, y: 1 }));
    this.half = new Float32Array(18);
    this.built = false;

    this.pattern = buildPattern(rng, spec);
    this.bodyPts = new Array(18 * 2).fill(0).map(() => ({ x: 0, y: 0 }));
    this.finPts = new Array(10).fill(0).map(() => ({ x: 0, y: 0 }));
  }

  /* ---------------------------------------------------------------- AI */
  update(dt, world) {
    const S = world.S;
    this.len = this.sizeFrac * S;

    // ---- 感知鱼食 ----
    let best = null, bestD = Infinity;
    const perception = S * 0.62;
    const food = world.food;
    for (let i = 0; i < food.length; i++) {
      const p = food[i];
      if (p.dead) continue;
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < perception && d < bestD) { bestD = d; best = p; }
    }

    if (best) {
      this.state = 'feed';
      this.noFoodT = 0;
      this.focus = { x: best.x, y: best.y };
    } else {
      this.noFoodT += dt;
      if (this.state === 'feed' && this.noFoodT > 0.45) {
        this.state = 'sated';
        this.stateT = 1.5 + this.rng() * 2.4;
        // 朝远离投食点的方向散开
        const away = this.focus
          ? Math.atan2(this.y - this.focus.y, this.x - this.focus.x)
          : this.rng() * TAU;
        this.wanderAngle = away + rand(this.rng, -1.1, 1.1);
      }
      if (this.state === 'sated') {
        this.stateT -= dt;
        if (this.stateT <= 0) this.state = 'wander';
      }
    }

    // ---- 期望方向 / 速度 ----
    let desired = this.wanderAngle;
    let targetSpeed = this.cruise;
    let turnRate = this.turnRate;

    if (this.state === 'feed' && best) {
      desired = Math.atan2(best.y - this.y, best.x - this.x);
      const prox = clamp(1 - bestD / perception, 0, 1);
      targetSpeed = this.cruise * (1.55 + prox * 0.95);
      turnRate *= 1.7;
      this.chew -= dt;
      if (bestD < this.len * 0.22 + S * 0.006 && this.chew <= 0) {
        world.eat(best, this);
        this.chew = 0.45 + this.rng() * 0.35;
      }
    } else if (this.state === 'sated') {
      targetSpeed = this.cruise * 1.25;
      desired = this.wanderAngle;
    } else {
      // 悠闲巡游
      this.wobble += dt * this.wobbleSpeed;
      this.wanderAngle += Math.sin(this.wobble) * dt * 1.25
        + Math.sin(this.wobble * 2.7 + 1.3) * dt * 0.5;
      desired = this.wanderAngle;
      targetSpeed = this.cruise * (0.85 + 0.3 * Math.sin(this.wobble * 1.7));
    }

    // ---- 转向：合力（期望方向 + 边界 + 分离） ----
    let fx = Math.cos(desired);
    let fy = Math.sin(desired);
    const pad = world.bounds.pad + this.len * 0.42;
    const margin = Math.max(S * 0.11, this.len * 1.2);
    const W = world.W, H = world.H;

    const push = (v) => {
      const t = clamp(v, 0, 1);
      return t * t * 3.4;
    };
    if (this.x < pad + margin) fx += push((pad + margin - this.x) / margin);
    if (this.x > W - pad - margin) fx -= push((this.x - (W - pad - margin)) / margin);
    if (this.y < pad + margin) fy += push((pad + margin - this.y) / margin);
    if (this.y > H - pad - margin) fy -= push((this.y - (H - pad - margin)) / margin);

    const sepR = this.len * 1.5;
    const others = world.koi;
    for (let i = 0; i < others.length; i++) {
      const o = others[i];
      if (o === this) continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < sepR * sepR && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const w = (1 - d / sepR) * (this.state === 'sated' ? 2.6 : 1.5);
        fx += (dx / d) * w;
        fy += (dy / d) * w;
      }
    }

    // 轻微群游倾向（让鱼群偶尔同向）
    let alignX = 0, alignY = 0, alignN = 0;
    for (let i = 0; i < others.length; i++) {
      const o = others[i];
      if (o === this) continue;
      const d = Math.hypot(o.x - this.x, o.y - this.y);
      if (d < this.len * 5) { alignX += Math.cos(o.angle); alignY += Math.sin(o.angle); alignN++; }
    }
    if (alignN > 0) {
      fx += (alignX / alignN) * 0.13;
      fy += (alignY / alignN) * 0.13;
    }

    const desiredAngle = Math.atan2(fy, fx);
    this.angle = turnToward(this.angle, desiredAngle, turnRate * dt);
    this.speed += (targetSpeed - this.speed) * clamp(dt * 1.9, 0, 1);

    // ---- 深度 ----
    let targetDepth = this.prefDepth + Math.sin(this.wobble * 0.8 + this.index) * 0.1;
    if (this.state === 'feed') targetDepth = 0.05;
    this.depth += (targetDepth - this.depth) * clamp(dt * 1.1, 0, 1);

    // ---- 积分 ----
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.x = clamp(this.x, pad * 0.6, W - pad * 0.6);
    this.y = clamp(this.y, pad * 0.6, H - pad * 0.6);

    // ---- 尾摆相位 ----
    const spd = this.speed / (0.16 * S);
    this.beat = 1.15 + spd * 3.1;
    this.phase += dt * this.beat;
    this.finPhase += dt * (2.2 + spd * 2.4);
    this.buildSpine();
  }

  /* --------------------------------------------------------- 脊线构建 */
  buildSpine() {
    const N = this.spine.length;
    const L = this.len * 0.90;              // 吻端到尾柄
    const segLen = L / (N - 1);
    const dir = this.angle;
    const noseX = this.x + Math.cos(dir) * this.len * 0.46;
    const noseY = this.y + Math.sin(dir) * this.len * 0.46;

    const spd = clamp(this.speed / (0.16 * this.world.S), 0, 1.2);
    const bendAmp = 0.080 + 0.120 * spd;
    const waves = 0.92;

    let ang = dir + Math.PI;                // 从吻端向尾部推进
    let px = noseX, py = noseY;
    const sp = this.spine, nrm = this.norm, half = this.half;

    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      sp[i].x = px;
      sp[i].y = py;
      half[i] = catmullRom(WIDTH_PROFILE, s) * this.len;
      if (i < N - 1) {
        const bend = bendAmp * Math.sin(TAU * (s * waves - this.phase))
          * (0.09 + 0.91 * s) * (0.55 + 0.45 * spd);
        ang -= bend;
        px += Math.cos(ang) * segLen;
        py += Math.sin(ang) * segLen;
      }
    }

    // 法线
    for (let i = 0; i < N; i++) {
      const a = sp[Math.max(i - 1, 0)];
      const b = sp[Math.min(i + 1, N - 1)];
      let tx = b.x - a.x, ty = b.y - a.y;
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      nrm[i].x = -ty;
      nrm[i].y = tx;
    }
    this.built = true;
  }

  /** (s,t) 体坐标 -> 世界坐标 */
  mapLocal(s, t, out) {
    const N = this.spine.length;
    const fi = clamp(s, 0, 1) * (N - 1);
    const i = Math.min(Math.floor(fi), N - 2);
    const fr = fi - i;
    const p0 = this.spine[i], p1 = this.spine[i + 1];
    const n0 = this.norm[i], n1 = this.norm[i + 1];
    const w = lerp(this.half[i], this.half[i + 1], fr);
    let nx = lerp(n0.x, n1.x, fr);
    let ny = lerp(n0.y, n1.y, fr);
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl; ny /= nl;
    const x = lerp(p0.x, p1.x, fr) + nx * t * w;
    const y = lerp(p0.y, p1.y, fr) + ny * t * w;
    if (out) { out.x = x; out.y = y; return out; }
    return { x, y };
  }

  /* ------------------------------------------------------------- 绘制 */
  draw(ctx) {
    if (!this.built) this.buildSpine();
    const N = this.spine.length;
    const depth = this.depth;
    const scale = 1 - depth * 0.07;
    const L = this.len;

    // 身体轮廓
    const pts = this.bodyPts;
    for (let i = 0; i < N; i++) {
      const p = this.spine[i], n = this.norm[i], w = this.half[i];
      pts[i].x = p.x + n.x * w;
      pts[i].y = p.y + n.y * w;
      const j = 2 * N - 1 - i;
      pts[j].x = p.x - n.x * w;
      pts[j].y = p.y - n.y * w;
    }

    const tailBase = this.spine[N - 1];
    const tailPrev = this.spine[N - 2];
    const tailAng = Math.atan2(tailBase.y - tailPrev.y, tailBase.x - tailPrev.x);

    ctx.save();
    ctx.globalAlpha = 1 - depth * 0.10;

    /* ---- 尾鳍（先画，根部被身体盖住） ---- */
    this.drawTail(ctx, tailBase, tailAng, L, depth);

    /* ---- 胸鳍 ---- */
    this.drawPectorals(ctx, L);

    /* ---- 身体：填充同时投射阴影 ---- */
    const baseCol = this.spec.base;
    ctx.save();
    ctx.shadowColor = `rgba(14,32,38,${0.44 - depth * 0.15})`;
    ctx.shadowBlur = (6 + depth * 18) * (L / 110);
    const sxo = (5 + depth * 10) * (L / 110);
    const syo = (6 + depth * 13) * (L / 110);
    ctx.shadowOffsetX = Math.cos(this.angle + Math.PI * 0.72) * sxo * 0.6 + sxo * 0.5;
    ctx.shadowOffsetY = Math.sin(this.angle + Math.PI * 0.72) * syo * 0.6 + syo * 0.6;
    ctx.fillStyle = baseCol;
    traceClosedSmooth(ctx, pts);
    ctx.fill();
    ctx.restore();

    ctx.save();
    traceClosedSmooth(ctx, pts);
    ctx.clip();

    /* 体色渐变（背脊亮、两侧暗） */
    if (this.spec.metallic) {
      const g = this.makeCrossGradient(ctx, L);
      g.addColorStop(0, rgba(186, 140, 52, 0.45));
      g.addColorStop(0.22, this.spec.base2 || '#c99a3a');
      g.addColorStop(0.44, this.spec.base);
      g.addColorStop(0.52, '#fff3c4');
      g.addColorStop(0.7, this.spec.base2 || '#c99a3a');
      g.addColorStop(1, rgba(150, 112, 40, 0.5));
      ctx.fillStyle = g;
      ctx.fillRect(this.x - L, this.y - L, L * 2, L * 2);
      // 金属闪点
      ctx.fillStyle = 'rgba(255,252,230,0.5)';
      for (let i = 0; i < 18; i++) {
        const s = this.pattern.sparkle[i * 2];
        const t = this.pattern.sparkle[i * 2 + 1];
        const p = this.mapLocal(s, t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, L * 0.006), 0, TAU);
        ctx.fill();
      }
    } else {
      const g = this.makeCrossGradient(ctx, L);
      g.addColorStop(0, 'rgba(40,38,34,0.42)');
      g.addColorStop(0.22, 'rgba(120,112,98,0.10)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.16)');
      g.addColorStop(0.78, 'rgba(120,112,98,0.10)');
      g.addColorStop(1, 'rgba(40,38,34,0.42)');
      ctx.fillStyle = g;
      ctx.fillRect(this.x - L, this.y - L, L * 2, L * 2);
    }

    /* 花纹 */
    for (const blob of this.pattern.blobs) {
      this.drawBlob(ctx, blob);
    }

    /* 背脊高光 */
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(255,253,246,${0.16 - k * 0.045})`;
      ctx.lineWidth = L * (0.20 - k * 0.05);
      ctx.beginPath();
      ctx.moveTo(this.spine[1].x, this.spine[1].y);
      for (let i = 2; i < N - 1; i++) {
        const p = this.spine[i], q = this.spine[i + 1];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) * 0.5, (p.y + q.y) * 0.5);
      }
      ctx.stroke();
    }

    /* 侧线阴影，增加体积感 */
    ctx.strokeStyle = 'rgba(30,34,34,0.22)';
    ctx.lineWidth = Math.max(0.6, L * 0.018);
    ctx.beginPath();
    ctx.moveTo(this.spine[2].x, this.spine[2].y);
    for (let i = 3; i < N; i++) ctx.lineTo(this.spine[i].x, this.spine[i].y);
    ctx.stroke();

    /* 深度水色（越深越被水色包裹） */
    if (depth > 0.02) {
      ctx.fillStyle = `rgba(46,112,128,${depth * 0.22})`;
      ctx.fillRect(this.x - L, this.y - L, L * 2, L * 2);
    }
    ctx.restore();

    /* 轮廓 */
    ctx.strokeStyle = `rgba(28,30,28,${0.30 - depth * 0.1})`;
    ctx.lineWidth = Math.max(0.7, L * 0.016);
    traceClosedSmooth(ctx, pts);
    ctx.stroke();

    /* 头部：眼睛与嘴 */
    this.drawHead(ctx, L);

    ctx.restore();
  }

  makeCrossGradient(ctx, L) {
    const a = this.angle + Math.PI * 0.5;
    const cx = this.x, cy = this.y;
    return ctx.createLinearGradient(
      cx - Math.cos(a) * L * 0.16, cy - Math.sin(a) * L * 0.16,
      cx + Math.cos(a) * L * 0.16, cy + Math.sin(a) * L * 0.16
    );
  }

  drawBlob(ctx, blob) {
    const K = blob.rad.length;
    ctx.fillStyle = blob.color;
    ctx.beginPath();
    for (let i = 0; i <= K; i++) {
      const a = (i / K) * TAU;
      const r = blob.rad[i % K];
      const s = clamp(blob.s0 + Math.cos(a) * blob.rs * r, 0, 1);
      const t = clamp(blob.t0 + Math.sin(a) * blob.rt * r, -1.02, 1.02);
      const p = this.mapLocal(s, t);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
    // 边缘柔化：同色低透明描边
    ctx.strokeStyle = blob.color;
    ctx.lineWidth = Math.max(0.6, this.len * 0.008);
    ctx.stroke();
  }

  drawTail(ctx, base, ang, L, depth) {
    const flap = Math.sin(TAU * (1.0 - this.phase)) * 0.34
      * clamp(this.speed / (0.16 * this.world.S), 0.15, 1.2);
    const a = ang + flap * 0.5;
    const len = L * 0.40;
    const spread = 0.54 + flap * 0.10;
    const root = L * 0.036;

    const dx = Math.cos(a), dy = Math.sin(a);
    const tipL = { x: base.x + Math.cos(a + spread) * len, y: base.y + Math.sin(a + spread) * len };
    const tipR = { x: base.x + Math.cos(a - spread) * len, y: base.y + Math.sin(a - spread) * len };
    const notch = { x: base.x + dx * len * 0.50, y: base.y + dy * len * 0.50 };
    const nx = Math.cos(a + Math.PI * 0.5), ny = Math.sin(a + Math.PI * 0.5);
    const cL = {
      x: base.x + nx * root + Math.cos(a + spread * 0.55) * len * 0.56,
      y: base.y + ny * root + Math.sin(a + spread * 0.55) * len * 0.56,
    };
    const cR = {
      x: base.x - nx * root + Math.cos(a - spread * 0.55) * len * 0.56,
      y: base.y - ny * root + Math.sin(a - spread * 0.55) * len * 0.56,
    };
    const cNotchL = {
      x: (tipL.x + notch.x) * 0.5 + nx * root * 0.5,
      y: (tipL.y + notch.y) * 0.5 + ny * root * 0.5,
    };
    const cNotchR = {
      x: (tipR.x + notch.x) * 0.5 - nx * root * 0.5,
      y: (tipR.y + notch.y) * 0.5 - ny * root * 0.5,
    };

    ctx.beginPath();
    ctx.moveTo(base.x + nx * root, base.y + ny * root);
    ctx.quadraticCurveTo(cL.x, cL.y, tipL.x, tipL.y);
    ctx.quadraticCurveTo(cNotchL.x, cNotchL.y, notch.x, notch.y);
    ctx.quadraticCurveTo(cNotchR.x, cNotchR.y, tipR.x, tipR.y);
    ctx.quadraticCurveTo(cR.x, cR.y, base.x - nx * root, base.y - ny * root);
    ctx.closePath();

    const tint = this.spec.accent || this.spec.base2 || this.spec.base;
    const g = ctx.createLinearGradient(base.x, base.y, notch.x, notch.y);
    g.addColorStop(0, tint);
    g.addColorStop(0.45, tint);
    g.addColorStop(1, 'rgba(255,255,255,0.14)');
    ctx.fillStyle = g;
    ctx.globalAlpha *= 0.86 - depth * 0.12;
    ctx.fill();
    // 鳍条
    ctx.strokeStyle = 'rgba(40,40,36,0.16)';
    ctx.lineWidth = Math.max(0.4, L * 0.005);
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      ctx.beginPath();
      ctx.moveTo(base.x + nx * root * (1 - t), base.y + ny * root * (1 - t));
      ctx.quadraticCurveTo(
        lerp(base.x, tipL.x, t), lerp(base.y, tipL.y, t),
        lerp(notch.x, tipL.x, t * 0.9), lerp(notch.y, tipL.y, t * 0.9)
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(base.x - nx * root * (1 - t), base.y - ny * root * (1 - t));
      ctx.quadraticCurveTo(
        lerp(base.x, tipR.x, t), lerp(base.y, tipR.y, t),
        lerp(notch.x, tipR.x, t * 0.9), lerp(notch.y, tipR.y, t * 0.9)
      );
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30,32,30,0.20)';
    ctx.lineWidth = Math.max(0.5, L * 0.008);
    ctx.stroke();
    ctx.globalAlpha /= 0.86 - depth * 0.12;
  }

  drawPectorals(ctx, L) {
    const N = this.spine.length;
    const spec = this.spec;
    const tint = spec.accent || spec.base2 || spec.base;
    for (const side of [1, -1]) {
      const si = Math.round(N * 0.24);
      const p = this.spine[si];
      const n = this.norm[si];
      const a = this.angle + side * (1.15 + Math.sin(this.finPhase + (side > 0 ? 0 : 1.7)) * 0.34);
      const len = L * (0.215 + Math.sin(this.finPhase * 0.9) * 0.025);
      const rootX = p.x + n.x * this.half[si] * 0.8 * side;
      const rootY = p.y + n.y * this.half[si] * 0.8 * side;
      const tipX = rootX + Math.cos(a) * len;
      const tipY = rootY + Math.sin(a) * len;
      const w = L * 0.072;
      const px = Math.cos(a + Math.PI * 0.5), py = Math.sin(a + Math.PI * 0.5);

      ctx.beginPath();
      ctx.moveTo(rootX + px * w, rootY + py * w);
      ctx.quadraticCurveTo(
        rootX + Math.cos(a) * len * 0.55 + px * w * 1.1,
        rootY + Math.sin(a) * len * 0.55 + py * w * 1.1,
        tipX, tipY
      );
      ctx.quadraticCurveTo(
        rootX + Math.cos(a) * len * 0.55 - px * w * 0.5,
        rootY + Math.sin(a) * len * 0.55 - py * w * 0.5,
        rootX - px * w * 0.7, rootY - py * w * 0.7
      );
      ctx.closePath();
      ctx.globalAlpha *= 0.74;
      ctx.fillStyle = tint;
      ctx.fill();
      ctx.strokeStyle = 'rgba(28,30,28,0.22)';
      ctx.lineWidth = Math.max(0.4, L * 0.006);
      ctx.stroke();
      ctx.globalAlpha /= 0.74;
    }
  }

  drawHead(ctx, L) {
    const N = this.spine.length;
    const si = 2;
    const p = this.spine[si];
    const n = this.norm[si];
    const w = this.half[si];
    const eyeR = Math.max(1.0, L * 0.024);
    for (const side of [1, -1]) {
      const ex = p.x + n.x * w * 0.66 * side;
      const ey = p.y + n.y * w * 0.66 * side;
      // 细长的深色眼，而非圆点
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(this.angle + (side > 0 ? 0.5 : -0.5));
      ctx.fillStyle = 'rgba(24,20,18,0.86)';
      ctx.beginPath();
      ctx.ellipse(0, 0, eyeR * 0.9, eyeR * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,238,0.5)';
      ctx.beginPath();
      ctx.arc(-eyeR * 0.2, -eyeR * 0.16, eyeR * 0.16, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // 吻端
    const nose = this.spine[0];
    const nn = this.norm[0];
    ctx.strokeStyle = 'rgba(40,38,34,0.35)';
    ctx.lineWidth = Math.max(0.6, L * 0.012);
    ctx.beginPath();
    ctx.moveTo(nose.x + nn.x * w * 0.4, nose.y + nn.y * w * 0.4);
    ctx.quadraticCurveTo(
      nose.x + Math.cos(this.angle) * L * 0.045,
      nose.y + Math.sin(this.angle) * L * 0.045,
      nose.x - nn.x * w * 0.4, nose.y - nn.y * w * 0.4
    );
    ctx.stroke();
  }
}

/* ---------------------------------------------------------- 花纹生成 */
function makeRad(rng, n, wob) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = 1 + (rng() - 0.5) * wob;
  // 环形平滑
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (a[(i - 1 + n) % n] + a[i] * 2 + a[(i + 1) % n]) * 0.25;
  }
  return out;
}

function buildPattern(rng, spec) {
  const blobs = [];
  const P = spec.pattern;
  const push = (color, count, sLo, sHi, rsLo, rsHi, rtLo, rtHi, tLo, tHi) => {
    for (let i = 0; i < count; i++) {
      const s0 = rand(rng, sLo, sHi);
      const t0 = rand(rng, tLo, tHi);
      blobs.push({
        color,
        s0,
        t0: clamp(t0, -0.85, 0.85),
        rs: rand(rng, rsLo, rsHi),
        rt: rand(rng, rtLo, rtHi),
        rad: makeRad(rng, 22, 0.42),
      });
    }
  };

  if (P === 'red') {
    push(spec.accent, spec.spots || 3, 0.10, 0.62, 0.055, 0.115, 0.55, 1.0, -0.55, 0.55);
    push('rgba(200,60,30,0.55)', 1, 0.55, 0.8, 0.04, 0.07, 0.4, 0.7, -0.6, 0.6);
  } else if (P === 'tancho') {
    blobs.push({
      color: spec.accent, s0: 0.085, t0: 0, rs: 0.062, rt: 0.8,
      rad: makeRad(rng, 22, 0.3),
    });
  } else if (P === 'redink') {
    push(spec.accent, 3, 0.12, 0.66, 0.05, 0.10, 0.5, 0.95, -0.55, 0.55);
    push(spec.ink, 4, 0.16, 0.72, 0.03, 0.062, 0.28, 0.6, -0.8, 0.8);
  } else if (P === 'inkred') {
    push(spec.ink, 5, 0.06, 0.78, 0.06, 0.135, 0.45, 1.0, -0.7, 0.7);
    push(spec.accent, 3, 0.12, 0.6, 0.04, 0.085, 0.4, 0.8, -0.6, 0.6);
  } else if (P === 'ink') {
    push(spec.ink, 5, 0.08, 0.76, 0.045, 0.105, 0.4, 0.95, -0.7, 0.7);
  } else if (P === 'whiteonink') {
    push(spec.accent, 4, 0.1, 0.74, 0.05, 0.11, 0.45, 1.0, -0.7, 0.7);
  }

  // 金属鳞片闪点
  const sparkle = new Float32Array(26 * 2);
  for (let i = 0; i < 18; i++) {
    sparkle[i * 2] = rand(rng, 0.08, 0.9);
    sparkle[i * 2 + 1] = rand(rng, -0.85, 0.85);
  }
  return { blobs, sparkle };
}
