/* ------------------------------------------------------------------ *
 *  water.js — 水面波动模拟 / 折射扭曲 / 焦散与高光
 *
 *  高度场用二维波动方程在低分辨率网格上演算（CPU），
 *  再用于：1) 网格化折射位移  2) 焦散(-拉普拉斯)  3) 镜面高光(梯度)
 * ------------------------------------------------------------------ */

import { clamp } from './util.js';

export class Water {
  constructor({ gw = 192, gh = 108 } = {}) {
    this.gw = 0;
    this.gh = 0;
    this.light = document.createElement('canvas');
    this.lightCtx = this.light.getContext('2d', { willReadFrequently: false });
    this.img = null;
    this.resize(gw, gh);

    // 位移强度（画布像素 / 单位梯度）
    this.refract = 55;
    // 焦散 / 高光增益
    this.causticGain = 11;
    this.specGain = 0.62;
    this.damp = 0.989;      // 速度阻尼
    this.leak = 0.999;      // 幅度泄漏（抑制低频驻波堆积）
    this.k = 0.26;
    this.clampH = 1.5;

    this.meanGx = 0;
    this.meanGy = 0;
    this.maxGrad = 0;
    this.energy = 0;

    // 环境微澜
    this.ambientTimer = 0;
    this.ambientRate = 1.15;
  }

  resize(gw, gh) {
    gw = Math.max(32, gw | 0);
    gh = Math.max(24, gh | 0);
    if (gw === this.gw && gh === this.gh) return;
    this.gw = gw;
    this.gh = gh;
    const n = gw * gh;
    this.hCur = new Float32Array(n);
    this.hPrev = new Float32Array(n);
    this.hNext = new Float32Array(n);
    this.hBlur = new Float32Array(n);
    this.hScratch = new Float32Array(n);
    this.light.width = gw;
    this.light.height = gh;
    this.img = this.lightCtx.createImageData(gw, gh);
    const d = this.img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = 255;
    this.ambientTimer = 0;
  }

  reset() {
    this.hCur.fill(0);
    this.hPrev.fill(0);
    this.hNext.fill(0);
    this.hBlur.fill(0);
    this.hScratch.fill(0);
    this.ambientTimer = 0;
    this.maxGrad = 0;
    this.energy = 0;
  }

  /** 在网格坐标处投下一颗“水滴”（同心圆扩散） */
  splash(gx, gy, radius, strength) {
    const { gw, gh, hCur } = this;
    const r = Math.max(1.2, radius);
    const x0 = Math.max(1, Math.floor(gx - r * 2.4));
    const x1 = Math.min(gw - 2, Math.ceil(gx + r * 2.4));
    const y0 = Math.max(1, Math.floor(gy - r * 2.4));
    const y1 = Math.min(gh - 2, Math.ceil(gy + r * 2.4));
    const inv = 1 / (r * r * 1.7);
    for (let y = y0; y <= y1; y++) {
      const dy = y - gy;
      const row = y * gw;
      for (let x = x0; x <= x1; x++) {
        const dx = x - gx;
        const d2 = (dx * dx + dy * dy) * inv;
        if (d2 > 6) continue;
        hCur[row + x] += strength * Math.exp(-d2);
      }
    }
  }

  /** 拖拽拨水：偶极子，制造有方向的尾波 */
  stir(gx, gy, vgx, vgy, strength) {
    const amp = clamp(strength, 0, 1.6);
    if (amp < 0.004) return;
    const tx = gx - vgx * 1.35;
    const ty = gy - vgy * 1.35;
    this.splash(gx, gy, 2.6, amp);
    this.splash(tx, ty, 2.9, -amp * 0.72);
  }

  /** 固定步长推进一步 */
  step(dt) {
    const { gw, gh, hCur, hPrev, hNext, k, damp, leak, clampH } = this;
    const d = Math.pow(damp, dt * 60);
    const lk = Math.pow(leak, dt * 60);
    const kk = k * clamp(dt * 60, 0.2, 2);
    for (let y = 1; y < gh - 1; y++) {
      const row = y * gw;
      for (let x = 1; x < gw - 1; x++) {
        const i = row + x;
        const c = hCur[i];
        const lap = hCur[i - 1] + hCur[i + 1] + hCur[i - gw] + hCur[i + gw] - 4 * c;
        const v = (c + (c - hPrev[i]) * d + kk * lap) * lk;
        hNext[i] = v > clampH ? clampH : v < -clampH ? -clampH : v;
      }
    }
    // 边界：反射
    for (let x = 0; x < gw; x++) {
      hNext[x] = hNext[gw + x];
      hNext[(gh - 1) * gw + x] = hNext[(gh - 2) * gw + x];
    }
    for (let y = 0; y < gh; y++) {
      hNext[y * gw] = hNext[y * gw + 1];
      hNext[y * gw + gw - 1] = hNext[y * gw + gw - 2];
    }
    this.hCur = hNext;
    this.hNext = hPrev;
    this.hPrev = hCur;
  }

