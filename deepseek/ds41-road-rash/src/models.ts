/* ============================================================
 * models.ts — every object in the game is generated in code.
 * No external assets: bikes, riders, cars, trees, rocks, signs
 * and barriers are all built from primitives at runtime.
 *
 * Rigid parts are merged into a single vertex-coloured geometry
 * so each bike/car costs only a handful of draw calls.
 * ============================================================ */

import * as THREE from 'three';
import { RNG } from './utils';

/* ---------------------------------------------------------------
 * materials
 * ------------------------------------------------------------- */
const matCache = new Map<string, THREE.MeshLambertMaterial>();

export function mat(
  color: number,
  opts: { flat?: boolean; emissive?: number; emissiveIntensity?: number; side?: THREE.Side } = {},
): THREE.MeshLambertMaterial {
  const key = `${color}|${opts.flat ? 1 : 0}|${opts.emissive ?? -1}|${opts.emissiveIntensity ?? 1}|${
    opts.side ?? 0
  }`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      flatShading: opts.flat ?? true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    matCache.set(key, m);
  }
  return m;
}

/** One shared material for every merged vertex-coloured part. */
let vcolMat: THREE.MeshLambertMaterial | null = null;
function vc(): THREE.MeshLambertMaterial {
  if (!vcolMat) vcolMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  return vcolMat;
}

/* ---------------------------------------------------------------
 * geometry helpers
 * ------------------------------------------------------------- */
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 12) =>
  new THREE.CylinderGeometry(rt, rb, h, seg);
const sph = (r: number, seg = 12) => new THREE.SphereGeometry(r, seg, seg);

interface Part {
  g: THREE.BufferGeometry;
  c: number;
}
const P = (g: THREE.BufferGeometry, c: number): Part => ({ g, c });

/** Merge parts, baking each part's colour into a vertex-colour attribute. */
function mergeColored(parts: Part[]): THREE.BufferGeometry {
  let total = 0;
  const prepared = parts.map((p) => {
    const g = p.g.index ? p.g.toNonIndexed() : p.g;
    total += g.attributes.position.count;
    return { g, c: new THREE.Color(p.c) };
  });
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let o = 0;
  for (const { g, c } of prepared) {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      pos[(o + i) * 3] = p.getX(i);
      pos[(o + i) * 3 + 1] = p.getY(i);
      pos[(o + i) * 3 + 2] = p.getZ(i);
      col[(o + i) * 3] = c.r;
      col[(o + i) * 3 + 1] = c.g;
      col[(o + i) * 3 + 2] = c.b;
    }
    o += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}

function mergedMesh(parts: Part[], cast = true): THREE.Mesh {
  const mesh = new THREE.Mesh(mergeColored(parts), vc());
  mesh.castShadow = cast;
  return mesh;
}

/** Transform helpers that bake a transform into a fresh geometry. */
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);
const rot = (
  g: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
) => g.rotateX(x).rotateY(y).rotateZ(z);

/* ---------------------------------------------------------------
 * Wheels — one merged mesh per wheel
 * ------------------------------------------------------------- */
export function makeWheel(
  radius: number,
  width: number,
  tire = 0x1a1a1e,
  rim = 0xc9ccd6,
): THREE.Mesh {
  const parts: Part[] = [];
  const t = cyl(radius, radius, width, 18);
  t.rotateZ(Math.PI / 2);
  parts.push(P(t, tire));

  const r = cyl(radius * 0.6, radius * 0.6, width * 1.04, 14);
  r.rotateZ(Math.PI / 2);
  parts.push(P(r, rim));

  const hub = cyl(radius * 0.2, radius * 0.2, width * 1.35, 8);
  hub.rotateZ(Math.PI / 2);
  parts.push(P(hub, 0x8b8f99));

  for (let i = 0; i < 5; i++) {
    const sp = box(width * 0.5, radius * 1.75, 0.055);
    sp.rotateX((i / 5) * Math.PI);
    parts.push(P(sp, 0xd8dbe3));
  }
  const mesh = mergedMesh(parts, true);
  return mesh;
}

