/* ------------------------------------------------------------------ *
 *  food.js — 鱼食颗粒
 *  落水后先浮于水面轻轻打转，随后缓慢下沉，可被锦鲤吃掉。
 * ------------------------------------------------------------------ */

import { TAU, clamp, rand, rgba } from './util.js';

export class FoodField {
  constructor(rng) {
    this.rng = rng;
    this.pellets = [];
    this.eaten = 0;
    this.fed = 0;
  }

  reset() {
    this.pellets.length = 0;
    this.eaten = 0;
    this.fed = 0;
  }

  get count() {
    let n = 0;
    for (const p of this.pellets) if (!p.dead) n++;
    return n;
  }

  /** 在 (x,y) 处投下一小簇鱼食 */
  feed(x, y, S) {
    const rng = this.rng;
    const n = 4 + Math.floor(rng() * 4);
    const spread = S * 0.026;
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU;
      const d = Math.sqrt(rng()) * spread;
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      this.pellets.push({
        x: px,
        y: py,
        vx: Math.cos(a) * S * 0.004,
        vy: Math.sin(a) * S * 0.004,
        r: S * rand(rng, 0.0034, 0.0056),
        depth: 0,
        sinkDelay: rand(rng, 1.1, 2.8),
        sinkRate: rand(rng, 0.035, 0.075),
        phase: rng() * TAU,
        spin: rand(rng, 0.6, 1.8) * (rng() < 0.5 ? -1 : 1),
        age: 0,
        dead: false,
        tint: rand(rng, -0.12, 0.12),
      });
      this.fed++;
    }
    return n;
  }

  update(dt, S) {
    const list = this.pellets;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (p.dead) { list.splice(i, 1); continue; }
      p.age += dt;
      p.phase += dt * p.spin;
      // 水面漂移衰减
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.02, dt);
      p.vy *= Math.pow(0.02, dt);

      if (p.age > p.sinkDelay) {
        p.depth += p.sinkRate * dt;
        if (p.depth >= 1) {
          p.depth = 1;
          // 沉底后慢慢化开
          p.dissolve = (p.dissolve || 0) + dt;
          if (p.dissolve > 24) p.dead = true;
        }
      }
      // 越界移除
      if (p.x < -S * 0.1 || p.y < -S * 0.1) p.dead = true;
    }
  }

  draw(ctx, S, time) {
    const list = this.pellets;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.dead) continue;
      const d = clamp(p.depth, 0, 1);
      const bob = Math.sin(time * 2.2 + p.phase) * S * 0.0012 * (1 - d);
      const x = p.x + bob * 0.7;
      const y = p.y + bob;
      const r = Math.max(0.7, p.r * (1 - d * 0.26));
      const alpha = (1 - d * 0.34) * (1 - clamp((p.dissolve || 0) / 24, 0, 1) * 0.9);

      // 水面张力形成的暗圈
      if (d < 0.55) {
        const ringA = (1 - d / 0.55) * 0.3;
        ctx.strokeStyle = `rgba(20,44,50,${ringA})`;
        ctx.lineWidth = Math.max(0.6, r * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, r * 1.85, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = `rgba(240,252,255,${ringA * 0.5})`;
        ctx.lineWidth = Math.max(0.5, r * 0.3);
        ctx.beginPath();
        ctx.arc(x, y, r * 2.25, 0, TAU);
        ctx.stroke();
      }

      // 颗粒本体
      const rr = 150 + p.tint * 200;
      const gg = 96 + p.tint * 120;
      const bb = 44 + p.tint * 60;
      const water = d * 0.4;
      const cr = rr * (1 - water) + 46 * water;
      const cg = gg * (1 - water) + 96 * water;
      const cb = bb * (1 - water) + 108 * water;
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.15);
      g.addColorStop(0, rgba(cr + 78, cg + 62, cb + 40, alpha));
      g.addColorStop(0.55, rgba(cr, cg, cb, alpha));
      g.addColorStop(1, rgba(cr * 0.55, cg * 0.52, cb * 0.5, alpha * 0.95));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();

      // 高光
      ctx.fillStyle = `rgba(255,248,224,${alpha * 0.55 * (1 - d * 0.5)})`;
      ctx.beginPath();
      ctx.arc(x - r * 0.32, y - r * 0.36, r * 0.36, 0, TAU);
      ctx.fill();

      // 落底阴影
      if (d > 0.6) {
        ctx.fillStyle = `rgba(24,34,32,${(d - 0.6) * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(x + r * 0.5, y + r * 0.6, r * 1.05, r * 0.7, 0.5, 0, TAU);
        ctx.fill();
      }
    }
  }
}
