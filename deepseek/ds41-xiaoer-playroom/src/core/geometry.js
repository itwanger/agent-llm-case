import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, glossy } from './materials.js';

/**
 * 圆润几何体小工具 —— 整个玩具房都由这些“软乎乎”的基础形状拼出来。
 */

export function rbox(w, h, d, radius = 0.05, mat) {
  const seg = 3;
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(radius, Math.min(w, h, d) / 2 - 1e-4));
  return new THREE.Mesh(g, mat);
}

export function sphere(r, mat, seg = 24) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)), mat);
}

export function capsule(r, len, mat, cap = 5, radial = 18) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, cap, radial), mat);
}

export function cyl(rt, rb, h, mat, seg = 20) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}

export function cone(r, h, mat, seg = 20) {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
}

export function torus(r, tube, mat, rSeg = 24, tSeg = 10, arc = Math.PI * 2) {
  return new THREE.Mesh(new THREE.TorusGeometry(r, tube, tSeg, rSeg, arc), mat);
}

export function plane(w, h, mat) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

/** 带软阴影的网格：一次性打开投影/接收投影 */
export function shadowed(mesh, { cast = true, receive = false } = {}) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

/** 在两点之间连一根圆柱（做栏杆 / 斜撑很方便） */
export function connect(a, b, radius, mat, seg = 12) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, seg), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export function group(x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

/** 把一棵子树整体设为投影 / 接收阴影 */
export function shadowTree(obj, cast = true, receive = false) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}

/** 让某个物体整体换成卡通材质（保留贴图） */
export function toonify(obj) {
  obj.traverse((o) => {
    if (o.isMesh && o.material) {
      const m = o.material;
      if (m.isMeshStandardMaterial) {
        o.material = toon(m.color.getHex(), { map: m.map || null, emissive: m.emissive ? m.emissive.clone() : undefined });
      }
    }
  });
  return obj;
}

export { toon, glossy };