/* ---------------------------------------------------------------
 * Motorcycle
 * ------------------------------------------------------------- */
export interface BikeModel {
  group: THREE.Group;
  fork: THREE.Group; // steering assembly (front wheel + bars)
  frontWheel: THREE.Mesh;
  rearWheel: THREE.Mesh;
  bars: THREE.Group;
  headlight: THREE.Mesh;
  brakeLight: THREE.Mesh;
}

export function buildBike(color: number): BikeModel {
  const g = new THREE.Group();
  const R = 0.42;
  const WB = 1.62;
  const DARK = 0x17171c;
  const METAL = 0xb8bcc6;
  const SEAT = 0x101014;

  /* --- static frame (one draw call) --- */
  const frame: Part[] = [];

  frame.push(P(at(box(0.16, 0.14, 1.05), 0, R, -0.62), METAL)); // swingarm
  frame.push(P(at(box(0.62, 0.52, 0.72), 0, 0.56, -0.08), DARK)); // engine
  for (let i = 0; i < 4; i++) frame.push(P(at(box(0.7, 0.035, 0.56), 0, 0.36 + i * 0.11, -0.06), METAL));
  frame.push(P(rot(at(cyl(0.075, 0.095, 1.15, 8), 0.3, 0.36, -0.6), Math.PI / 2, 0, 0.12), METAL));
  frame.push(P(rot(at(cyl(0.11, 0.09, 0.24, 8), 0.31, 0.36, -1.16), Math.PI / 2, 0, 0), 0xdadde5));
  frame.push(P(rot(at(box(0.46, 0.34, 0.82), 0, 0.9, 0.06), -0.06, 0, 0), color)); // tank
  frame.push(P(at(box(0.34, 0.12, 0.7), 0, 1.06, 0.05), 0xffffff)); // tank stripe
  frame.push(P(at(box(0.42, 0.16, 0.78), 0, 1.02, -0.52), SEAT)); // seat
  frame.push(P(rot(at(box(0.36, 0.3, 0.5), 0, 1.08, -0.98), 0.28, 0, 0), color)); // tail
  frame.push(P(rot(at(box(0.5, 0.52, 0.6), 0, 0.92, 0.62), -0.34, 0, 0), color)); // fairing
  frame.push(P(rot(at(box(0.34, 0.34, 0.34), 0, 0.86, 0.86), -0.5, 0, 0), color)); // nose
  frame.push(P(rot(at(box(0.4, 0.28, 0.05), 0, 1.24, 0.62), -0.62, 0, 0), 0x9fd8ff)); // screen
  for (const sx of [-0.34, 0.34]) {
    const peg = cyl(0.03, 0.03, 0.18, 6);
    peg.rotateZ(Math.PI / 2);
    frame.push(P(at(peg, sx, 0.42, -0.36), METAL));
  }
  frame.push(P(rot(at(box(0.3, 0.22, 0.03), 0, 1.2, -1.24), 0.3, 0, 0), 0xf2f2f2)); // plate
  g.add(mergedMesh(frame));

  /* --- lights (emissive, separate material) --- */
  const headlight = new THREE.Mesh(
    cyl(0.15, 0.15, 0.1, 12).rotateX(Math.PI / 2),
    mat(0xfff2c0, { emissive: 0xffe680, emissiveIntensity: 1.5 }),
  );
  headlight.position.set(0, 0.84, 0.99);
  headlight.castShadow = false;
  g.add(headlight);

  const brakeLight = new THREE.Mesh(
    box(0.22, 0.11, 0.06),
    mat(0x330000, { emissive: 0xff1111, emissiveIntensity: 1.6 }),
  );
  brakeLight.position.set(0, 1.14, -1.22);
  brakeLight.castShadow = false;
  g.add(brakeLight);

  /* --- steering assembly (one merged mesh + front wheel) --- */
  const fork = new THREE.Group();
  fork.position.set(0, 0.95, 0.5);
  g.add(fork);

  const forkAngle = 0.44;
  const forkParts: Part[] = [];
  for (const sx of [-0.14, 0.14]) {
    forkParts.push(P(rot(at(cyl(0.05, 0.05, 0.92, 8), sx, -0.3, 0.16), forkAngle, 0, 0), METAL));
    forkParts.push(P(rot(at(cyl(0.065, 0.065, 0.4, 8), sx, -0.62, 0.3), forkAngle, 0, 0), DARK));
  }
  forkParts.push(P(at(box(0.36, 0.09, 0.16), 0, 0.06, 0.02), METAL)); // yoke
  forkParts.push(P(rot(at(box(0.2, 0.06, 0.5), 0, -0.5, 0.5), 0.15, 0, 0), color)); // fender
  const bar = cyl(0.028, 0.028, 0.66, 8);
  bar.rotateZ(Math.PI / 2);
  forkParts.push(P(at(bar, 0, 0.12, 0.06), METAL));
  for (const sx of [-0.3, 0.3]) {
    const grip = cyl(0.045, 0.045, 0.16, 8);
    grip.rotateZ(Math.PI / 2);
    forkParts.push(P(at(grip, sx, 0.12, 0.06), 0x0d0d10));
  }
  for (const sx of [-0.24, 0.24]) {
    forkParts.push(P(rot(at(box(0.16, 0.07, 0.04), sx, 0.31, 0.04), 0, 0, sx > 0 ? -0.35 : 0.35), 0x2a2a30));
    forkParts.push(P(at(cyl(0.014, 0.014, 0.2, 6), sx * 0.8, 0.22, 0.04), METAL));
  }
  fork.add(mergedMesh(forkParts));

  const frontWheel = makeWheel(R, 0.26);
  frontWheel.position.set(0, -0.95 + R, 0.42);
  fork.add(frontWheel);

  const rearWheel = makeWheel(R, 0.3);
  rearWheel.position.set(0, R, -WB / 2);
  g.add(rearWheel);

  // the bars group stays available for anyone who wants to spin it separately
  const bars = new THREE.Group();
  fork.add(bars);

  return { group: g, fork, frontWheel, rearWheel, bars, headlight, brakeLight };
}

