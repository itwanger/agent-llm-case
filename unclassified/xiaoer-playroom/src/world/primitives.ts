import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const palette = {
  cream: '#f4ebd5',
  ivory: '#fff9e8',
  wood: '#cda376',
  lightWood: '#e7c599',
  green: '#8da88b',
  darkGreen: '#4c6c55',
  mint: '#bdd0b2',
  yellow: '#edc768',
  coral: '#d9967f',
  blue: '#9ebfcb',
  pink: '#deb6ad',
  brown: '#655343',
};
const materials = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, roughness = 0.85) {
  const key = color + roughness;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
  return materials.get(key)!;
}
export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
  position: number[] = [0, 0, 0],
) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(position[0], position[1], position[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const rounded = new Map<string, THREE.BufferGeometry>();
export function box(
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: string | THREE.Material,
  radius = 0.04,
) {
  const key = [...size, radius].join(',');
  if (!rounded.has(key))
    rounded.set(
      key,
      radius > 0
        ? new RoundedBoxGeometry(
            size[0],
            size[1],
            size[2],
            2,
            Math.min(radius, ...size.map((n) => n / 2)),
          )
        : new THREE.BoxGeometry(...(size as [number, number, number])),
    );
  return mesh(rounded.get(key)!, typeof color === 'string' ? mat(color) : color, parent, position);
}
const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);
export function sphere(
  parent: THREE.Object3D,
  scale: number[],
  position: number[],
  color: string | THREE.Material,
) {
  const m = mesh(sphereGeometry, typeof color === 'string' ? mat(color) : color, parent, position);
  m.scale.set(...(scale as [number, number, number]));
  return m;
}
export function cylinder(
  parent: THREE.Object3D,
  top: number,
  bottom: number,
  height: number,
  position: number[],
  color: string,
  segments = 32,
) {
  return mesh(
    new THREE.CylinderGeometry(top, bottom, height, segments),
    mat(color),
    parent,
    position,
  );
}
export function torus(
  parent: THREE.Object3D,
  radius: number,
  tube: number,
  position: number[],
  color: string,
) {
  return mesh(new THREE.TorusGeometry(radius, tube, 10, 48), mat(color), parent, position);
}
export function rod(
  parent: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  color: string,
) {
  const m = cylinder(
    parent,
    radius,
    radius,
    from.distanceTo(to),
    from.clone().add(to).multiplyScalar(0.5).toArray(),
    color,
    12,
  );
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  return m;
}
export function group(parent: THREE.Object3D, position = [0, 0, 0]) {
  const g = new THREE.Group();
  g.position.set(...(position as [number, number, number]));
  parent.add(g);
  return g;
}
export function canvasTexture(
  paint: (c: CanvasRenderingContext2D, size: number) => void,
  size = 512,
) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
export function label(
  parent: THREE.Object3D,
  text: string,
  width: number,
  position: number[],
  color = '#655343',
  background = '#f4ebd5',
) {
  const map = canvasTexture((ctx, s) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = color;
    ctx.font = '600 80px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, s / 2, s / 2);
  });
  return mesh(
    new THREE.PlaneGeometry(width, width),
    new THREE.MeshStandardMaterial({ map, roughness: 1 }),
    parent,
    position,
  );
}
export function archShape(width: number, height: number) {
  const s = new THREE.Shape();
  const r = width / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, height - r);
  s.absarc(0, height - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}
export function arch(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  position: number[],
  color: string,
) {
  return mesh(
    new THREE.ExtrudeGeometry(archShape(width, height), {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      curveSegments: 24,
    }),
    mat(color),
    parent,
    position,
  );
}
