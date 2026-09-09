/* ============================================================
 * utils.ts — small math / formatting helpers
 * ============================================================ */

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Frame-rate independent exponential smoothing. */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** Deterministic 32-bit PRNG (mulberry32). */
export class RNG {
  private s: number;
  constructor(seed = 1) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length) % arr.length];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
}

/** 12.34 -> "12.34" ; 72.5 -> "1:12.50" */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--:--.--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds * 100) % 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs
    .toString()
    .padStart(2, '0')}`;
}

export function ordinal(n: number): string {
  return `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 3 && n % 100 < 21 ? 0 : Math.min(n % 10, 3)]}`;
}

/** Shortest signed delta between two angles. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Wrap a track distance into [0, length). */
export function wrapDist(s: number, length: number): number {
  let r = s % length;
  if (r < 0) r += length;
  return r;
}

/** Shortest signed distance from a to b on a loop of the given length. */
export function loopDelta(a: number, b: number, length: number): number {
  return angleDelta((a / length) * Math.PI * 2, (b / length) * Math.PI * 2) * (length / (Math.PI * 2));
}