/* ---------------------------------------------------------------
 * Rider
 * ------------------------------------------------------------- */
export interface RiderModel {
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  foreL: THREE.Group;
  foreR: THREE.Group;
  club: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
}

export function buildRider(suit: number, accent: number): RiderModel {
  const g = new THREE.Group();
  const SKIN = 0xd9a06b;
  const GLOVE = 0x141418;
  const BOOT = 0x1b1b20;

  /* torso pivot */
  const torso = new THREE.Group();
  torso.position.set(0, 0.98, -0.16);
  torso.rotation.x = -0.42;
  g.add(torso);

  torso.add(
    mergedMesh([
      P(at(box(0.44, 0.3, 0.36), 0, 0, 0.04), suit),
      P(at(box(0.5, 0.52, 0.4), 0, 0.4, -0.02), suit),
      P(at(box(0.52, 0.13, 0.42), 0, 0.44, -0.02), accent),
      P(at(box(0.62, 0.16, 0.36), 0, 0.62, -0.02), accent),
      P(at(box(0.34, 0.3, 0.16), 0, 0.42, 0.2), accent),
    ]),
  );

  /* head + helmet */
  const head = new THREE.Group();
  head.position.set(0, 0.82, -0.06);
  torso.add(head);
  const helmet = sph(0.19, 14);
  helmet.scale(1, 1.05, 1.12);
  head.add(
    mergedMesh([
      P(at(cyl(0.07, 0.08, 0.12, 8), 0, -0.06, 0), SKIN),
      P(at(helmet, 0, 0.1, 0), accent),
      P(rot(at(box(0.28, 0.1, 0.16), 0, 0.1, -0.16), 0.1, 0, 0), 0x1b2a3a),
      P(at(box(0.06, 0.12, 0.3), 0, 0.26, 0.02), 0xffffff),
    ]),
  );

  /* arms */
  const makeArm = (side: number) => {
    const shoulderG = new THREE.Group();
    shoulderG.position.set(side * 0.3, 0.58, -0.02);
    torso.add(shoulderG);
    shoulderG.add(
      mergedMesh([
        P(at(box(0.15, 0.42, 0.16), 0, -0.2, 0), suit),
        P(at(box(0.2, 0.12, 0.2), 0, -0.02, 0), accent),
      ]),
    );

    const foreG = new THREE.Group();
    foreG.position.set(0, -0.4, 0);
    shoulderG.add(foreG);
    foreG.add(
      mergedMesh([
        P(at(box(0.13, 0.4, 0.14), 0, -0.19, 0), suit),
        P(at(box(0.16, 0.15, 0.18), 0, -0.44, -0.02), GLOVE),
      ]),
    );
    return { shoulderG, foreG };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  /* club */
  const club = new THREE.Group();
  club.position.set(0, -0.46, -0.02);
  armR.foreG.add(club);
  const clubParts: Part[] = [
    P(at(cyl(0.035, 0.035, 0.5, 8), 0, -0.2, 0), 0x4a2f18),
    P(at(cyl(0.045, 0.038, 0.66, 8), 0, -0.75, 0), 0x7a5230),
    P(at(sph(0.1, 8), 0, -1.08, 0), 0x2a2a30),
  ];
  for (let i = 0; i < 3; i++) clubParts.push(P(at(cyl(0.055, 0.055, 0.05, 6), 0, -0.6 - i * 0.16, 0), 0xb9bdc7));
  club.add(mergedMesh(clubParts));
  club.rotation.x = 0.6;

  /* legs */
  const makeLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.16, 0.02, 0.06);
    torso.add(hip);
    hip.add(
      mergedMesh([
        P(rot(at(box(0.19, 0.46, 0.22), 0, -0.2, 0.06), 0.55, 0, 0), suit),
        P(rot(at(box(0.17, 0.44, 0.2), 0, -0.5, 0.34), -0.28, 0, 0), suit),
        P(at(box(0.18, 0.14, 0.32), 0, -0.72, 0.44), BOOT),
        P(rot(at(box(0.21, 0.16, 0.24), 0, -0.34, 0.16), 0.55, 0, 0), accent),
      ]),
    );
    return hip;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  return {
    group: g,
    torso,
    head,
    armL: armL.shoulderG,
    armR: armR.shoulderG,
    foreL: armL.foreG,
    foreR: armR.foreG,
    club,
    legL,
    legR,
  };
}

