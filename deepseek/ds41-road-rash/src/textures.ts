/* ============================================================
 * textures.ts — procedural canvas textures (no image assets)
 * ============================================================ */

import * as THREE from 'three';
import { RNG } from './utils';

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finish(c: HTMLCanvasElement, repeat: number, anisotropy = 4): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function grain(
  ctx: CanvasRenderingContext2D,
  size: number,
  base: [number, number, number],
  amp: number,
  seed: number,
  cell = 1,
): void {
  const rng = new RNG(seed);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const n = (rng.next() - 0.5) * amp;
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const i = ((y + dy) * size + (x + dx)) * 4;
          if (i >= d.length) continue;
          d[i] = Math.max(0, Math.min(255, base[0] + n));
          d[i + 1] = Math.max(0, Math.min(255, base[1] + n));
          d[i + 2] = Math.max(0, Math.min(255, base[2] + n));
          d[i + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function asphaltTexture(): THREE.CanvasTexture {
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#3a3a42';
  ctx.fillRect(0, 0, size, size);
  grain(ctx, size, [58, 58, 66], 34, 5, 1);

  // tar patches / cracks
  const rng = new RNG(91);
  ctx.strokeStyle = 'rgba(24,24,30,0.85)';
  for (let i = 0; i < 26; i++) {
    ctx.lineWidth = rng.range(0.6, 2.4);
    ctx.beginPath();
    let x = rng.range(0, size);
    let y = rng.range(0, size);
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += rng.range(-40, 40);
      y += rng.range(-40, 40);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30,30,36,0.5)';
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.ellipse(
      rng.range(0, size),
      rng.range(0, size),
      rng.range(8, 40),
      rng.range(6, 26),
      rng.range(0, Math.PI),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  return finish(c, 1, 8);
}

export function dirtTexture(): THREE.CanvasTexture {
  const size = 128;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#8a6a3f';
  ctx.fillRect(0, 0, size, size);
  grain(ctx, size, [138, 106, 63], 52, 17, 1);
  const rng = new RNG(33);
  ctx.fillStyle = 'rgba(96,72,40,0.6)';
  for (let i = 0; i < 90; i++) {
    ctx.beginPath();
    ctx.arc(rng.range(0, size), rng.range(0, size), rng.range(1, 4), 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c, 1, 8);
}

export function grassTexture(): THREE.CanvasTexture {
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#4f7a35';
  ctx.fillRect(0, 0, size, size);
  grain(ctx, size, [79, 122, 53], 46, 71, 1);
  const rng = new RNG(101);
  for (let i = 0; i < 900; i++) {
    ctx.strokeStyle = rng.chance(0.5) ? 'rgba(110,160,70,0.5)' : 'rgba(50,80,35,0.5)';
    ctx.lineWidth = 1;
    const x = rng.range(0, size);
    const y = rng.range(0, size);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rng.range(-2, 2), y - rng.range(2, 6));
    ctx.stroke();
  }
  return finish(c, 1, 8);
}

export function skyTexture(top: number, bottom: number): THREE.CanvasTexture {
  const w = 8;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const ct = new THREE.Color(top);
  const cb = new THREE.Color(bottom);
  g.addColorStop(0, `#${ct.getHexString()}`);
  g.addColorStop(0.42, `#${ct.clone().lerp(cb, 0.35).getHexString()}`);
  g.addColorStop(0.62, `#${cb.getHexString()}`);
  g.addColorStop(0.72, `#${cb.clone().lerp(new THREE.Color(0xffd9a0), 0.5).getHexString()}`);
  g.addColorStop(1, `#${cb.getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
