import * as THREE from 'three';
import {
  arch,
  box,
  cylinder,
  group,
  label,
  mat,
  mesh,
  palette as p,
  rod,
  sphere,
  torus,
} from '../world/primitives';
import { artTexture, fabricMaterial } from '../world/textures';
import type { ToyModel } from './types';
export function blocks(): ToyModel {
  const root = new THREE.Group();
  const colors = [p.yellow, p.coral, p.green, p.blue, p.cream];
  const pieces: THREE.Object3D[] = [];
  [
    [-0.38, 0.19, 0.05],
    [0.05, 0.19, 0.1],
    [-0.16, 0.55, 0.07],
    [-0.16, 0.88, 0.07],
    [0.52, 0.15, 0.28],
    [-0.56, 0.14, 0.5],
    [0.24, 0.14, 0.57],
  ].forEach((v, i) => {
    const b =
      i === 3
        ? mesh(new THREE.ConeGeometry(0.27, 0.35, 4), mat(p.coral), root, v)
        : box(root, [0.32, i > 3 ? 0.23 : 0.33, 0.32], v, colors[i % 5], 0.035);
    b.rotation.y = i > 3 ? i * 0.72 : 0;
    pieces.push(b);
  });
  ['A', 'B'].forEach((t, i) =>
    label(root, t, 0.23, [-0.38 + i * 0.43, 0.2, 0.218], '#9e7150', i ? p.coral : p.yellow),
  );
  return {
    root,
    animate: (t, a) => {
      pieces[3].position.y = 0.88 + (a ? Math.max(0, Math.sin(t * 2.5)) * 0.3 : 0);
      pieces[3].rotation.y = a ? Math.sin(t) * 0.12 : 0;
    },
    reset: () => {
      pieces[3].position.y = 0.88;
    },
  };
}
export function book(): ToyModel {
  const root = new THREE.Group();
  box(root, [0.84, 0.065, 0.61], [0, 0.07, 0], p.green, 0.035);
  const left = group(root, [-0.01, 0.11, 0]),
    right = group(root, [0.01, 0.11, 0]);
  box(left, [0.39, 0.028, 0.54], [-0.2, 0, 0], p.ivory, 0.008);
  box(right, [0.39, 0.028, 0.54], [0.2, 0, 0], p.ivory, 0.008);
  const page = mesh(
    new THREE.PlaneGeometry(0.35, 0.48),
    new THREE.MeshStandardMaterial({ map: artTexture('book'), side: THREE.DoubleSide }),
    right,
    [0.2, 0.02, 0],
  );
  page.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 5; i++)
    box(
      left,
      [0.25, 0.002, 0.008],
      [-0.2, 0.018, -0.15 + i * 0.045],
      i === 0 ? p.coral : '#cdc4ae',
      0,
    );
  return {
    root,
    animate: (t, a) => {
      right.rotation.z = a ? Math.max(0, Math.sin(t * 1.25)) * 0.7 : 0;
    },
    reset: () => {
      right.rotation.z = 0;
    },
  };
}
export function xylophone(): ToyModel {
  const root = new THREE.Group();
  box(root, [0.9, 0.13, 0.56], [0, 0.13, 0], p.lightWood, 0.05);
  const bars: THREE.Object3D[] = [];
  [p.coral, p.yellow, p.mint, p.green, p.blue, '#b0aac4'].forEach((c, i) => {
    const x = -0.35 + i * 0.14;
    bars.push(box(root, [0.105, 0.06, 0.52 - i * 0.038], [x, 0.23, 0], c, 0.024));
    [1, -1].forEach((s) =>
      sphere(root, [0.02, 0.012, 0.02], [x, 0.267, s * (0.19 - i * 0.016)], p.ivory),
    );
  });
  const mallets = [group(root, [0.4, 0.3, 0.45]), group(root, [-0.35, 0.3, 0.4])];
  mallets.forEach((g, i) => {
    rod(
      g,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(i ? 0.18 : -0.15, 0, -0.42),
      0.025,
      p.wood,
    );
    sphere(g, [0.064, 0.064, 0.064], [i ? 0.18 : -0.15, 0, -0.42], p.ivory);
  });
  return {
    root,
    animate: (t, a) => {
      bars.forEach(
        (b, i) => (b.position.y = 0.23 + (a ? Math.max(0, Math.sin(t * 7 - i * 1.1)) * 0.015 : 0)),
      );
      mallets.forEach(
        (m, i) => (m.rotation.x = a ? Math.max(0, Math.sin(t * 7 + i * Math.PI)) * 0.55 : 0),
      );
    },
  };
}
export function teddy(): ToyModel {
  const root = new THREE.Group(),
    body = group(root);
  const fur = fabricMaterial('#c4996e'),
    light = fabricMaterial('#ead4af');
  sphere(body, [0.31, 0.37, 0.23], [0, 0.46, 0], fur);
  sphere(body, [0.18, 0.23, 0.055], [0, 0.43, 0.212], light);
  sphere(body, [0.29, 0.27, 0.25], [0, 0.88, 0], fur);
  [-1, 1].forEach((s) => {
    sphere(body, [0.115, 0.12, 0.08], [s * 0.22, 1.08, 0.015], fur);
    sphere(body, [0.07, 0.075, 0.025], [s * 0.22, 1.08, 0.086], light);
    sphere(body, [0.12, 0.2, 0.125], [s * 0.3, 0.52, 0.03], fur);
    sphere(body, [0.16, 0.13, 0.2], [s * 0.19, 0.18, 0.11], fur);
    sphere(body, [0.025, 0.032, 0.013], [s * 0.1, 0.92, 0.235], p.brown);
  });
  sphere(body, [0.12, 0.09, 0.05], [0, 0.81, 0.236], light);
  sphere(body, [0.043, 0.03, 0.025], [0, 0.85, 0.283], p.brown);
  box(body, [0.33, 0.08, 0.11], [0, 0.66, 0.17], p.green);
  sphere(body, [0.06, 0.05, 0.05], [0, 0.66, 0.24], p.darkGreen);
  return {
    root,
    animate: (t, a) => {
      body.rotation.z = a ? Math.sin(t * 2.4) * 0.11 : 0;
      body.position.y = a ? Math.sin(t * 2.4) * 0.025 : 0;
    },
  };
}
export function ball(): ToyModel {
  const root = new THREE.Group();
  const orb = group(root, [0, 0.31, 0]);
  const colors = [p.coral, p.cream, p.green, p.cream, p.yellow, p.cream];
  colors.forEach((c, i) =>
    mesh(new THREE.SphereGeometry(0.31, 12, 20, (i * Math.PI) / 3, Math.PI / 3), mat(c), orb),
  );
  return {
    root,
    animate: (t, a) => {
      orb.position.y = 0.31 + (a ? Math.abs(Math.sin(t * 3)) * 0.48 : 0);
      orb.rotation.z = a ? t * 0.8 : 0;
      orb.position.x = a ? Math.sin(t * 1.5) * 0.2 : 0;
    },
  };
}
export function castle(): ToyModel {
  const root = new THREE.Group();
  // A raised play deck with an accessible ladder and a gently curved slide.
  box(root, [2.35, 0.22, 1.55], [0, 0.98, 0], p.lightWood, 0.09);
  const towers = [
    [-0.91, 0, -0.35],
    [0.91, 0, -0.35],
  ];
  towers.forEach(([x, , z], i) => {
    cylinder(root, 0.38, 0.38, 1.85, [x, 1.0, z], i ? p.mint : p.cream, 32);
    torus(root, 0.365, 0.055, [x, 1.91, z], p.lightWood).rotation.x = Math.PI / 2;
    mesh(new THREE.ConeGeometry(0.55, 0.71, 32), mat(i ? p.green : p.coral), root, [x, 2.3, z]);
    cylinder(root, 0.016, 0.016, 0.44, [x, 2.85, z], p.wood, 10);
    const flag = new THREE.Shape();
    flag.moveTo(0, 0);
    flag.lineTo(0.32, -0.09);
    flag.lineTo(0, -0.19);
    mesh(
      new THREE.ShapeGeometry(flag),
      new THREE.MeshStandardMaterial({ color: p.yellow, side: THREE.DoubleSide }),
      root,
      [x, 3.02, z],
    );
    arch(root, 0.25, 0.44, 0.015, [x, 1.13, z + 0.365], p.darkGreen);
  });
  box(root, [1.32, 0.59, 0.16], [0, 1.4, -0.54], p.cream, 0.035);
  for (let i = 0; i < 5; i++)
    box(root, [0.2, 0.23, 0.2], [-0.54 + i * 0.27, 1.79, -0.54], p.cream, 0.025);
  box(root, [1.35, 0.85, 0.2], [0, 0.5, -0.54], p.cream);
  arch(root, 0.58, 0.78, 0.025, [0, 0.11, -0.413], p.wood);
  arch(root, 0.44, 0.66, 0.028, [0, 0.11, -0.373], '#af9471');
  // Ladder faces the open center of the room.
  [-0.34, 0.34].forEach((x) =>
    rod(
      root,
      new THREE.Vector3(x - 0.43, 0.06, 1.26),
      new THREE.Vector3(x - 0.43, 1.08, 0.55),
      0.055,
      p.wood,
    ),
  );
  for (let i = 0; i < 5; i++)
    rod(
      root,
      new THREE.Vector3(-0.77, 0.18 + i * 0.19, 1.18 - i * 0.133),
      new THREE.Vector3(-0.09, 0.18 + i * 0.19, 1.18 - i * 0.133),
      0.04,
      p.lightWood,
    );
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.6, 1.11, 0.45),
    new THREE.Vector3(0.6, 0.99, 0.86),
    new THREE.Vector3(0.6, 0.34, 1.5),
    new THREE.Vector3(0.6, 0.12, 1.95),
    new THREE.Vector3(0.6, 0.12, 2.2),
  ]);
  const verts: number[] = [],
    indices: number[] = [];
  const points = curve.getPoints(40);
  points.forEach((v, i) => {
    verts.push(v.x - 0.3, v.y, v.z, v.x + 0.3, v.y, v.z);
    if (i < 40) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: p.yellow, roughness: 0.56, side: THREE.DoubleSide }),
    root,
  );
  [-0.32, 0.32].forEach((offset) => {
    const rail = new THREE.CatmullRomCurve3(
      points.map((v) => new THREE.Vector3(v.x + offset, v.y + 0.085, v.z)),
    );
    mesh(new THREE.TubeGeometry(rail, 40, 0.047, 8, false), mat('#edc368'), root);
  });
  return { root };
}
export function rocker(): ToyModel {
  const root = new THREE.Group(),
    horse = group(root);
  [-0.24, 0.24].forEach((x) => {
    const pts = Array.from({ length: 21 }, (_, i) => {
      const z = -0.63 + i * 0.063;
      return new THREE.Vector3(x, 0.08 + z * z * 0.45, z);
    });
    mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.048, 8, false),
      mat(p.wood),
      horse,
    );
    [-0.3, 0.3].forEach((z) =>
      rod(
        horse,
        new THREE.Vector3(x, 0.13, z),
        new THREE.Vector3(x, 0.5, z * 0.8),
        0.045,
        p.lightWood,
      ),
    );
  });
  box(horse, [0.52, 0.17, 0.68], [0, 0.51, 0], p.cream, 0.08);
  sphere(horse, [0.17, 0.27, 0.2], [0, 0.76, -0.29], p.lightWood);
  sphere(horse, [0.16, 0.18, 0.28], [0, 0.99, -0.29], p.lightWood);
  [-1, 1].forEach((s) => {
    sphere(horse, [0.06, 0.13, 0.06], [s * 0.11, 1.15, -0.19], p.lightWood);
    sphere(horse, [0.018, 0.026, 0.018], [s * 0.15, 1.03, -0.39], p.brown);
  });
  rod(
    horse,
    new THREE.Vector3(-0.32, 0.8, -0.26),
    new THREE.Vector3(0.32, 0.8, -0.26),
    0.035,
    p.wood,
  );
  return {
    root,
    animate: (t, a) => {
      horse.rotation.x = a ? Math.sin(t * 2.8) * 0.13 : Math.sin(t) * 0.025;
    },
  };
}
export function stackingRings(parent: THREE.Object3D, position: number[]) {
  const g = group(parent, position);
  cylinder(g, 0.26, 0.29, 0.09, [0, 0.07, 0], p.lightWood);
  cylinder(g, 0.035, 0.035, 0.72, [0, 0.44, 0], p.wood);
  [p.coral, p.yellow, p.green, p.blue].forEach((c, i) => {
    const r = torus(g, 0.19 - i * 0.034, 0.057, [0, 0.2 + i * 0.135, 0], c);
    r.rotation.x = Math.PI / 2;
  });
  sphere(g, [0.075, 0.075, 0.075], [0, 0.82, 0], p.yellow);
}
export function train(parent: THREE.Object3D, position: number[]) {
  const g = group(parent, position);
  [p.green, p.yellow, p.coral].forEach((c, i) => {
    box(g, [0.3, 0.16, 0.23], [i * 0.39, 0.15, 0], c);
    [-1, 1].forEach((s) =>
      [-0.085, 0.085].forEach((x) => {
        const w = cylinder(g, 0.062, 0.062, 0.045, [i * 0.39 + x, 0.075, s * 0.13], p.brown, 16);
        w.rotation.x = Math.PI / 2;
      }),
    );
    if (!i) {
      box(g, [0.13, 0.19, 0.21], [-0.07, 0.32, 0], p.green);
      cylinder(g, 0.045, 0.045, 0.15, [0.085, 0.32, 0], p.wood, 16);
    } else box(g, [0.19, 0.14, 0.18], [i * 0.39, 0.3, 0], p.lightWood);
  });
}
