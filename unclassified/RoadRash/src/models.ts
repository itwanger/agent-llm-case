import * as THREE from 'three';

const sphere = new THREE.SphereGeometry(0.5, 18, 14);
const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.16, 20);
wheelGeo.rotateZ(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.22, 12);
hubGeo.rotateZ(Math.PI / 2);
const carWheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 16);
carWheelGeo.rotateZ(Math.PI / 2);

const armGeo = new THREE.CapsuleGeometry(0.06, 0.5, 4, 8);
armGeo.rotateX(Math.PI / 2);
const legGeo = new THREE.CapsuleGeometry(0.085, 0.42, 4, 8);
const torsoGeo = new THREE.CapsuleGeometry(0.22, 0.4, 6, 12);
const forkGeo = new THREE.CapsuleGeometry(0.05, 0.5, 4, 8);
const exhaustGeo = new THREE.CapsuleGeometry(0.065, 0.85, 4, 10);
exhaustGeo.rotateX(Math.PI / 2);
const clubGeo = new THREE.CapsuleGeometry(0.04, 0.8, 4, 8);
clubGeo.rotateX(Math.PI / 2);

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

function paint(color: number) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3 });
}

export interface BikeView {
  group: THREE.Group;
  riderGroup: THREE.Group;
  wheelF: THREE.Mesh;
  wheelR: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  club: THREE.Mesh;
  mats: THREE.MeshStandardMaterial[];
}

export function createBike(color: number): BikeView {
  const group = new THREE.Group();
  const bodyMat = paint(color);
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.9, metalness: 0.05 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb9bec7, roughness: 0.32, metalness: 0.85 });
  const suitMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.55), roughness: 0.8, metalness: 0.05 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3, metalness: 0.1 });

  group.add(mesh(sphere, bodyMat, 0.4, 0.46, 1.5, 0, 0.64, 0.02));
  group.add(mesh(sphere, darkMat, 0.34, 0.26, 0.85, 0, 0.88, -0.5));
  group.add(mesh(forkGeo, metalMat, 1, 1, 1, 0.15, 0.6, 0.66)).children.at(-1)!.rotation.x = 0.35;
  group.add(mesh(forkGeo, metalMat, 1, 1, 1, -0.15, 0.6, 0.66)).children.at(-1)!.rotation.x = 0.35;
  group.add(mesh(cyl, metalMat, 0.14, 0.72, 0.14, 0, 1.0, 0.66)).children.at(-1)!.rotation.z = Math.PI / 2;
  const ex = mesh(exhaustGeo, metalMat, 1, 1, 1, -0.24, 0.46, -0.55);
  ex.rotation.y = -0.12;
  group.add(ex);
  const wheelF = mesh(wheelGeo, darkMat, 1, 1, 1, 0, 0.36, 0.78);
  const wheelR = mesh(wheelGeo, darkMat, 1, 1, 1, 0, 0.36, -0.72);
  const hubF = mesh(hubGeo, metalMat, 1, 1, 1, 0, 0.36, 0.78);
  const hubR = mesh(hubGeo, metalMat, 1, 1, 1, 0, 0.36, -0.72);
  group.add(wheelF, wheelR, hubF, hubR);

  const riderGroup = new THREE.Group();
  riderGroup.position.set(0, 0.92, -0.28);
  const torso = mesh(torsoGeo, suitMat, 1.05, 1.15, 0.95, 0, 0.34, 0);
  torso.rotation.x = 0.32;
  riderGroup.add(torso);
  const head = mesh(sphere, helmetMat, 0.34, 0.36, 0.36, 0, 0.76, 0.1);
  riderGroup.add(head);
  const legL = mesh(legGeo, darkMat, 1, 1, 1, 0.17, -0.14, -0.08);
  legL.rotation.x = 0.5;
  const legR = mesh(legGeo, darkMat, 1, 1, 1, -0.17, -0.14, -0.08);
  legR.rotation.x = 0.5;
  riderGroup.add(legL, legR);

  const armL = new THREE.Group();
  armL.position.set(0.27, 0.5, 0.05);
  armL.add(mesh(armGeo, suitMat, 1, 1, 1, 0, 0, 0.28));
  const armR = new THREE.Group();
  armR.position.set(-0.27, 0.5, 0.05);
  armR.add(mesh(armGeo, suitMat, 1, 1, 1, 0, 0, 0.28));
  const club = mesh(clubGeo, darkMat, 1, 1, 1, 0, 0.02, 0.6);
  club.rotation.x = 0.25;
  armR.add(club);
  riderGroup.add(armL, armR);
  group.add(riderGroup);

  return { group, riderGroup, wheelF, wheelR, armL, armR, club, mats: [bodyMat, suitMat, helmetMat] };
}

export function createCar(color: number): { group: THREE.Group; wheelF: THREE.Mesh[]; wheelR: THREE.Mesh[] } {
  const group = new THREE.Group();
  const bodyMat = paint(color);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.18, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.9, metalness: 0.05 });
  group.add(mesh(sphere, bodyMat, 1.95, 0.72, 4.3, 0, 0.66, 0));
  group.add(mesh(sphere, glassMat, 1.6, 0.62, 2.1, 0, 1.18, -0.25));
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
  group.add(mesh(sphere, lightMat, 0.34, 0.18, 0.1, -0.62, 0.72, 2.1));
  group.add(mesh(sphere, lightMat, 0.34, 0.18, 0.1, 0.62, 0.72, 2.1));
  group.add(mesh(sphere, tailMat, 0.34, 0.16, 0.1, -0.62, 0.78, -2.1));
  group.add(mesh(sphere, tailMat, 0.34, 0.16, 0.1, 0.62, 0.78, -2.1));
  const wf1 = mesh(carWheelGeo, darkMat, 1, 1, 1, -0.92, 0.38, 1.4);
  const wf2 = mesh(carWheelGeo, darkMat, 1, 1, 1, 0.92, 0.38, 1.4);
  const wr1 = mesh(carWheelGeo, darkMat, 1, 1, 1, -0.92, 0.38, -1.45);
  const wr2 = mesh(carWheelGeo, darkMat, 1, 1, 1, 0.92, 0.38, -1.45);
  group.add(wf1, wf2, wr1, wr2);
  return { group, wheelF: [wf1, wf2], wheelR: [wr1, wr2] };
}
