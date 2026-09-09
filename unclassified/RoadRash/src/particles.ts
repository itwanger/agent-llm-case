import * as THREE from 'three';

interface P {
  life: number;
  max: number;
  vx: number;
  vy: number;
  vz: number;
}

export class Particles {
  readonly max = 240;
  private points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private pool: P[] = [];
  private cursor = 0;
  private geo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);
    for (let i = 0; i < this.max; i++) {
      this.pool.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0 });
      this.pos[i * 3 + 1] = -999;
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(p: THREE.Vector3, color: THREE.Color, count: number, speed: number, up = 3) {
    for (let k = 0; k < count; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const q = this.pool[i];
      q.life = q.max = 0.35 + Math.random() * 0.3;
      q.vx = (Math.random() - 0.5) * speed;
      q.vy = Math.random() * up;
      q.vz = (Math.random() - 0.5) * speed;
      this.pos[i * 3] = p.x;
      this.pos[i * 3 + 1] = p.y;
      this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = color.r;
      this.col[i * 3 + 1] = color.g;
      this.col[i * 3 + 2] = color.b;
    }
    this.geo.attributes.color.needsUpdate = true;
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      const q = this.pool[i];
      if (q.life <= 0) continue;
      q.life -= dt;
      if (q.life <= 0) {
        this.pos[i * 3 + 1] = -999;
        continue;
      }
      q.vy -= 9 * dt;
      this.pos[i * 3] += q.vx * dt;
      this.pos[i * 3 + 1] += q.vy * dt;
      this.pos[i * 3 + 2] += q.vz * dt;
      const f = q.life / q.max;
      this.col[i * 3] *= 0.96 + 0.04 * f;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  clear() {
    for (let i = 0; i < this.max; i++) {
      this.pool[i].life = 0;
      this.pos[i * 3 + 1] = -999;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
