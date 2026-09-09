import * as THREE from 'three';

/**
 * 「涂鸦渲染」核心。
 *
 * 每个物体 = 纸色填充面 + 蓝圆珠笔描边（有时描两遍）。
 * 描边顶点带确定性抖动，看起来像手画的；每隔 0.1s 重新抖一次，
 * 就是手绘动画里经典的 boil（线条呼吸）。
 */

export const INK = 0x24408e;
export const INK_LIGHT = 0x6a83c4;
export const RED = 0xd8402f;
export const RED_DARK = 0x9c2a1c;
export const PAPER = 0xfaf6ea;
export const PAPER_SHADE = 0xeee5cf;

let hatchTex = null;
let crossHatchTex = null;
const matCache = new Map();

export function initDoodle(hatch, crossHatch) {
  hatchTex = hatch;
  crossHatchTex = crossHatch;
}

/** 按颜色缓存材质，避免几百个材质对象 */
export function inkFill(color = PAPER, { hatch = 0, opacity = 1, flat = true } = {}) {
  const key = `f|${color}|${hatch}|${opacity}|${flat}`;
  if (matCache.has(key)) return matCache.get(key);
  const map = hatch >= 2 ? crossHatchTex : hatch >= 1 ? hatchTex : null;
  const m = flat
    ? new THREE.MeshBasicMaterial({ color, map, transparent: opacity < 1, opacity })
    : new THREE.MeshLambertMaterial({ color, map, transparent: opacity < 1, opacity });
  matCache.set(key, m);
  return m;
}

