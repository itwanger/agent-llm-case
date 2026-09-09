/* ============================================================
 * scenery.ts — roadside props, all instanced for performance
 * ============================================================ */

import * as THREE from 'three';
import { CONFIG } from './config';
import { RNG } from './utils';
import { Track } from './track';
import {
  buildBarrierGeo,
  buildBushGeo,
  buildRockGeo,
  buildSign,
  buildTreeKit,
  mat,
} from './models';

export class Scenery {
  readonly group = new THREE.Group();
  readonly colliders: Array<{ s: number; x: number; radius: number }> = [];
  private readonly bucketSize = 30;
  private readonly buckets = new Map<number, Array<{ s: number; x: number; radius: number }>>();

  constructor(private track: Track) {
    this.buildTrees();
    this.buildRocks();
    this.buildBushes();
    this.buildSigns();
    this.buildBarriers();

    for (const c of this.colliders) {
      const b = Math.floor(c.s / this.bucketSize);
      let list = this.buckets.get(b);
      if (!list) this.buckets.set(b, (list = []));
      list.push(c);
    }
  }

  /** Colliders near a track distance (checks the 3 neighbouring buckets). */
  query(s: number, out: Array<{ s: number; x: number; radius: number }>): void {
    out.length = 0;
    const b = Math.floor(s / this.bucketSize);
    for (let i = b - 1; i <= b + 1; i++) {
      const list = this.buckets.get(i);
      if (list) out.push(...list);
    }
  }

  private place(
    s: number,
    x: number,
    out = new THREE.Vector3(),
  ): { pos: THREE.Vector3; yaw: number } {
    const sm = this.track.sample(s);
    const absX = Math.abs(x);
    const dy = this.track.groundOffset(absX);
    out.copy(sm.pos).addScaledVector(sm.right, x).addScaledVector(sm.up, dy);
    return { pos: out, yaw: sm.yaw };
  }