/* ---------------------------------------------------------------
 * Car (traffic)
 * ------------------------------------------------------------- */
export interface CarModel {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  headlights: THREE.Mesh;
  taillights: THREE.Mesh;
}

export function buildCar(color: number, kind: 'sedan' | 'truck' | 'wagon' = 'sedan'): CarModel {
  const g = new THREE.Group();
  const GLASS = 0x1a2530;
  const TRIM = 0x1c1c22;

  const L = kind === 'truck' ? 5.4 : kind === 'wagon' ? 4.9 : 4.4;
  const W = 1.95;
  const wheelR = 0.36;

  const body: Part[] = [
    P(at(box(W, 0.62, L), 0, 0.72, 0), color),
    P(at(box(W * 1.02, 0.3, L * 0.98), 0, 0.46, 0), TRIM),
    P(at(box(W * 0.98, 0.26, 0.22), 0, 0.62, L / 2 - 0.06), TRIM),
    P(at(box(W * 0.98, 0.26, 0.22), 0, 0.62, -L / 2 + 0.06), TRIM),
  ];

  if (kind === 'truck') {
    body.push(
      P(at(box(W * 0.96, 0.78, L * 0.36), 0, 1.4, L * 0.24), color),
      P(rot(at(box(W * 0.9, 0.52, 0.1), 0, 1.46, L * 0.41), -0.22, 0, 0), GLASS),
      P(at(box(W * 0.98, 0.6, L * 0.52), 0, 1.32, -L * 0.2), color),
      P(at(box(W * 0.98, 0.34, 0.12), 0, 1.6, -L * 0.45), color),
    );
  } else {
    const cz = kind === 'wagon' ? -L * 0.16 : -L * 0.06;
    body.push(
      P(at(box(W * 0.86, 0.72, L * 0.46), 0, 1.36, cz), color),
      P(rot(at(box(W * 0.8, 0.5, 0.1), 0, 1.4, L * 0.19), -0.32, 0, 0), GLASS),
      P(rot(at(box(W * 0.8, 0.46, 0.1), 0, 1.4, kind === 'wagon' ? -L * 0.4 : -L * 0.28), 0.3, 0, 0), GLASS),
    );
    for (const sx of [-1, 1]) {
      body.push(P(at(box(0.06, 0.42, L * 0.36), (sx * W * 0.86) / 2, 1.4, cz), GLASS));
    }
  }
  g.add(mergedMesh(body));

  /* lights */
  const hlParts: Part[] = [];
  const tlParts: Part[] = [];
  for (const sx of [-1, 1]) {
    hlParts.push(P(at(box(0.38, 0.2, 0.1), sx * W * 0.31, 0.78, L / 2 - 0.01), 0xfff4cc));
    tlParts.push(P(at(box(0.36, 0.18, 0.1), sx * W * 0.31, 0.78, -L / 2 + 0.01), 0xff2222));
  }
  const headlights = new THREE.Mesh(
    mergeColored(hlParts),
    mat(0xfff4cc, { emissive: 0xffe680, emissiveIntensity: 1.5 }),
  );
  const taillights = new THREE.Mesh(
    mergeColored(tlParts),
    mat(0xff2222, { emissive: 0xff2222, emissiveIntensity: 1.4 }),
  );
  headlights.castShadow = false;
  taillights.castShadow = false;
  g.add(headlights, taillights);

  /* wheels */
  const wheels: THREE.Mesh[] = [];
  const wz = L * 0.33;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = makeWheel(wheelR, 0.26, 0x141418, 0xa8adb8);
      w.position.set(sx * W * 0.47, wheelR, sz * wz);
      w.castShadow = false;
      g.add(w);
      wheels.push(w);
    }
  }

  return { group: g, wheels, headlights, taillights };
}

