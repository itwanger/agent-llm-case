/* ============================================================
 * particles.ts — pooled GPU point sprites (sparks, dust, smoke)
 * ============================================================ */

import * as THREE from 'three';
import { RNG } from './utils';

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aSize > 0.0001 ? 1.0 : 0.0;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.5) discard;
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    float a = smoothstep(0.5, 0.06, r);
    if (a <= 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

interface P {
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  shrink: number;
  r: number;
  g: number;
  b: number;
  drag: number;
  gravity: number;
}

export class ParticleSystem {
  readonly points: THREE.Points;
  private pool: P[] = [];
  private cursor = 0;
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private col: Float32Array;
  private siz: Float32Array;
  private rng = new RNG(9001);

  constructor(private max = 900, blending: THREE.Blending = THREE.AdditiveBlending) {
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.siz = new Float32Array(max);
    for (let i = 0; i < max; i++) {
      this.pool.push({
        life: 0,
        maxLife: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        size: 0,
        shrink: 1,
        r: 1,
        g: 1,
        b: 1,
        drag: 2,
        gravity: 0,
      });
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending,
    });
    this.points = new THREE.Points(this.geo, material);
    this.points.frustumCulled = false;
  }

  private spawnIndex(): number {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    return i;
  }

  emit(
    origin: THREE.Vector3,
    count: number,
    opts: {
      speed?: [number, number];
      size?: [number, number];
      life?: [number, number];
      color?: number | number[];
      spread?: number;
      dir?: THREE.Vector3;
      drag?: number;
      gravity?: number;
      shrink?: number;
      upBias?: number;
    } = {},
  ): void {
    const speed = opts.speed ?? [1, 4];
    const size = opts.size ?? [0.08, 0.22];
    const life = opts.life ?? [0.25, 0.7];
    const spread = opts.spread ?? 1;
    const colors = Array.isArray(opts.color) ? opts.color : [opts.color ?? 0xffffff];
    const dir = opts.dir;
    const c = new THREE.Color();

    for (let k = 0; k < count; k++) {
      const i = this.spawnIndex();
      const p = this.pool[i];
      p.life = p.maxLife = this.rng.range(life[0], life[1]);
      const sp = this.rng.range(speed[0], speed[1]);
      let dx = this.rng.range(-1, 1) * spread;
      let dy = this.rng.range(-1, 1) * spread + (opts.upBias ?? 0);
      let dz = this.rng.range(-1, 1) * spread;
      if (dir) {
        dx += dir.x;
        dy += dir.y;
        dz += dir.z;
      }
      const len = Math.hypot(dx, dy, dz) || 1;
      p.vx = (dx / len) * sp;
      p.vy = (dy / len) * sp;
      p.vz = (dz / len) * sp;
      p.size = this.rng.range(size[0], size[1]);
      p.shrink = opts.shrink ?? 1;
      p.drag = opts.drag ?? 2.2;
      p.gravity = opts.gravity ?? 0;
      c.setHex(this.rng.pick(colors));
      p.r = c.r;
      p.g = c.g;
      p.b = c.b;
      this.pos[i * 3] = origin.x;
      this.pos[i * 3 + 1] = origin.y;
      this.pos[i * 3 + 2] = origin.z;
      this.siz[i] = p.size;
      this.col[i * 3] = p.r;
      this.col[i * 3 + 1] = p.g;
      this.col[i * 3 + 2] = p.b;
    }
  }

  update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      dirty = true;
      if (p.life <= 0) {
        this.siz[i] = 0;
        continue;
      }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vz *= d;
      p.vy = p.vy * d - p.gravity * dt;
      this.pos[i * 3] += p.vx * dt;
      this.pos[i * 3 + 1] += p.vy * dt;
      this.pos[i * 3 + 2] += p.vz * dt;
      const t = p.life / p.maxLife;
      this.siz[i] = p.size * (p.shrink === 1 ? t : Math.pow(t, p.shrink));
    }
    if (dirty) {
      (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (this.geo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  clear(): void {
    for (let i = 0; i < this.max; i++) {
      this.pool[i].life = 0;
      this.siz[i] = 0;
    }
    (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
  }
}