  private buildTrees(): void {
    const rng = new RNG(CONFIG.road.treeSeed);
    const kits = [buildTreeKit(0), buildTreeKit(1), buildTreeKit(2)];
    const buckets: Array<Array<{ s: number; x: number; sc: number; rot: number }>> = [[], [], []];

    const step = 13;
    const edge = this.track.halfWidth + this.track.shoulder;
    for (let s = 0; s < this.track.length; s += step) {
      for (const side of [-1, 1]) {
        if (!rng.chance(0.82)) continue;
        const count = rng.int(1, 2);
        for (let k = 0; k < count; k++) {
          const x = side * (edge + rng.range(3.5, 46));
          const kind = rng.chance(0.5) ? 0 : rng.chance(0.6) ? 1 : 2;
          buckets[kind].push({
            s: s + rng.range(-4, 4),
            x,
            sc: rng.range(0.72, 1.45),
            rot: rng.range(0, Math.PI * 2),
          });
        }
      }
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    kits.forEach((kit, kind) => {
      const list = buckets[kind];
      if (!list.length) return;
      const trunkMat = mat(0x5a3d21, { flat: true });
      const leafMat = mat(0xffffff, { flat: true });
      const trunkIM = new THREE.InstancedMesh(kit.trunk, trunkMat, list.length);
      const leafIM = new THREE.InstancedMesh(kit.leaf, leafMat, list.length);
      trunkIM.castShadow = true;
      leafIM.castShadow = true;
      trunkIM.receiveShadow = false;
      leafIM.receiveShadow = false;

      list.forEach((it, i) => {
        const { pos, yaw } = this.place(it.s, it.x);
        dummy.position.copy(pos);
        dummy.rotation.set(0, yaw + it.rot, 0);
        dummy.scale.setScalar(it.sc);
        dummy.updateMatrix();
        trunkIM.setMatrixAt(i, dummy.matrix);
        leafIM.setMatrixAt(i, dummy.matrix);
        color.setHex(kit.leafColors[Math.floor((i * 7 + kind * 3) % kit.leafColors.length)]);
        color.offsetHSL(0, 0, ((i % 5) - 2) * 0.02);
        leafIM.setColorAt(i, color);
        this.colliders.push({ s: it.s, x: it.x, radius: 0.55 * it.sc });
      });
      trunkIM.instanceMatrix.needsUpdate = true;
      leafIM.instanceMatrix.needsUpdate = true;
      if (leafIM.instanceColor) leafIM.instanceColor.needsUpdate = true;
      this.group.add(trunkIM, leafIM);
    });
  }

  private buildRocks(): void {
    const rng = new RNG(777);
    const geo = buildRockGeo();
    const list: Array<{ s: number; x: number; sc: number }> = [];
    const edge = this.track.halfWidth + this.track.shoulder;
    for (let s = 0; s < this.track.length; s += 34) {
      for (const side of [-1, 1]) {
        if (!rng.chance(0.6)) continue;
        list.push({
          s: s + rng.range(-10, 10),
          x: side * (edge + rng.range(2, 30)),
          sc: rng.range(0.6, 2.4),
        });
      }
    }
    const im = new THREE.InstancedMesh(geo, mat(0x8a8577, { flat: true }), list.length);
    im.castShadow = true;
    im.receiveShadow = true;
    const dummy = new THREE.Object3D();
    list.forEach((it, i) => {
      const { pos, yaw } = this.place(it.s, it.x);
      dummy.position.copy(pos);
      dummy.rotation.set(rng.range(-0.2, 0.2), yaw + rng.range(0, 6.28), rng.range(-0.2, 0.2));
      dummy.scale.set(it.sc, it.sc * rng.range(0.6, 1), it.sc);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      if (it.sc > 1.4) this.colliders.push({ s: it.s, x: it.x, radius: it.sc * 0.8 });
    });
    im.instanceMatrix.needsUpdate = true;
    this.group.add(im);
  }

  private buildBushes(): void {
    const rng = new RNG(555);
    const geo = buildBushGeo();
    const list: Array<{ s: number; x: number; sc: number }> = [];
    const edge = this.track.halfWidth + this.track.shoulder;
    for (let s = 0; s < this.track.length; s += 11) {
      for (const side of [-1, 1]) {
        if (!rng.chance(0.55)) continue;
        list.push({
          s: s + rng.range(-4, 4),
          x: side * (edge + rng.range(0.4, 12)),
          sc: rng.range(0.6, 1.5),
        });
      }
    }
    const im = new THREE.InstancedMesh(geo, mat(0x3f6b2c, { flat: true }), list.length);
    im.castShadow = true;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    list.forEach((it, i) => {
      const { pos, yaw } = this.place(it.s, it.x);
      dummy.position.copy(pos);
      dummy.rotation.set(0, yaw + rng.range(0, 6.28), 0);
      dummy.scale.setScalar(it.sc);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      color.setHex(0x3f6b2c).offsetHSL(rng.range(-0.03, 0.03), 0, rng.range(-0.06, 0.06));
      im.setColorAt(i, color);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    this.group.add(im);
  }

  private buildSigns(): void {
    const rng = new RNG(31337);
    const edge = this.track.halfWidth + this.track.shoulder;
    let k = 0;
    for (let s = 90; s < this.track.length; s += 165) {
      const side = k % 2 === 0 ? 1 : -1;
      const kind = k % 3;
      const sign = buildSign(kind);
      const { pos, yaw } = this.place(s, side * (edge - 1.2));
      sign.position.copy(pos);
      sign.rotation.y = yaw + (side > 0 ? Math.PI * 0.72 : -Math.PI * 0.72);
      this.group.add(sign);
      this.colliders.push({ s, x: side * (edge - 1.2), radius: 0.45 });
      k++;
      if (rng.chance(0.3)) {
        const s2 = s + 40;
        const sgn2 = buildSign((kind + 1) % 3);
        const p2 = this.place(s2, -side * (edge - 1.2));
        sgn2.position.copy(p2.pos);
        sgn2.rotation.y = p2.yaw + (-side > 0 ? Math.PI * 0.72 : -Math.PI * 0.72);
        this.group.add(sgn2);
      }
    }
  }

  private buildBarriers(): void {
    const geo = buildBarrierGeo();
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const items: Array<{ s: number; x: number }> = [];
    const n = this.track.samples.length;
    const edge = this.track.halfWidth + 1.5;
    const step = 3.15;
    const maxK = Math.max(...this.track.samples.map((s) => Math.abs(s.curv)), 1e-6);

    for (let i = 0; i < n; i++) {
      const sm = this.track.samples[i];
      const kNorm = sm.curv / maxK;
      if (Math.abs(kNorm) < 0.28) continue;
      // outside of the corner = opposite sign of curvature
      const side = kNorm > 0 ? -1 : 1;
      items.push({ s: i * this.track.step, x: side * edge });
    }
    if (!items.length) return;

    // de-duplicate close-together posts so they don't stack
    const spaced: Array<{ s: number; x: number }> = [];
    let lastS = -999;
    let lastSide = 0;
    for (const it of items) {
      if (it.s - lastS < step * 0.9 && Math.sign(it.x) === lastSide) continue;
      spaced.push(it);
      lastS = it.s;
      lastSide = Math.sign(it.x);
    }

    const im = new THREE.InstancedMesh(geo, mat(0xffffff, { flat: true }), spaced.length);
    im.castShadow = true;
    spaced.forEach((it, i) => {
      const sm = this.track.sample(it.s);
      dummy.position
        .copy(sm.pos)
        .addScaledVector(sm.right, it.x)
        .addScaledVector(sm.up, -0.28);
      dummy.rotation.set(0, sm.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      color.setHex(i % 2 === 0 ? 0xd62a2a : 0xe8e8e8);
      im.setColorAt(i, color);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    this.group.add(im);
  }
}