/* ---------------------------------------------------------------
 * Scenery geometry (used with InstancedMesh)
 * ------------------------------------------------------------- */
export interface TreeKit {
  trunk: THREE.BufferGeometry;
  leaf: THREE.BufferGeometry;
  leafColors: number[];
}

export function buildTreeKit(kind: number): TreeKit {
  if (kind === 0) {
    const trunk = cyl(0.22, 0.32, 2.4, 6);
    trunk.translate(0, 1.2, 0);
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.ConeGeometry(1.55 - i * 0.34, 2.1 - i * 0.28, 7);
      c.translate(0, 2.5 + i * 1.15, 0);
      parts.push(c);
    }
    return { trunk, leaf: mergeGeos(parts), leafColors: [0x2f6b2a, 0x3d8433, 0x255c22] };
  }
  if (kind === 1) {
    const trunk = cyl(0.28, 0.42, 2.2, 6);
    trunk.translate(0, 1.1, 0);
    const parts: THREE.BufferGeometry[] = [];
    const blobs: Array<[number, number, number, number]> = [
      [0, 3.1, 0, 1.55],
      [0.8, 2.7, 0.35, 1.05],
      [-0.75, 2.85, -0.3, 1.15],
      [0.15, 3.9, -0.55, 0.95],
      [-0.3, 3.6, 0.6, 0.9],
    ];
    for (const [x, y, z, r] of blobs) {
      const s = new THREE.IcosahedronGeometry(r, 0);
      s.translate(x, y, z);
      parts.push(s);
    }
    return { trunk, leaf: mergeGeos(parts), leafColors: [0x3d8433, 0x4a9a3c, 0x2f6b2a] };
  }
  const trunk = cyl(0.18, 0.4, 3.2, 6);
  trunk.translate(0, 1.6, 0);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const b = cyl(0.06, 0.13, 1.5, 5);
    b.rotateZ(0.7 + i * 0.25);
    b.rotateY(i * 2.1);
    b.translate(0.35, 2.6 + i * 0.35, 0.1 * i);
    parts.push(b);
  }
  return { trunk, leaf: mergeGeos(parts), leafColors: [0x6b5a3a] };
}

