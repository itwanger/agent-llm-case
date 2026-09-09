import * as THREE from 'three';
import {
  archShape,
  box,
  cylinder,
  group,
  mat,
  mesh,
  palette as p,
  rod,
  sphere,
  torus,
} from './primitives';
import { artTexture, fabricMaterial, random, woodTexture } from './textures';
import { stackingRings, teddy, train } from '../toys/models';

export function createRoom(scene: THREE.Scene) {
  const room = group(scene);
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.83 });
  box(room, [10.9, 0.36, 7.15], [0, -0.2, 0], '#e5d2b2', 0.15);
  box(room, [10.65, 0.13, 6.94], [0, 0.015, 0], wood, 0.055);
  const back = new THREE.Shape();
  back.moveTo(-5.35, 0);
  back.lineTo(5.35, 0);
  back.lineTo(5.35, 3.6);
  back.lineTo(-5.35, 3.6);
  back.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-3.9, 1);
  hole.lineTo(-1.1, 1);
  hole.lineTo(-1.1, 2.18);
  hole.absarc(-2.5, 2.18, 1.4, 0, Math.PI, false);
  hole.lineTo(-3.9, 1);
  back.holes.push(hole);
  mesh(
    new THREE.ExtrudeGeometry(back, { depth: 0.18, bevelEnabled: false, curveSegments: 48 }),
    mat('#f1e8d5'),
    room,
    [0, 0, -3.47],
  );
  box(room, [0.18, 3.6, 6.98], [-5.32, 1.8, 0], '#e9e3cf', 0.035);
  box(room, [10.75, 0.14, 0.18], [0, 0.14, -3.23], p.lightWood, 0.015);
  box(room, [0.18, 0.14, 6.9], [-5.18, 0.14, 0], p.lightWood, 0.015);
  box(room, [10.9, 0.09, 0.25], [0, 3.62, -3.36], p.ivory, 0.04);
  box(room, [0.25, 0.09, 7.07], [-5.3, 3.62, 0], p.ivory, 0.04);
  // Wainscoting creates a tactile, handmade miniature silhouette.
  for (let x = -5.1; x < 5.3; x += 0.34)
    box(room, [0.018, 0.77, 0.018], [x, 0.47, -3.26], '#d9cfb5', 0.005);
  box(room, [10.65, 0.07, 0.065], [0, 0.89, -3.22], p.lightWood, 0.014);
  for (let z = -3.2; z < 3.5; z += 0.34)
    box(room, [0.018, 0.77, 0.018], [-5.21, 0.47, z], '#d9cfb5', 0.005);
  box(room, [0.07, 0.07, 6.9], [-5.17, 0.89, 0], p.lightWood, 0.014);
  // Window: an actual opening, a timber arch, distant foliage, and linen curtains.
  const windowShape = archShape(2.8, 2.58);
  mesh(
    new THREE.ShapeGeometry(windowShape),
    new THREE.MeshBasicMaterial({ color: '#d7e5cc', side: THREE.DoubleSide }),
    room,
    [-2.5, 1, -3.63],
  );
  const trim: THREE.Vector3[] = [
    new THREE.Vector3(-3.92, 1, -3.22),
    new THREE.Vector3(-3.92, 2.18, -3.22),
  ];
  for (let i = 0; i <= 36; i++) {
    const a = Math.PI - (i / 36) * Math.PI;
    trim.push(new THREE.Vector3(-2.5 + 1.42 * Math.cos(a), 2.18 + 1.42 * Math.sin(a), -3.22));
  }
  trim.push(new THREE.Vector3(-1.08, 1, -3.22));
  mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trim), 80, 0.062, 8, false),
    mat('#d2b78c'),
    room,
  );
  box(room, [3.05, 0.13, 0.42], [-2.5, 1, -3.21], p.ivory, 0.025);
  box(room, [0.065, 2.49, 0.08], [-2.5, 2.27, -3.24], p.ivory, 0.018);
  box(room, [2.78, 0.065, 0.08], [-2.5, 2.17, -3.24], p.ivory, 0.012);
  for (let i = 0; i < 7; i++) {
    const foliage = sphere(
      room,
      [0.65, 0.6, 0.08],
      [-3.85 + i * 0.43, 1.13 + (i % 3) * 0.12, -3.53],
      ['#bdcda9', '#a8bf9a', '#cbd7b6'][i % 3],
    );
    foliage.castShadow = false;
  }
  const curtains = fabricMaterial('#fff8e4');
  [-4.13, -0.86].forEach((x, side) => {
    for (let i = 0; i < 5; i++) {
      const fold = box(
        room,
        [0.11, 2.45, 0.13],
        [x + i * 0.057, 2.15, -3.07 + Math.sin(i * 1.6) * 0.04],
        curtains,
        0.05,
      );
      fold.rotation.z = side ? -0.012 : 0.012;
    }
    box(room, [0.4, 0.085, 0.24], [x + 0.1, 1.72, -3.03], p.lightWood);
  });
  rod(
    room,
    new THREE.Vector3(-4.4, 3.47, -3.05),
    new THREE.Vector3(-0.45, 3.47, -3.05),
    0.035,
    p.wood,
  );
  // A large foam mat, with padded tiles and a stitched fabric edge.
  box(room, [9.94, 0.12, 6.12], [0.03, 0.15, 0.12], fabricMaterial('#ebe5c9'), 0.13);
  const tileColors = ['#e2d7b6', '#e4dfc5', '#afc295', '#c3d0a6', '#eee4ca', '#b5c89d'];
  for (let x = 0; x < 8; x++)
    for (let z = 0; z < 5; z++) {
      const c = tileColors[(x * 3 + z * 2 + (x % 2)) % tileColors.length];
      box(
        room,
        [1.215, 0.055, 1.195],
        [-4.29 + x * 1.23, 0.226, -2.3 + z * 1.21],
        fabricMaterial(c),
        0.035,
      );
    }
  // Dashed stitching on the front edge.
  for (let i = 0; i < 84; i++)
    box(room, [0.043, 0.005, 0.009], [-4.78 + i * 0.114, 0.266, 3.12], '#b7b59a', 0.002);
  // Built-in, rounded bookshelf: storage baskets below, picture books above.
  const shelf = group(room, [0.1, 0, -2.91]);
  box(shelf, [2.48, 0.12, 0.64], [0, 0.13, 0], p.lightWood);
  box(shelf, [2.48, 0.12, 0.64], [0, 0.75, 0], p.lightWood);
  box(shelf, [2.48, 0.12, 0.64], [0, 1.35, 0], p.lightWood);
  [-1.18, 0, 1.18].forEach((x) => box(shelf, [0.1, 1.35, 0.61], [x, 0.72, 0], p.lightWood));
  box(shelf, [2.45, 1.2, 0.075], [0, 0.72, -0.27], '#dfc197');
  [-0.61, 0.61].forEach((x) => {
    box(shelf, [0.92, 0.41, 0.45], [x, 0.42, 0.025], fabricMaterial('#cbb68f'), 0.06);
    for (let i = 0; i < 8; i++)
      box(shelf, [0.88, 0.014, 0.006], [x, 0.24 + i * 0.045, 0.253], '#b39b76', 0.003);
    box(shelf, [0.2, 0.062, 0.012], [x, 0.53, 0.263], '#927c5e', 0.013);
  });
  const rng = random(36),
    cols = [p.green, p.coral, p.blue, p.yellow, p.cream, '#b1b99a'];
  for (let i = 0; i < 13; i++) {
    const h = 0.32 + rng() * 0.15;
    const b = box(
      shelf,
      [0.09, h, 0.28],
      [-1.01 + i * 0.097, 0.83 + h / 2, 0.05],
      cols[i % 6],
      0.012,
    );
    b.rotation.z = i > 8 ? -0.12 : 0;
    box(b, [0.055, 0.018, 0.008], [0, -h * 0.2, 0.146], p.ivory, 0.003);
  }
  for (let i = 0; i < 3; i++) {
    const b = box(shelf, [0.53, 0.06, 0.32], [0.7, 0.87 + i * 0.064, 0.03], cols[i + 1]);
    b.rotation.y = i * 0.09;
  }
  stackingRings(shelf, [-0.77, 1.42, 0]);
  const bookDisplay = group(shelf, [0.2, 1.42, -0.06]);
  bookDisplay.rotation.x = -0.15;
  box(bookDisplay, [0.47, 0.59, 0.065], [0, 0.3, 0], p.green);
  mesh(
    new THREE.PlaneGeometry(0.41, 0.52),
    new THREE.MeshStandardMaterial({ map: artTexture('garden') }),
    bookDisplay,
    [0, 0.3, 0.036],
  );
  sphere(shelf, [0.13, 0.16, 0.12], [0.91, 1.55, 0], p.yellow);
  sphere(shelf, [0.09, 0.1, 0.09], [0.91, 1.75, 0], p.yellow);
  sphere(shelf, [0.04, 0.027, 0.06], [0.91, 1.75, 0.09], p.coral);
  // Framed illustrations on the left wall.
  function picture(z: number, y: number, kind: 'rabbit' | 'rainbow', size: number) {
    const g = group(room, [-5.185, y, z]);
    g.rotation.y = Math.PI / 2;
    box(g, [size + 0.12, size + 0.16, 0.07], [0, 0, 0], p.lightWood, 0.025);
    mesh(
      new THREE.PlaneGeometry(size, size + 0.04),
      new THREE.MeshStandardMaterial({ map: artTexture(kind) }),
      g,
      [0, 0, 0.039],
    );
  }
  picture(-1.87, 2.2, 'rabbit', 0.9);
  picture(-0.5, 2.38, 'rainbow', 0.75);
  // Pegs with a little bag.
  box(room, [0.12, 0.12, 1.5], [-5.16, 1.4, 0.68], p.lightWood);
  [0, 0.5, 1].forEach((z) =>
    rod(
      room,
      new THREE.Vector3(-5.1, 1.4, z + 0.1),
      new THREE.Vector3(-4.94, 1.4, z + 0.1),
      0.045,
      p.wood,
    ),
  );
  const bag = box(room, [0.22, 0.43, 0.36], [-4.94, 1.04, 0.59], fabricMaterial('#c9d0aa'), 0.09);
  bag.rotation.x = 0.08;
  const handle = torus(room, 0.115, 0.023, [-4.96, 1.35, 0.59], p.darkGreen);
  handle.rotation.y = Math.PI / 2;
  // Low reading nook, stitched cushions and a fabric canopy.
  const nook = group(room, [-4.35, 0.14, 1.25]);
  box(nook, [1.26, 0.23, 1.76], [0, 0.1, 0], p.lightWood, 0.12);
  box(nook, [1.18, 0.23, 1.67], [0, 0.3, 0], fabricMaterial('#e6c699'), 0.13);
  box(nook, [0.19, 0.7, 1.66], [-0.49, 0.61, 0], fabricMaterial('#ded6b8'), 0.085);
  const cushion = box(
    nook,
    [0.3, 0.58, 0.59],
    [-0.25, 0.63, -0.38],
    fabricMaterial('#91aa93'),
    0.14,
  );
  cushion.rotation.z = 0.18;
  const pillow = box(nook, [0.3, 0.48, 0.56], [-0.24, 0.61, 0.36], fabricMaterial('#f3ebd2'), 0.13);
  pillow.rotation.z = 0.26;
  // Little daisy on the pillow.
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7;
    sphere(
      nook,
      [0.035, 0.08, 0.065],
      [-0.077, 0.64 + Math.cos(a) * 0.11, 0.36 + Math.sin(a) * 0.11],
      p.ivory,
    );
  }
  sphere(nook, [0.043, 0.052, 0.052], [-0.045, 0.64, 0.36], p.yellow);
  // Plants and loose room details.
  plant(room, [-4.56, 0, -2.78], 0.7);
  plant(room, [4.88, 0, 2.73], 0.65);
  const basket = group(room, [-2.83, 0.12, 2.76]);
  cylinder(basket, 0.38, 0.3, 0.4, [0, 0.2, 0], '#ceb080');
  torus(basket, 0.365, 0.035, [0, 0.4, 0], p.wood).rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const ring = torus(basket, 0.31 + i * 0.007, 0.012, [0, 0.05 + i * 0.044, 0], '#bfa073');
    ring.rotation.x = Math.PI / 2;
  }
  const smallBear = teddy().root;
  smallBear.scale.setScalar(0.48);
  smallBear.position.set(0.02, 0.22, 0.02);
  smallBear.rotation.z = -0.3;
  basket.add(smallBear);
  stackingRings(room, [-3.27, 0.25, -1.76]);
  train(room, [-1.08, 0.25, 2.22]);
  // Wooden play arch with beads, tucked at the side, leaving the center free.
  const playArch = group(room, [-3.34, 0.24, -0.6]);
  [-0.37, 0.37].forEach((z) => {
    rod(playArch, new THREE.Vector3(-0.56, 0, z), new THREE.Vector3(0, 0.96, 0), 0.035, p.wood);
    rod(playArch, new THREE.Vector3(0.56, 0, z), new THREE.Vector3(0, 0.96, 0), 0.035, p.wood);
  });
  rod(
    playArch,
    new THREE.Vector3(-0.56, 0.95, 0),
    new THREE.Vector3(0.56, 0.95, 0),
    0.035,
    p.lightWood,
  );
  [-0.32, 0, 0.32].forEach((x, i) => {
    rod(playArch, new THREE.Vector3(x, 0.92, 0), new THREE.Vector3(x, 0.61, 0), 0.008, p.cream);
    sphere(playArch, [0.07, 0.07, 0.055], [x, 0.55, 0], cols[i]);
    const r = torus(playArch, 0.075, 0.02, [x, 0.44, 0], cols[i]);
    r.rotation.y = 0.2;
  });
  // Bunting overhead.
  const rope = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, 3.27, -3.12),
    new THREE.Vector3(1.5, 2.87, -3.11),
    new THREE.Vector3(3.9, 3.32, -3.1),
  ]);
  mesh(new THREE.TubeGeometry(rope, 32, 0.012, 6, false), mat(p.wood), room);
  for (let i = 0; i < 10; i++) {
    const v = rope.getPoint(0.05 + i * 0.095);
    const flag = new THREE.Shape();
    flag.moveTo(-0.11, 0);
    flag.lineTo(0.11, 0);
    flag.lineTo(0, -0.23);
    flag.closePath();
    mesh(
      new THREE.ShapeGeometry(flag),
      new THREE.MeshStandardMaterial({ color: cols[i % 6], side: THREE.DoubleSide }),
      room,
      v.toArray(),
    );
  }
  // Sunlight footprints, softened with a radial alpha texture.
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = sunCanvas.height = 256;
  const ctx = sunCanvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 5, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,249,211,.22)');
  grad.addColorStop(0.8, 'rgba(255,249,211,.14)');
  grad.addColorStop(1, 'rgba(255,249,211,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const lightPatch = mesh(
    new THREE.PlaneGeometry(5.6, 3.7),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sunCanvas),
      transparent: true,
      depthWrite: false,
    }),
    room,
    [-1.65, 0.26, 0.1],
  );
  lightPatch.rotation.x = -Math.PI / 2;
  lightPatch.rotation.z = -0.6;
  lightPatch.castShadow = false;
  return room;
}
function plant(parent: THREE.Object3D, pos: number[], scale: number) {
  const g = group(parent, pos);
  g.scale.setScalar(scale);
  cylinder(g, 0.3, 0.22, 0.48, [0, 0.25, 0], '#e9dac0');
  cylinder(g, 0.27, 0.27, 0.035, [0, 0.51, 0], '#8b7955');
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4,
      y = 0.65 + i * 0.08;
    rod(
      g,
      new THREE.Vector3(0, 0.45, 0),
      new THREE.Vector3(Math.sin(a) * 0.32, y, Math.cos(a) * 0.3),
      0.013,
      p.darkGreen,
    );
    const leaf = sphere(
      g,
      [0.13, 0.31, 0.055],
      [Math.sin(a) * 0.34, y + 0.12, Math.cos(a) * 0.32],
      i % 2 ? p.green : p.darkGreen,
    );
    leaf.rotation.set(0.35, a, Math.sin(a) * 0.8);
  }
}
