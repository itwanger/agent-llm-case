import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CONFIG } from './config';
import { asphaltTexture, grassTexture } from './textures';

export interface RoadFrame {
  pos: THREE.Vector3;
  forward: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  theta: number;
  pitch: number;
  kappa: number;
}

// [length(m), curvature(1/m, + = right), pitch target(rad)]
const SECTIONS: [number, number, number][] = [
  [260, 0, 0],
  [380, 1 / 160, 0.02],
  [220, 0, -0.015],
  [340, -1 / 120, 0],
  [180, 0, 0.03],
  [160, -1 / 90, -0.02],
  [160, 1 / 90, 0.01],
  [240, 0, 0],
  [420, 1 / 110, -0.03],
  [200, 0, 0.02],
  [300, -1 / 140, 0],
  [260, 1 / 70, 0.015],
  [220, 0, -0.02],
  [380, -1 / 100, 0],
  [240, 0, 0.025],
  [300, 1 / 130, -0.015],
  [240, 0, 0],
  [300, -1 / 80, 0.02],
  [200, 0, -0.03],
  [200, 0, 0],
];

function boxSmooth(src: Float32Array, radius: number): Float32Array {
  const n = src.length;
  const out = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += src[i];
    if (i >= radius * 2 + 1) acc -= src[i - radius * 2 - 1];
    const count = Math.min(i, radius * 2) + 1;
    out[i] = acc / count;
  }
  // second pass backwards for symmetric window
  const out2 = new Float32Array(n);
  acc = 0;
  for (let i = n - 1; i >= 0; i--) {
    acc += out[i];
    if (i + radius * 2 + 1 < n) acc -= out[i + radius * 2 + 1];
    const count = Math.min(n - 1 - i, radius * 2) + 1;
    out2[i] = acc / count;
  }
  return out2;
}

export class Road {
  readonly length = CONFIG.track.length;
  readonly ds = CONFIG.track.ds;
  readonly n: number;
  readonly px: Float32Array;
  readonly py: Float32Array;
  readonly pz: Float32Array;
  readonly rx: Float32Array; // right vector x
  readonly rz: Float32Array; // right vector z
  readonly theta: Float32Array;
  readonly pitch: Float32Array;
  readonly kappa: Float32Array;