export function buildRockGeo(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  const rng = new RNG(7);
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(
      i,
      p.getX(i) * rng.range(0.75, 1.25),
      p.getY(i) * rng.range(0.55, 0.95),
      p.getZ(i) * rng.range(0.75, 1.25),
    );
  }
  g.computeVertexNormals();
  g.translate(0, 0.35, 0);
  return g;
}

export function buildBushGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const rng = new RNG(21);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.IcosahedronGeometry(rng.range(0.35, 0.62), 0);
    s.translate(rng.range(-0.4, 0.4), rng.range(0.2, 0.55), rng.range(-0.4, 0.4));
    parts.push(s);
  }
  return mergeGeos(parts);
}

export function buildBarrierGeo(): THREE.BufferGeometry {
  const g = box(0.22, 0.85, 3.0);
  g.translate(0, 0.55, 0);
  return g;
}

/* ---------------------------------------------------------------
 * Road sign
 * ------------------------------------------------------------- */
export function buildSign(kind: number): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(cyl(0.07, 0.07, 2.4, 6), mat(0x9aa0aa));
  post.position.set(0, 1.2, 0);
  post.castShadow = true;
  g.add(post);

  if (kind === 0) {
    const plate = new THREE.Mesh(box(1.5, 0.9, 0.07), mat(0xf2c200));
    plate.position.set(0, 2.3, 0);
    g.add(plate);
    const arrow = new THREE.Mesh(box(0.7, 0.16, 0.1), mat(0x141414));
    arrow.position.set(0, 2.3, 0.06);
    g.add(arrow);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 3), mat(0x141414));
    head.position.set(0.5, 2.3, 0.06);
    head.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    g.add(head);
  } else if (kind === 1) {
    const plate = new THREE.Mesh(box(1.1, 1.1, 0.07), mat(0xe8e8e8));
    plate.position.set(0, 2.35, 0);
    plate.rotation.z = Math.PI / 4;
    g.add(plate);
    const inner = new THREE.Mesh(box(0.72, 0.72, 0.1), mat(0xd42a2a));
    inner.position.set(0, 2.35, 0.05);
    inner.rotation.z = Math.PI / 4;
    g.add(inner);
  } else {
    const plate = new THREE.Mesh(box(1.9, 1.2, 0.12), mat(0x1a1a22));
    plate.position.set(0, 2.5, 0);
    g.add(plate);
    const bar1 = new THREE.Mesh(
      box(1.4, 0.18, 0.1),
      mat(0xff5a1f, { emissive: 0xff5a1f, emissiveIntensity: 0.7 }),
    );
    bar1.position.set(0, 2.75, 0.09);
    g.add(bar1);
    const bar2 = new THREE.Mesh(
      box(1.0, 0.16, 0.1),
      mat(0x37f0ff, { emissive: 0x37f0ff, emissiveIntensity: 0.7 }),
    );
    bar2.position.set(0, 2.32, 0.09);
    g.add(bar2);
  }
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return g;
}

/* ---------------------------------------------------------------
 * tiny geometry merge for single-colour scenery parts
 * ------------------------------------------------------------- */
function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  let vTotal = 0;
  let iTotal = 0;
  const indexed = geos.every((g) => g.index !== null);
  for (const g of geos) {
    vTotal += g.attributes.position.count;
    iTotal += indexed ? g.index!.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vTotal * 3);
  const idx = indexed ? new Uint32Array(iTotal) : null;
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      pos[(vo + i) * 3] = p.getX(i);
      pos[(vo + i) * 3 + 1] = p.getY(i);
      pos[(vo + i) * 3 + 2] = p.getZ(i);
    }
    if (idx && g.index) {
      for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
      io += g.index.count;
    } else if (idx) {
      for (let i = 0; i < p.count; i++) idx[io + i] = i + vo;
      io += p.count;
    }
    vo += p.count;
  }
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (idx) out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeVertexNormals();
  return out;
}
