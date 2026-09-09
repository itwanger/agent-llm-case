import * as THREE from 'three';

/**
 * 补间小工具：用来做积木飞入、皮球抱起来这类道具动画。
 */
export class Tweens {
  constructor() {
    this.list = [];
  }

  add(opts) {
    const tw = {
      dur: 1,
      delay: 0,
      ease: easeInOut,
      arc: 0,
      t: 0,
      ...opts,
      from: opts.from.clone(),
      to: opts.to.clone(),
    };
    tw.current = tw.from.clone();
    this.list.push(tw);
    return tw;
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (tw.delay > 0) {
        tw.delay -= dt;
        continue;
      }
      tw.t = Math.min(tw.dur, tw.t + dt);
      const k = tw.ease(tw.t / tw.dur);
      tw.current.lerpVectors(tw.from, tw.to, k);
      if (tw.arc) tw.current.y += Math.sin(k * Math.PI) * tw.arc;
      if (tw.onUpdate) tw.onUpdate(tw.current, k);
      if (tw.t >= tw.dur) {
        this.list.splice(i, 1);
        if (tw.onDone) tw.onDone();
      }
    }
  }

  clear() {
    this.list.length = 0;
  }
}

export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t;
export const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smoothstep = (t) => t * t * (3 - 2 * t);

/** 与帧率无关的指数平滑 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** 角度平滑（处理 -π/π 环绕） */
export function dampAngle(current, target, lambda, dt) {
  let d = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return current + d * (1 - Math.exp(-lambda * dt));
}

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