export function inkLine(color = INK, opacity = 0.95) {
  const key = `l|${color}|${opacity}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  matCache.set(key, m);
  return m;
}

// ---------------------------------------------------------------- boil

const boilList = [];
let boilTimer = 0;
let boilSeed = 0;

function hash1(x, y, z, s) {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 41.3) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

function quant(v) {
  return Math.round(v * 512) / 512;
}

/**
 * 注册一条线做抖动。base 是原始顶点，之后每 tick 都在 base 上重新抖。
 */
export function registerBoil(line, amp = 0.02) {
  if (amp <= 0) return line;
  const attr = line.geometry.attributes.position;
  boilList.push({
    attr,
    base: new Float32Array(attr.array),
    amp,
  });
  return line;
}

/** 当前参与「线条呼吸」的描边数量（性能观测用） */
export function boilCount() {
  return boilList.length;
}

/** 每帧调用；内部按 0.1s 节流，做出 10fps 的手绘抖动 */
export function updateBoil(dt) {
  boilTimer += dt;
  if (boilTimer < 0.1) return;
  boilTimer = 0;
  boilSeed = (boilSeed + 1) % 97;
  const s = boilSeed;
  for (let n = 0; n < boilList.length; n++) {
    const { attr, base, amp } = boilList[n];
    const arr = attr.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i];
      const y = base[i + 1];
      const z = base[i + 2];
      const qx = quant(x);
      const qy = quant(y);
      const qz = quant(z);
      arr[i] = x + hash1(qx, qy, qz, s) * amp;
      arr[i + 1] = y + hash1(qy, qz, qx, s + 13) * amp;
      arr[i + 2] = z + hash1(qz, qx, qy, s + 29) * amp;
    }
    attr.needsUpdate = true;
  }
}

// ------------------------------------------------------------- doodles

function applyJitter(geo, amp) {
  if (amp <= 0) return geo;
  const attr = geo.attributes.position;
  const a = attr.array;
  const s = 7;
  for (let i = 0; i < a.length; i += 3) {
    const x = a[i];
    const y = a[i + 1];
    const z = a[i + 2];
    const qx = quant(x);
    const qy = quant(y);
    const qz = quant(z);
    a[i] = x + hash1(qx, qy, qz, s) * amp;
    a[i + 1] = y + hash1(qy, qz, qx, s + 13) * amp;
    a[i + 2] = z + hash1(qz, qx, qy, s + 29) * amp;
  }
  attr.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/**
 * 造一个涂鸦物体。
 * @returns {{group: THREE.Group, fill: THREE.Mesh, line: THREE.LineSegments, edges: THREE.LineSegments}}
 */
export function doodle(geometry, opts = {}) {
  const {
    fillColor = PAPER,
    fillHatch = 0,
    fillOpacity = 1,
    flat = true,
    ink = INK,
    inkOpacity = 0.95,
    doubleStroke = true,
    jitter = 0.02,
    boil = true,
    threshold = 1,
    hideFill = false,
  } = opts;

  const g = new THREE.Group();

  const fill = new THREE.Mesh(geometry, inkFill(fillColor, { hatch: fillHatch, opacity: fillOpacity, flat }));
  fill.visible = !hideFill;
  g.add(fill);

  const edgeGeo = new THREE.EdgesGeometry(geometry, threshold);
  applyJitter(edgeGeo, jitter);
  const line = new THREE.LineSegments(edgeGeo, inkLine(ink, inkOpacity));
  g.add(line);
  if (boil) registerBoil(line, jitter * 0.75);

  let edges = line;
  if (doubleStroke) {
    // 第二遍描边：稍微偏移 + 更淡，模拟笔尖来回描
    const e2 = new THREE.LineSegments(edgeGeo.clone(), inkLine(ink, inkOpacity * 0.34));
    const a = e2.geometry.attributes.position.array;
    const off = 0.022;
    for (let i = 0; i < a.length; i += 3) {
      a[i] += hash1(a[i], a[i + 1], a[i + 2], 3) * off;
      a[i + 1] += hash1(a[i + 1], a[i + 2], a[i], 9) * off;
      a[i + 2] += hash1(a[i + 2], a[i], a[i + 1], 17) * off;
    }
    e2.geometry.attributes.position.needsUpdate = true;
    g.add(e2);
    edges = e2;
  }

  g.userData.fill = fill;
  g.userData.line = line;
  g.userData.line2 = edges;
  return g;
}

/** 一个涂鸦盒子（含排线阴影面） */
export function doodleBox(w, h, d, opts = {}) {
  return doodle(new THREE.BoxGeometry(w, h, d), opts);
}

/** 只有线、没有填充的物体 */
export function doodleWire(geometry, opts = {}) {
  return doodle(geometry, { ...opts, hideFill: true, fillOpacity: 0 });
}

/**
 * 射线 vs AABB（slab 法），返回 {t, normal} 或 null。
 * 自己实现是为了稳定：不依赖 raycaster 对透明/不可见物体的行为。
 */
export function rayBox(ox, oy, oz, dx, dy, dz, box) {
  let tmin = -Infinity;
  let tmax = Infinity;
  let nAxis = 0;
  let nSign = 0;

  for (let a = 0; a < 3; a++) {
    const o = a === 0 ? ox : a === 1 ? oy : oz;
    const d = a === 0 ? dx : a === 1 ? dy : dz;
    const lo = a === 0 ? box.min.x : a === 1 ? box.min.y : box.min.z;
    const hi = a === 0 ? box.max.x : a === 1 ? box.max.y : box.max.z;

    if (Math.abs(d) < 1e-8) {
      if (o < lo || o > hi) return null;
      continue;
    }
    const inv = 1 / d;
    let t1 = (lo - o) * inv;
    let t2 = (hi - o) * inv;
    let sign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      sign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nAxis = a;
      nSign = sign;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  const t = tmin >= 0 ? tmin : 0;
  const n = { x: 0, y: 0, z: 0 };
  if (nAxis === 0) n.x = nSign;
  else if (nAxis === 1) n.y = nSign;
  else n.z = nSign;
  return { t, n, px: ox + dx * t, py: oy + dy * t, pz: oz + dz * t };
}

/** 两点之间有没有被盒子挡住（敌人视线 / 近战判定用） */
export function segmentBlocked(ax, ay, az, bx, by, bz, boxes, ignore = null) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-5) return false;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b === ignore) continue;
    const hit = rayBox(ax, ay, az, dx / len, dy / len, dz / len, b);
    if (hit && hit.t < len - 0.02) return true;
  }
  return false;
}
