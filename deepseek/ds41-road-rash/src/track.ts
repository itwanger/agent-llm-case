/* ============================================================
 * track.ts — procedural closed circuit with hills + curves.
 *
 * The centreline is a closed Catmull-Rom spline through a radial
 * "wavy circle" (guaranteed never to self-intersect) with layered
 * sine elevation. It is then re-sampled at a constant arc length
 * so that gameplay can use (distance-along-track, lateral-offset)
 * coordinates — robust for racing, ranking, AI and combat.
 * ============================================================ */

import * as THREE from 'three';
import { CONFIG } from './config';
import { RNG, angleDelta, clamp, loopDelta } from './utils';
import { asphaltTexture, dirtTexture, grassTexture } from './textures';

export interface TrackSample {
  pos: THREE.Vector3;
  fwd: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  yaw: number;
  curv: number; // signed curvature (1/m)
  grade: number; // dy/ds
}

export interface RibbonOffset {
  x: number;
  dy: number;
}

const UP = new THREE.Vector3(0, 1, 0);

export class Track {
  readonly samples: TrackSample[] = [];
  readonly length: number;
  readonly step: number;
  readonly halfWidth = CONFIG.road.halfWidth;
  readonly shoulder = CONFIG.road.shoulder;
  readonly group = new THREE.Group();

  /** racing-line cache: ideal lateral offset per sample */
  readonly idealLine: Float32Array;
  /** largest |curvature| on the circuit (1/m) */
  readonly maxCurv: number;

  private readonly _s: TrackSample = {
    pos: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    yaw: 0,
    curv: 0,
    grade: 0,
  };

  constructor() {
    /* ---- 1. control points: radial wavy loop + layered hills ---- */
    const CP = 200;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < CP; i++) {
      const a = (i / CP) * Math.PI * 2;
      const r = 300 + 78 * Math.sin(3 * a) + 34 * Math.cos(5 * a);
      const y =
        9 * Math.sin(2 * a) +
        5.5 * Math.sin(3 * a + 0.7) +
        2.5 * Math.cos(5 * a + 2.1);
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }

    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    const totalLen = curve.getLength();
    const n = Math.max(64, Math.round(totalLen / CONFIG.road.sampleStep));
    this.step = totalLen / n;

    const spaced = curve.getSpacedPoints(n); // n+1 pts, last == first
    const raw = spaced.slice(0, n);

    /* ---- 2. derive frames ---- */
    for (let i = 0; i < n; i++) {
      const prev = raw[(i - 1 + n) % n];
      const next = raw[(i + 1) % n];
      const fwd = new THREE.Vector3().subVectors(next, prev).normalize();
      const right = new THREE.Vector3().crossVectors(UP, fwd).normalize();
      const up = new THREE.Vector3().crossVectors(fwd, right).normalize();
      this.samples.push({
        pos: raw[i].clone(),
        fwd,
        right,
        up,
        yaw: Math.atan2(fwd.x, fwd.z),
        curv: 0,
        grade: fwd.y,
      });
    }
    this.length = totalLen;

    /* ---- 3. signed curvature (smoothed) ---- */
    for (let i = 0; i < n; i++) {
      const a = this.samples[(i - 1 + n) % n];
      const b = this.samples[(i + 1) % n];
      const d = angleDelta(a.yaw, b.yaw) / (2 * this.step);
      this.samples[i].curv = d;
    }
    // light smoothing pass
    const tmp = this.samples.map((s) => s.curv);
    for (let i = 0; i < n; i++) {
      this.samples[i].curv =
        (tmp[(i - 1 + n) % n] + tmp[i] * 2 + tmp[(i + 1) % n]) * 0.25;
    }

    /* ---- 4. racing line: enter wide, clip the apex ---- */
    this.idealLine = new Float32Array(n);
    const maxK = Math.max(...this.samples.map((s) => Math.abs(s.curv)), 1e-6);
    this.maxCurv = maxK;
    for (let i = 0; i < n; i++) {
      const k = this.samples[i].curv / maxK;
      // k > 0 => turning right => hug the right (inside)
      this.idealLine[i] = clamp(-k * this.halfWidth * 0.62, -this.halfWidth * 0.66, this.halfWidth * 0.66);
    }