  /** 环境微澜：静水也保持呼吸感 */
  ambient(dt, rng) {
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = this.ambientRate * (0.6 + rng() * 0.9);
      this.splash(
        2 + rng() * (this.gw - 4),
        2 + rng() * (this.gh - 4),
        1.4 + rng() * 2.6,
        (0.028 + rng() * 0.085) * (rng() < 0.5 ? 1 : -1)
      );
    }
  }

  /** 分离式盒式模糊（给折射网格用的平滑场） */
  blurField(src, passes) {
    const { gw, gh, hBlur, hScratch } = this;
    let a = src;
    for (let p = 0; p < passes; p++) {
      // 横向：a -> hBlur
      for (let y = 0; y < gh; y++) {
        const row = y * gw;
        for (let x = 1; x < gw - 1; x++) {
          const i = row + x;
          hBlur[i] = (a[i - 1] + a[i] * 2 + a[i + 1]) * 0.25;
        }
        hBlur[row] = a[row];
        hBlur[row + gw - 1] = a[row + gw - 1];
      }
      // 纵向：hBlur -> hScratch
      for (let x = 0; x < gw; x++) {
        for (let y = 1; y < gh - 1; y++) {
          const i = y * gw + x;
          hScratch[i] = (hBlur[i - gw] + hBlur[i] * 2 + hBlur[i + gw]) * 0.25;
        }
        hScratch[x] = hBlur[x];
        hScratch[(gh - 1) * gw + x] = hBlur[(gh - 1) * gw + x];
      }
      a = hScratch;
    }
    return a;
  }

  /**
   * 生成光照缓冲：RGB 通道存 焦散 / 高光，随后以 lighter 叠加。
   * 同时统计平均梯度（供焦散层漂移）与最大梯度（供质量自适应）。
   */
  updateLighting() {
    const { gw, gh, hCur, img } = this;
    // 平滑场（折射网格用）
    const smooth = this.blurField(hCur, 2);
    this.smooth = smooth;

    const data = img.data;
    const causticGain = this.causticGain;
    const specGain = this.specGain;
    // 光照方向（左上来的阳光）
    const lx = 0.46, ly = 0.54, lz = 0.70;
    const ll = Math.hypot(lx, ly, lz);
    const Lx = lx / ll, Ly = ly / ll, Lz = lz / ll;
    const NS = 3.1;

    let sumGx = 0, sumGy = 0, maxGrad = 0, energy = 0;
    const invArea = 1 / (gw * gh);

    for (let y = 1; y < gh - 1; y++) {
      const row = y * gw;
      for (let x = 1; x < gw - 1; x++) {
        const i = row + x;
        const c = hCur[i];
        const hl = hCur[i - 1], hr = hCur[i + 1];
        const hu = hCur[i - gw], hd = hCur[i + gw];
        const hx = (hr - hl) * 0.5;
        const hy = (hd - hu) * 0.5;
        const lap = hl + hr + hu + hd - 4 * c;

        // 焦散：波峰汇聚光线
        let cau = -lap * causticGain;
        cau = cau > 0 ? cau : 0;
        if (cau > 1.4) cau = 1.4;
        // 波峰本身的柔光
        const crest = c > 0 ? c : 0;

        // 镜面高光
        const nx = hx * NS, ny = hy * NS;
        const nl = Math.sqrt(nx * nx + ny * ny + 1);
        let dot = (nx * Lx + ny * Ly + Lz) / nl;
        if (dot < 0) dot = 0;
        const slope = Math.hypot(hx, hy);
        let spec = Math.pow(dot, 11) * Math.min(1, slope * 9.0) * specGain;

        const gx = smooth[i + 1] - smooth[i - 1];
        const gy = smooth[i + gw] - smooth[i - gw];
        sumGx += gx; sumGy += gy;
        const gm = Math.abs(hx) + Math.abs(hy);
        if (gm > maxGrad) maxGrad = gm;
        energy += Math.abs(c);

        const lum = cau * 1.0 + crest * 0.55 + spec * 0.35;
        const o = i * 4;
        data[o] = Math.min(255, lum * 255 * 1.0 + spec * 90);
        data[o + 1] = Math.min(255, lum * 255 * 0.965 + spec * 120);
        data[o + 2] = Math.min(255, lum * 255 * 0.82 + spec * 150);
        data[o + 3] = 255;
      }
    }
    this.meanGx = sumGx * invArea;
    this.meanGy = sumGy * invArea;
    this.maxGrad = maxGrad;
    this.energy = energy * invArea;

    // 柔化，让焦散像光而不是像素
    blurRGB(data, gw, gh, 1);
    this.lightCtx.putImageData(img, 0, 0);
  }

  /**
   * 折射扭曲：把场景按平滑高度场的梯度做网格位移。
   * 先铺一层未扭曲的底图填补缝隙，再逐格偏移绘制。
   */
  warp(src, ctx, W, H, tile) {
    const { gw, gh, smooth } = this;
    const strength = this.refract;
    tile = tile || 48;
    const cols = Math.ceil(W / tile);
    const rows = Math.ceil(H / tile);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // 相邻格子互相重叠 1px，避免位移差造成缝隙（无需额外底图）
    const pad = 1;
    for (let j = 0; j < rows; j++) {
      const dy0 = j * tile;
      const dh = Math.min(tile, H - dy0);
      const gy = clamp(Math.round(((dy0 + dh * 0.5) / H) * (gh - 1)), 1, gh - 2);
      const row = gy * gw;
      for (let i = 0; i < cols; i++) {
        const dx0 = i * tile;
        const dw = Math.min(tile, W - dx0);
        const gx = clamp(Math.round(((dx0 + dw * 0.5) / W) * (gw - 1)), 1, gw - 2);
        const idx = row + gx;
        const hx = (smooth[idx + 1] - smooth[idx - 1]) * 0.5;
        const hy = (smooth[idx + gw] - smooth[idx - gw]) * 0.5;
        let ox = hx * strength;
        let oy = hy * strength;
        if (ox > 9) ox = 9; else if (ox < -9) ox = -9;
        if (oy > 9) oy = 9; else if (oy < -9) oy = -9;
        const sw = dw + pad * 2, sh = dh + pad * 2;
        let sx = dx0 + ox - pad;
        let sy = dy0 + oy - pad;
        if (sx < 0) sx = 0; else if (sx > W - sw) sx = W - sw;
        if (sy < 0) sy = 0; else if (sy > H - sh) sy = H - sh;
        ctx.drawImage(src, sx, sy, sw, sh, dx0 - pad, dy0 - pad, sw, sh);
      }
    }
  }
}