  constructor() {
    const ds = this.ds;
    const n = Math.floor(this.length / ds) + 1;
    this.n = n;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.pz = new Float32Array(n);
    this.rx = new Float32Array(n);
    this.rz = new Float32Array(n);
    this.theta = new Float32Array(n);
    this.pitch = new Float32Array(n);
    this.kappa = new Float32Array(n);

    const rawK = new Float32Array(n);
    const rawP = new Float32Array(n);
    let idx = 0;
    for (const [len, k, p] of SECTIONS) {
      const steps = Math.round(len / ds);
      for (let i = 0; i < steps && idx < n; i++, idx++) {
        rawK[idx] = k;
        rawP[idx] = p;
      }
    }
    while (idx < n) {
      rawK[idx] = 0;
      rawP[idx] = 0;
      idx++;
    }
    const ks = boxSmooth(rawK, 25);
    this.kappa.set(ks);

    // integrate heading, then pitch toward smoothed target, then position
    let th = 0;
    let pi = 0;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < n; i++) {
      const pt = rawP[i];
      const d = pt - pi;
      const maxStep = 0.0006 * ds;
      pi += THREE.MathUtils.clamp(d, -maxStep, maxStep);
      this.theta[i] = th;
      this.pitch[i] = pi;
      this.px[i] = x;
      this.py[i] = y;
      this.pz[i] = z;
      this.rx[i] = Math.cos(th);
      this.rz[i] = Math.sin(th);
      const cp = Math.cos(pi);
      x += Math.sin(th) * cp * ds;
      z += -Math.cos(th) * cp * ds;
      y += Math.sin(pi) * ds;
      th += ks[i] * ds;
    }
  }

  kappaAt(s: number): number {
    const f = THREE.MathUtils.clamp(s, 0, this.length) / this.ds;
    const i = Math.min(this.n - 1, Math.floor(f));
    return this.kappa[i];
  }

  /** Max |curvature| in [s, s + span] sampled coarsely. */
  maxKappaAhead(s: number, span: number): number {
    let m = 0;
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      m = Math.max(m, Math.abs(this.kappaAt(s + (span * i) / steps)));
    }
    return m;
  }

  frameAt(s: number, out: RoadFrame): RoadFrame {
    const f = THREE.MathUtils.clamp(s, 0, this.length) / this.ds;
    const i = Math.min(this.n - 2, Math.floor(f));
    const t = f - i;
    const j = i + 1;
    const px = this.px[i] + (this.px[j] - this.px[i]) * t;
    const py = this.py[i] + (this.py[j] - this.py[i]) * t;
    const pz = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
    const th = this.theta[i] + (this.theta[j] - this.theta[i]) * t;
    const pi = this.pitch[i] + (this.pitch[j] - this.pitch[i]) * t;
    const kp = this.kappa[i] + (this.kappa[j] - this.kappa[i]) * t;
    const cp = Math.cos(pi);
    out.pos.set(px, py, pz);
    out.forward.set(Math.sin(th) * cp, Math.sin(pi), -Math.cos(th) * cp);
    out.right.set(Math.cos(th), 0, Math.sin(th));
    out.up.crossVectors(out.right, out.forward).normalize();
    out.theta = th;
    out.pitch = pi;
    out.kappa = kp;
    return out;
  }

  positionAt(s: number, lateral: number, out: THREE.Vector3): THREE.Vector3 {
    const f = THREE.MathUtils.clamp(s, 0, this.length) / this.ds;
    const i = Math.min(this.n - 2, Math.floor(f));
    const t = f - i;
    const j = i + 1;
    out.set(
      this.px[i] + (this.px[j] - this.px[i]) * t + this.rx[i] * lateral,
      this.py[i] + (this.py[j] - this.py[i]) * t,
      this.pz[i] + (this.pz[j] - this.pz[i]) * t + this.rz[i] * lateral,
    );
    return out;
  }

  buildMeshes(): THREE.Group {
    const g = new THREE.Group();
    const R = CONFIG.track.roadHalf;
    const S = CONFIG.track.shoulder;

    const surface = this.ribbon([
      { tA: -R - S, tB: -R, y: 0, color: 0x8a6b43 },
      { tA: -R, tB: R, y: 0, color: 0x565660, noise: true },
      { tA: R, tB: R + S, y: 0, color: 0x8a6b43 },
    ], false);
    surface.computeVertexNormals();
    const asphalt = asphaltTexture();
    const surfaceMesh = new THREE.Mesh(
      surface,
      new THREE.MeshStandardMaterial({ vertexColors: true, map: asphalt, roughness: 0.96, metalness: 0 }),
    );
    surfaceMesh.receiveShadow = true;
    g.add(surfaceMesh);

    // 地面用世界空间高度场：沿道路展开的 ribbon 在发夹弯处 |t| 超过曲率半径后会自我折叠，
    // 折回的草皮正好压在车行道上方（表现为草地"穿模"盖住沥青）。高度场取最近道路采样高度 -0.9，
    // 几何上不可能翻到路面上来。
    const ground = this.groundField();
    ground.computeVertexNormals();
    const grass = grassTexture();
    const groundMesh = new THREE.Mesh(
      ground,
      new THREE.MeshStandardMaterial({ vertexColors: true, map: grass, roughness: 1, metalness: 0 }),
    );
    groundMesh.receiveShadow = true;
    g.add(groundMesh);

    const marks = this.ribbon([
      { tA: -0.42, tB: -0.18, y: 0.04, color: 0xf5c518 },
      { tA: 0.18, tB: 0.42, y: 0.04, color: 0xf5c518 },
      { tA: -R + 0.2, tB: -R + 0.5, y: 0.04, color: 0xeeeeee },
      { tA: R - 0.5, tB: R - 0.2, y: 0.04, color: 0xeeeeee },
      { tA: 3.35, tB: 3.65, y: 0.04, color: 0xeeeeee, dash: true },
      { tA: -3.65, tB: -3.35, y: 0.04, color: 0xeeeeee, dash: true },
    ], true);
    const markMat = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2 });
    g.add(new THREE.Mesh(marks, markMat));

    const railGeo = this.ribbon([
      { tA: -R - S - 0.5, tB: -R - S - 0.3, y: 0, color: 0xc8ccd4, vertical: [0.5, 0.95] },
      { tA: R + S + 0.3, tB: R + S + 0.5, y: 0, color: 0xc8ccd4, vertical: [0.5, 0.95] },
    ], false);
    g.add(new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.55 })));

    // guardrail posts
    const postGeo = new THREE.BoxGeometry(0.14, 0.9, 0.14);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x888c94, roughness: 0.55, metalness: 0.5 });
    const postSteps = Math.floor(this.length / 6);
    const posts = new THREE.InstancedMesh(postGeo, postMat, postSteps * 2);
    posts.castShadow = true;
    const dummy = new THREE.Object3D();
    const fv = new THREE.Vector3();
    let pi = 0;
    for (let i = 0; i < postSteps; i++) {
      const s = i * 6;
      for (const side of [-1, 1]) {
        const t = side * (R + S + 0.4);
        this.positionAt(s, t, dummy.position);
        dummy.position.y += 0.42;
        const fr = this.frameAt(s, scratchFrame);
        fv.copy(fr.forward);
        dummy.rotation.set(0, Math.atan2(fv.x, fv.z), 0);
        dummy.updateMatrix();
        posts.setMatrixAt(pi++, dummy.matrix);
      }
    }
    posts.count = pi;
    g.add(posts);

    // trees (instanced trunk + blob-cluster canopy)
    const treeCount = 420;
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.34, 2.4, 7);
    const blobSpecs: [number, number, number, number][] = [
      [0, 0.2, 0, 1.55],
      [0.95, 0.55, 0.3, 1.05],
      [-0.85, 0.6, -0.25, 1.0],
      [0.2, 1.35, 0.5, 0.95],
      [-0.3, 1.0, -0.75, 0.9],
    ];
    const blobs = blobSpecs.map(([x, y, z, r]) => {
      const b = new THREE.IcosahedronGeometry(r, 1);
      b.translate(x, y, z);
      return b;
    });
    const folGeo = mergeGeometries(blobs)!;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.95 });
    const folMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const fols = new THREE.InstancedMesh(folGeo, folMat, treeCount);
    trunks.castShadow = true;
    fols.castShadow = true;
    const col = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      const s = 40 + Math.random() * (this.length - 80);
      const side = Math.random() < 0.5 ? -1 : 1;
      const off = side * (R + S + 6 + Math.random() * 34);
      const scale = 0.8 + Math.random() * 0.9;
      this.positionAt(s, off, dummy.position);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(scale);
      dummy.position.y += 1.2 * scale;
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 1.5 * scale;
      dummy.updateMatrix();
      fols.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.28 + Math.random() * 0.08, 0.55, 0.3 + Math.random() * 0.14);
      fols.setColorAt(i, col);
    }
    if (fols.instanceColor) fols.instanceColor.needsUpdate = true;
    g.add(trunks, fols);

    // roadside bushes / flowers / rocks (instanced)
    const bushGeo = new THREE.IcosahedronGeometry(0.75, 0);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    const bushCount = 260;
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, bushCount);
    for (let i = 0; i < bushCount; i++) {
      const s = 30 + Math.random() * (this.length - 60);
      const side = Math.random() < 0.5 ? -1 : 1;
      const off = side * (R + S + 1.2 + Math.random() * 10);
      this.positionAt(s, off, dummy.position);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      const sc = 0.6 + Math.random() * 0.9;
      dummy.scale.set(sc, sc * 0.75, sc);
      dummy.position.y += 0.3 * sc;
      dummy.updateMatrix();
      bushes.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.27 + Math.random() * 0.09, 0.5, 0.26 + Math.random() * 0.14);
      bushes.setColorAt(i, col);
    }
    if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
    g.add(bushes);

    const flowerGeo = new THREE.IcosahedronGeometry(0.16, 0);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    const flowerCount = 420;
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
    for (let i = 0; i < flowerCount; i++) {
      const s = 20 + Math.random() * (this.length - 40);
      const side = Math.random() < 0.5 ? -1 : 1;
      const off = side * (R + S + 0.6 + Math.random() * 4);
      this.positionAt(s, off, dummy.position);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.setScalar(0.7 + Math.random() * 0.8);
      dummy.position.y += 0.12;
      dummy.updateMatrix();
      flowers.setMatrixAt(i, dummy.matrix);
      col.setHSL(Math.random() < 0.5 ? 0.92 + Math.random() * 0.06 : 0.12 + Math.random() * 0.05, 0.75, 0.62);
      flowers.setColorAt(i, col);
    }
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
    g.add(flowers);

    const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8d9198, roughness: 1, flatShading: true });
    const rockCount = 120;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    for (let i = 0; i < rockCount; i++) {
      const s = 30 + Math.random() * (this.length - 60);
      const side = Math.random() < 0.5 ? -1 : 1;
      const off = side * (R + S + 2 + Math.random() * 20);
      this.positionAt(s, off, dummy.position);
      dummy.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      const sc = 0.5 + Math.random() * 1.1;
      dummy.scale.set(sc, sc * 0.7, sc);
      dummy.position.y += 0.1 * sc;
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    g.add(rocks);

    // roadside signs
    const signPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6);
    const signPostMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.6, metalness: 0.4 });
    const diamondGeo = new THREE.BoxGeometry(1.3, 1.3, 0.1);
    const rectGeo = new THREE.BoxGeometry(1.1, 1.5, 0.1);
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf5c518, roughness: 0.7 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x1e8449, roughness: 0.7 });
    let k = 0;
    for (let s = 220; s < this.length - 100; s += 450) {
      const side = k % 2 === 0 ? 1 : -1;
      const fr = this.frameAt(s, scratchFrame);
      const grp = new THREE.Group();
      this.positionAt(s, side * (R + S + 1.4), grp.position);
      grp.rotation.y = Math.atan2(fr.forward.x, fr.forward.z);
      const post = new THREE.Mesh(signPostGeo, signPostMat);
      post.position.y = 1.3;
      post.castShadow = true;
      grp.add(post);
      const panel = new THREE.Mesh(k % 4 < 2 ? diamondGeo : rectGeo, k % 4 < 2 ? yellowMat : greenMat);
      panel.position.y = 2.5;
      panel.castShadow = true;
      if (k % 4 < 2) panel.rotation.z = Math.PI / 4;
      grp.add(panel);
      g.add(grp);
      k++;
    }

    // finish gantry
    const fs = this.length - CONFIG.track.finishOffset;
    const fr = this.frameAt(fs, scratchFrame);
    const gantry = new THREE.Group();
    this.positionAt(fs, 0, gantry.position);
    gantry.rotation.y = Math.atan2(fr.forward.x, fr.forward.z);
    const gPostGeo = new THREE.BoxGeometry(0.5, 6.5, 0.5);
    const gPostMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(gPostGeo, gPostMat);
      p.position.set(side * (R + 1.2), 3.2, 0);
      p.castShadow = true;
      gantry.add(p);
    }
    const beamGeo = new THREE.BoxGeometry((R + 1.2) * 2, 1.2, 0.4);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 6.2;
    beam.castShadow = true;
    gantry.add(beam);
    const checkGeo = new THREE.BoxGeometry(1.2, 0.55, 0.42);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Mesh(checkGeo, i % 2 === 0 ? whiteMat : beamMat);
      c.position.set(-R + 0.6 + i * 1.2, 6.2, 0);
      gantry.add(c);
    }
    g.add(gantry);

    return g;
  }

  /** World-space grass heightfield; height of each cell = nearest road row height - 0.9. */
  private groundField(): THREE.BufferGeometry {
    const GS = 10;
    const EXT = 500;
    const step = 2;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < this.n; i += step) {
      minX = Math.min(minX, this.px[i]);
      maxX = Math.max(maxX, this.px[i]);
      minZ = Math.min(minZ, this.pz[i]);
      maxZ = Math.max(maxZ, this.pz[i]);
    }
    const x0 = Math.floor((minX - EXT) / GS) * GS;
    const z0 = Math.floor((minZ - EXT) / GS) * GS;
    const nx = Math.ceil((maxX + EXT - x0) / GS) + 1;
    const nz = Math.ceil((maxZ + EXT - z0) / GS) + 1;

    const INF = 1e9;
    const dist = new Float32Array(nx * nz).fill(INF);
    const hy = new Float32Array(nx * nz);
    for (let i = 0; i < this.n; i += step) {
      const ix = Math.round((this.px[i] - x0) / GS);
      const iz = Math.round((this.pz[i] - z0) / GS);
      const k = iz * nx + ix;
      const dx = this.px[i] - (x0 + ix * GS);
      const dz = this.pz[i] - (z0 + iz * GS);
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < dist[k]) {
        dist[k] = d;
        hy[k] = this.py[i];
      }
    }
    const D = GS;
    const DD = GS * 1.41421;
    const relax = (k: number, nk: number, cost: number) => {
      const d = dist[nk] + cost;
      if (d < dist[k]) {
        dist[k] = d;
        hy[k] = hy[nk];
      }
    };
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        const k = iz * nx + ix;
        if (ix > 0) relax(k, k - 1, D);
        if (iz > 0) relax(k, k - nx, D);
        if (ix > 0 && iz > 0) relax(k, k - nx - 1, DD);
        if (ix < nx - 1 && iz > 0) relax(k, k - nx + 1, DD);
      }
    }
    for (let iz = nz - 1; iz >= 0; iz--) {
      for (let ix = nx - 1; ix >= 0; ix--) {
        const k = iz * nx + ix;
        if (ix < nx - 1) relax(k, k + 1, D);
        if (iz < nz - 1) relax(k, k + nx, D);
        if (ix < nx - 1 && iz < nz - 1) relax(k, k + nx + 1, DD);
        if (ix > 0 && iz < nz - 1) relax(k, k + nx - 1, DD);
      }
    }

    // Near the carriageway the ground must never rise above the road: where the
    // track self-approaches (closest ~19 m, several metres of elevation apart) a
    // blended height can end up above the lower leg and bury it in grass.
    // Inside NR follow the lowest road sample; within 25 m of any road row the
    // height is additionally clamped to the nearest row's height.
    const NR = 12;
    const HC = 20;
    const RAD = 120;
    const chamHy = hy.slice();
    const buckets = new Map<number, number[]>();
    for (let i = 0; i < this.n; i += step) {
      const bk = Math.floor(this.px[i] / HC) * 4096 + Math.floor(this.pz[i] / HC);
      const arr = buckets.get(bk);
      if (arr) arr.push(i);
      else buckets.set(bk, [i]);
    }
    for (let iz = 0; iz < nz; iz++) {
      const z = z0 + iz * GS;
      for (let ix = 0; ix < nx; ix++) {
        const x = x0 + ix * GS;
        const cx = Math.floor(x / HC);
        const cz = Math.floor(z / HC);
        let mn = Infinity;
        let sw = 0;
        let sy = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            const arr = buckets.get((cx + dx) * 4096 + (cz + dz));
            if (!arr) continue;
            for (const i of arr) {
              const ddx = this.px[i] - x;
              const ddz = this.pz[i] - z;
              const d2 = ddx * ddx + ddz * ddz;
              if (d2 < NR * NR && this.py[i] < mn) mn = this.py[i];
              if (d2 > RAD * RAD) continue;
              const q = d2 + 36;
              const w = 1 / (q * q);
              sw += w;
              sy += w * this.py[i];
            }
          }
        }
        const k = iz * nx + ix;
        if (mn < Infinity) {
          hy[k] = mn;
        } else if (sw > 0) {
          hy[k] = sy / sw;
        }
        if (dist[k] < 25 && hy[k] > chamHy[k]) hy[k] = chamHy[k];
      }
    }

    const positions: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const UVS = 1 / 6;
    const col = new THREE.Color(0x3f7d32);
    for (let iz = 0; iz < nz; iz++) {
      const z = z0 + iz * GS;
      for (let ix = 0; ix < nx; ix++) {
        const x = x0 + ix * GS;
        positions.push(x, hy[iz * nx + ix] - 0.9, z);
        const shade = 0.92 + Math.random() * 0.16;
        colors.push(col.r * shade, col.g * shade, col.b * shade);
        uvs.push(x * UVS, z * UVS);
      }
    }
    for (let iz = 0; iz < nz - 1; iz++) {
      for (let ix = 0; ix < nx - 1; ix++) {
        const a = iz * nx + ix;
        const b = a + 1;
        const c = a + nx;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  private ribbon(
    specs: { tA: number; tB: number; y: number; color: number; noise?: boolean; dash?: boolean; vertical?: [number, number] }[],
    dashed: boolean,
    stepEvery = 1,
  ): THREE.BufferGeometry {
    const positions: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const col = new THREE.Color();
    const UVS = 1 / 6;
    for (const spec of specs) {
      col.set(spec.color);
      const base = positions.length / 3;
      let vertCount = 0;
      for (let i = 0; i < this.n; i += stepEvery) {
        const s = i * this.ds;
        if (spec.dash && s % 10 >= 5) continue;
        const y0 = spec.vertical ? spec.vertical[0] : spec.y;
        const y1 = spec.vertical ? spec.vertical[1] : spec.y;
        const nx = this.px[i] + this.rx[i] * spec.tA;
        const ny = this.py[i];
        const nz = this.pz[i] + this.rz[i] * spec.tA;
        const fx = this.px[i] + this.rx[i] * spec.tB;
        const fz = this.pz[i] + this.rz[i] * spec.tB;
        if (spec.vertical) {
          positions.push(nx, ny + y0, nz, nx, ny + y1, nz, fx, ny + y1, fz, fx, ny + y0, fz);
          uvs.push(s * UVS, y0 * UVS, s * UVS, y1 * UVS, s * UVS, y1 * UVS, s * UVS, y0 * UVS);
          for (let v = 0; v < 4; v++) colors.push(col.r, col.g, col.b);
          const b = base + vertCount;
          indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
          vertCount += 4;
        } else {
          const shade = spec.noise ? 0.92 + Math.random() * 0.16 : 1;
          positions.push(nx, ny + y0, nz, fx, ny + y0, fz);
          uvs.push(s * UVS, spec.tA * UVS, s * UVS, spec.tB * UVS);
          for (let v = 0; v < 2; v++) colors.push(col.r * shade, col.g * shade, col.b * shade);
          vertCount += 2;
        }
      }
      if (!spec.vertical) {
        // stitch consecutive pairs, skipping dash gaps
        let prev = -1;
        let run = 0;
        for (let i = 0; i < this.n; i += stepEvery) {
          const s = i * this.ds;
          const gap = spec.dash && s % 10 >= 5;
          if (gap) {
            prev = -1;
            run = 0;
            continue;
          }
          if (prev >= 0) {
            const b = base + prev * 2;
            const c = base + run * 2;
            indices.push(b, b + 1, c, b + 1, c + 1, c);
          }
          prev = run;
          run++;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }
}

export const scratchFrame: RoadFrame = {
  pos: new THREE.Vector3(),
  forward: new THREE.Vector3(),
  right: new THREE.Vector3(),
  up: new THREE.Vector3(),
  theta: 0,
  pitch: 0,
  kappa: 0,
};