    /* ---- 5. build meshes ---- */
    this.buildMeshes();
  }

  /* ---------------------------------------------------------------
   * sampling
   * ------------------------------------------------------------- */
  sample(s: number, out: TrackSample = this._s): TrackSample {
    const n = this.samples.length;
    let t = s / this.step;
    t = ((t % n) + n) % n;
    const i0 = Math.floor(t) % n;
    const i1 = (i0 + 1) % n;
    const f = t - Math.floor(t);
    const a = this.samples[i0];
    const b = this.samples[i1];

    out.pos.lerpVectors(a.pos, b.pos, f);
    out.fwd.lerpVectors(a.fwd, b.fwd, f).normalize();
    out.yaw = a.yaw + angleDelta(a.yaw, b.yaw) * f;
    out.curv = a.curv + (b.curv - a.curv) * f;
    out.grade = a.grade + (b.grade - a.grade) * f;
    out.right.crossVectors(UP, out.fwd).normalize();
    out.up.crossVectors(out.fwd, out.right).normalize();
    return out;
  }

  /** World position for track coordinates (s, lateral x). */
  worldAt(s: number, x: number, out = new THREE.Vector3(), lift = 0): THREE.Vector3 {
    const sm = this.sample(s);
    return out
      .copy(sm.pos)
      .addScaledVector(sm.right, x)
      .addScaledVector(sm.up, lift);
  }

  /** Ideal racing-line lateral offset at distance s. */
  idealAt(s: number): number {
    const n = this.samples.length;
    let t = s / this.step;
    t = ((t % n) + n) % n;
    const i0 = Math.floor(t) % n;
    const i1 = (i0 + 1) % n;
    const f = t - Math.floor(t);
    return this.idealLine[i0] + (this.idealLine[i1] - this.idealLine[i0]) * f;
  }

  /** Signed difference b - a along the loop (metres, shortest way). */
  delta(a: number, b: number): number {
    return loopDelta(a, b, this.length);
  }

  /** Max lateral offset before you are fully off the road. */
  get offroadLimit(): number {
    return this.halfWidth + this.shoulder;
  }

  /**
   * Vertical offset of the terrain bank at a given |lateral offset|.
   * Mirrors the cross-section used when building the ground ribbon so
   * scenery sits exactly on the ground.
   */
  groundOffset(absX: number): number {
    const base = this.halfWidth + this.shoulder;
    const knots: Array<[number, number]> = [
      [base, -0.3],
      [base + 14, 1.1],
      [base + 34, 3.4],
      [base + 62, 7.2],
    ];
    if (absX <= knots[0][0]) return -0.34;
    for (let i = 0; i < knots.length - 1; i++) {
      const [x0, y0] = knots[i];
      const [x1, y1] = knots[i + 1];
      if (absX <= x1) return y0 + ((absX - x0) / (x1 - x0)) * (y1 - y0);
    }
    return knots[knots.length - 1][1];
  }

  /* ---------------------------------------------------------------
   * mesh construction
   * ------------------------------------------------------------- */
  private buildMeshes(): void {
    const n = this.samples.length;
    const hw = this.halfWidth;
    const sh = this.shoulder;

    /* --- asphalt --- */
    const road = this.ribbon(
      [
        { x: -hw, dy: 0 },
        { x: hw, dy: 0 },
      ],
      1 / 6,
    );
    const roadMat = new THREE.MeshLambertMaterial({
      map: asphaltTexture(),
      color: 0xffffff,
    });
    const roadMesh = new THREE.Mesh(road, roadMat);
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);

    /* --- dirt shoulders --- */
    const dirtMat = new THREE.MeshLambertMaterial({ map: dirtTexture(), color: 0xffffff });
    for (const side of [-1, 1]) {
      const g = this.ribbon(
        [
          { x: side * hw, dy: -0.02 },
          { x: side * (hw + sh), dy: -0.34 },
        ],
        1 / 4,
      );
      const mesh = new THREE.Mesh(g, dirtMat);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    /* --- terrain banks (rise away from the road, hides the edges) --- */
    const grassMat = new THREE.MeshLambertMaterial({ map: grassTexture(), color: 0xffffff });
    const rng = new RNG(4242);
    const noise = new Float32Array(n * 4);
    for (let i = 0; i < n * 3; i++) noise[i] = rng.range(-1, 1);
    for (const side of [-1, 1]) {
      const cols: RibbonOffset[] = [
        { x: side * (hw + sh), dy: -0.3 },
        { x: side * (hw + sh + 14), dy: 1.1 },
        { x: side * (hw + sh + 34), dy: 3.4 },
        { x: side * (hw + sh + 62), dy: 7.2 },
      ];
      const g = this.ribbon(
        cols,
        1 / 12,
        (i, c) => (c === 0 ? 0 : noise[i * 3 + c] * (0.35 + c * 0.5)),
      );
      const mesh = new THREE.Mesh(g, grassMat);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    /* --- centre dashes --- */
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f0d0 });
    this.group.add(new THREE.Mesh(this.dashedCenterLine(4.2, 8.4, 0.16), dashMat));

    /* --- solid edge lines --- */
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xe9e9e9 });
    for (const side of [-1, 1]) {
      const g = this.ribbon(
        [
          { x: side * (hw - 0.78), dy: 0.012 },
          { x: side * (hw - 0.44), dy: 0.012 },
        ],
        1 / 4,
      );
      this.group.add(new THREE.Mesh(g, edgeMat));
    }
  }

  private ribbon(
    offsets: RibbonOffset[],
    uvRepeat: number,
    dyNoise?: (i: number, col: number) => number,
  ): THREE.BufferGeometry {
    const n = this.samples.length;
    const C = offsets.length;
    const pos = new Float32Array((n + 1) * C * 3);
    const uv = new Float32Array((n + 1) * C * 2);
    const idx = new Uint32Array(n * (C - 1) * 6);

    for (let i = 0; i <= n; i++) {
      const sm = this.samples[i % n];
      const s = i * this.step;
      for (let c = 0; c < C; c++) {
        const o = offsets[c];
        const noise = dyNoise ? dyNoise(i % n, c) : 0;
        const vi = (i * C + c) * 3;
        pos[vi] = sm.pos.x + sm.right.x * o.x + sm.up.x * (o.dy + noise);
        pos[vi + 1] = sm.pos.y + sm.right.y * o.x + sm.up.y * (o.dy + noise);
        pos[vi + 2] = sm.pos.z + sm.right.z * o.x + sm.up.z * (o.dy + noise);
        const ui = (i * C + c) * 2;
        uv[ui] = c / (C - 1);
        uv[ui + 1] = s * uvRepeat;
      }
    }
    let o = 0;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < C - 1; c++) {
        const v0 = i * C + c;
        const v1 = i * C + c + 1;
        const v2 = (i + 1) * C + c;
        const v3 = (i + 1) * C + c + 1;
        idx[o++] = v0;
        idx[o++] = v3;
        idx[o++] = v1;
        idx[o++] = v0;
        idx[o++] = v2;
        idx[o++] = v3;
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    return g;
  }

  private dashedCenterLine(
    dashLen: number,
    gapLen: number,
    halfW: number,
  ): THREE.BufferGeometry {
    const segs = Math.floor(this.length / (dashLen + gapLen));
    const verts: number[] = [];
    const idx: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    let v = 0;
    for (let k = 0; k < segs; k++) {
      const s0 = k * (dashLen + gapLen);
      const s1 = s0 + dashLen;
      const sa = this.sample(s0);
      const ra = sa.right.clone();
      a.copy(sa.pos).addScaledVector(sa.up, 0.016);
      const sb = this.sample(s1);
      const rb = sb.right.clone();
      b.copy(sb.pos).addScaledVector(sb.up, 0.016);
      const p = [
        a.clone().addScaledVector(ra, -halfW),
        a.clone().addScaledVector(ra, halfW),
        b.clone().addScaledVector(rb, -halfW),
        b.clone().addScaledVector(rb, halfW),
      ];
      for (const q of p) verts.push(q.x, q.y, q.z);
      idx.push(v, v + 3, v + 1, v, v + 2, v + 3);
      v += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
}