/* --------------------------------------------------------- RGB 分离模糊 */
function blurRGB(data, w, h, passes) {
  const tmp = new Float32Array(w * h * 3);
  for (let p = 0; p < passes; p++) {
    // 横向
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        const a = i > row ? (i - 1) * 4 : i * 4;
        const b = i * 4;
        const c = x < w - 1 ? (i + 1) * 4 : i * 4;
        const o = i * 3;
        tmp[o] = (data[a] + data[b] * 2 + data[c]) * 0.25;
        tmp[o + 1] = (data[a + 1] + data[b + 1] * 2 + data[c + 1]) * 0.25;
        tmp[o + 2] = (data[a + 2] + data[b + 2] * 2 + data[c + 2]) * 0.25;
      }
    }
    // 纵向
    for (let y = 0; y < h; y++) {
      const row = y * w;
      const up = (y > 0 ? y - 1 : y) * w;
      const dn = (y < h - 1 ? y + 1 : y) * w;
      for (let x = 0; x < w; x++) {
        const i = row + x;
        const t = (up + x) * 3;
        const m = i * 3;
        const b = (dn + x) * 3;
        data[i * 4] = (tmp[t] + tmp[m] * 2 + tmp[b]) * 0.25;
        data[i * 4 + 1] = (tmp[t + 1] + tmp[m + 1] * 2 + tmp[b + 1]) * 0.25;
        data[i * 4 + 2] = (tmp[t + 2] + tmp[m + 2] * 2 + tmp[b + 2]) * 0.25;
      }
    }
  }
}

/* ------------------------------------------------------------- 焦散贴片 */
/**
 * 无缝可平铺的程序化焦散图案：四族波动正弦的零交叉脊线相互交织，
 * 形成真实水面那种“光网”。整数谐波保证接缝。
 */
export function makeCausticTile(size = 256, seed = 3) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const TAU = Math.PI * 2;
  const ridge = (s, k) => {
    const a = 1 - Math.abs(s);
    return a > 0 ? Math.pow(a, k) : 0;
  };
  const s1 = 0.7 + seed * 0.11;
  const s2 = 1.3 + seed * 0.07;
  for (let y = 0; y < size; y++) {
    const v = (y / size) * TAU;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * TAU;
      const A = Math.sin(u * 4 + Math.sin(v * 2 + s1) * 1.9 + Math.sin(v * 5) * 0.7);
      const B = Math.sin(v * 6 + Math.sin(u * 4 + s2) * 1.7 + Math.sin(u * 8) * 0.6);
      const C = Math.sin((u * 5 + v * 4) + Math.sin(u * 3 - v * 6) * 1.5);
      const D = Math.sin((u * 7 - v * 5) + Math.sin(u * 4 + v * 3) * 1.4);
      let c = ridge(A, 10) + ridge(B, 10) + 0.72 * ridge(C, 9) + 0.5 * ridge(D, 9);
      if (c > 1.6) c = 1.6;
      const lum = c * 168;
      const o = (y * size + x) * 4;
      d[o] = Math.min(255, lum * 0.80);
      d[o + 1] = Math.min(255, lum * 0.95);
      d[o + 2] = Math.min(255, lum * 1.0);
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
