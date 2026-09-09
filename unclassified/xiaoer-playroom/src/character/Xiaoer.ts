import * as THREE from 'three';
import { box, group, mat, mesh, palette as p, sphere } from '../world/primitives';
import { fabricMaterial } from '../world/textures';
export interface Pose {
  bodyY: number;
  bodyX: number;
  bodyZ: number;
  headX: number;
  headY: number;
  headZ: number;
  armLX: number;
  armRX: number;
  armLZ: number;
  armRZ: number;
  elbowL: number;
  elbowR: number;
  legLX: number;
  legRX: number;
  kneeL: number;
  kneeR: number;
}
export const neutralPose: Pose = {
  bodyY: 0,
  bodyX: 0,
  bodyZ: 0,
  headX: 0,
  headY: 0,
  headZ: 0,
  armLX: 0,
  armRX: 0,
  armLZ: 0.1,
  armRZ: -0.1,
  elbowL: 0,
  elbowR: 0,
  legLX: 0,
  legRX: 0,
  kneeL: 0,
  kneeR: 0,
};
export class Xiaoer {
  readonly root = new THREE.Group();
  private rig = group(this.root);
  private head: THREE.Group;
  private arms: THREE.Group[] = [];
  private elbows: THREE.Group[] = [];
  private legs: THREE.Group[] = [];
  private knees: THREE.Group[] = [];
  private eyes: THREE.Object3D[] = [];
  private pose = { ...neutralPose };
  constructor() {
    const skin = '#efc49f',
      hair = '#3b3029';
    const outfit = fabricMaterial('#91a285'),
      shirt = fabricMaterial('#fbefd7');
    box(this.rig, [0.4, 0.4, 0.27], [0, 0.66, 0], shirt, 0.12);
    sphere(this.rig, [0.223, 0.235, 0.168], [0, 0.51, 0.006], outfit);
    box(this.rig, [0.3, 0.26, 0.052], [0, 0.67, 0.143], outfit, 0.045);
    [-1, 1].forEach((s) => {
      box(this.rig, [0.056, 0.27, 0.038], [s * 0.137, 0.78, 0.142], outfit, 0.018);
      sphere(this.rig, [0.022, 0.022, 0.013], [s * 0.135, 0.702, 0.18], p.wood);
    });
    box(this.rig, [0.15, 0.104, 0.016], [0, 0.608, 0.183], fabricMaterial('#a8b69b'), 0.027);
    // A little embroidered sun on his overalls.
    sphere(this.rig, [0.029, 0.03, 0.012], [0, 0.622, 0.201], p.yellow);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const stitch = box(
        this.rig,
        [0.011, 0.025, 0.007],
        [Math.sin(a) * 0.045, 0.622 + Math.cos(a) * 0.045, 0.201],
        p.ivory,
        0.003,
      );
      stitch.rotation.z = -a;
    }
    this.head = group(this.rig, [0, 0.96, 0.02]);
    sphere(this.head, [0.305, 0.305, 0.277], [0, 0.08, 0], skin);
    [-1, 1].forEach((s) => {
      sphere(this.head, [0.075, 0.1, 0.065], [s * 0.297, 0.062, 0.012], skin);
      sphere(this.head, [0.032, 0.051, 0.023], [s * 0.335, 0.062, 0.053], '#dba985');
    });
    // Rounded hair cap and irregular bangs preserve a soft toddler silhouette.
    mesh(
      new THREE.SphereGeometry(0.307, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.49),
      mat(hair),
      this.head,
      [0, 0.09, 0],
    ).scale.set(1, 1, 0.96);
    [-0.23, -0.14, -0.035, 0.085, 0.19].forEach((x, i) => {
      const bang = sphere(
        this.head,
        [0.085, 0.091 + (i % 2) * 0.018, 0.055],
        [x, 0.233 + Math.abs(x) * 0.1, 0.195],
        hair,
      );
      bang.rotation.z = x * 2;
    });
    const tuft = sphere(this.head, [0.074, 0.11, 0.07], [-0.04, 0.391, -0.03], hair);
    tuft.rotation.z = -0.4;
    [-1, 1].forEach((s) => {
      const eye = group(this.head, [s * 0.106, 0.077, 0.257]);
      sphere(eye, [0.029, 0.039, 0.019], [0, 0, 0], '#352f29');
      sphere(eye, [0.009, 0.011, 0.006], [-0.007, 0.012, 0.017], '#fff9e8');
      this.eyes.push(eye);
      sphere(this.head, [0.057, 0.032, 0.01], [s * 0.181, 0.008, 0.236], '#e5a38d');
      const brow = sphere(this.head, [0.036, 0.011, 0.009], [s * 0.113, 0.145, 0.251], hair);
      brow.rotation.z = s * -0.08;
    });
    sphere(this.head, [0.038, 0.031, 0.041], [0, 0.019, 0.281], skin);
    const smile = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.036, -0.043, 0.265),
      new THREE.Vector3(0, -0.055, 0.272),
      new THREE.Vector3(0.036, -0.043, 0.265),
    ]);
    mesh(new THREE.TubeGeometry(smile, 16, 0.006, 6, false), mat('#a96754'), this.head);
    [-1, 1].forEach((s) => {
      const arm = group(this.rig, [s * 0.24, 0.79, 0]);
      sphere(arm, [0.095, 0.125, 0.103], [0, -0.067, 0], shirt);
      sphere(arm, [0.064, 0.11, 0.063], [0, -0.17, 0], skin);
      const elbow = group(arm, [0, -0.23, 0]);
      sphere(elbow, [0.064, 0.1, 0.063], [0, -0.065, 0], skin);
      sphere(elbow, [0.072, 0.07, 0.055], [0, -0.153, 0.008], skin);
      sphere(elbow, [0.029, 0.04, 0.03], [-s * 0.056, -0.136, 0.027], skin);
      for (let j = 0; j < 3; j++)
        sphere(elbow, [0.014, 0.026, 0.016], [(j - 1) * 0.028, -0.2, 0.016], skin);
      this.arms.push(arm);
      this.elbows.push(elbow);
      const leg = group(this.rig, [s * 0.119, 0.47, 0]);
      box(leg, [0.183, 0.19, 0.23], [0, -0.07, 0], outfit, 0.06);
      sphere(leg, [0.069, 0.11, 0.079], [0, -0.185, 0], skin);
      const knee = group(leg, [0, -0.22, 0]);
      sphere(knee, [0.065, 0.079, 0.065], [0, -0.071, 0], skin);
      box(knee, [0.127, 0.084, 0.13], [0, -0.127, 0], p.ivory, 0.035);
      box(knee, [0.16, 0.091, 0.23], [0, -0.17, 0.043], '#cf9f72', 0.043);
      box(knee, [0.164, 0.025, 0.23], [0, -0.209, 0.043], p.cream, 0.01);
      box(knee, [0.135, 0.028, 0.12], [0, -0.125, 0.084], p.ivory, 0.01);
      this.legs.push(leg);
      this.knees.push(knee);
    });
    this.root.position.set(0, 0.26, 0.1);
  }
  update(target: Partial<Pose>, dt: number, time: number) {
    const desired = { ...neutralPose, ...target };
    const blend = 1 - Math.exp(-dt * 10);
    for (const key of Object.keys(this.pose) as (keyof Pose)[])
      this.pose[key] = THREE.MathUtils.lerp(this.pose[key], desired[key], blend);
    const p = this.pose;
    this.rig.position.y = p.bodyY + Math.sin(time * 2.6) * 0.008;
    this.rig.rotation.set(p.bodyX, 0, p.bodyZ);
    this.head.rotation.set(p.headX, p.headY, p.headZ);
    this.arms[0].rotation.set(p.armLX, 0, p.armLZ);
    this.arms[1].rotation.set(p.armRX, 0, p.armRZ);
    this.elbows[0].rotation.x = p.elbowL;
    this.elbows[1].rotation.x = p.elbowR;
    this.legs[0].rotation.x = p.legLX;
    this.legs[1].rotation.x = p.legRX;
    this.knees[0].rotation.x = p.kneeL;
    this.knees[1].rotation.x = p.kneeR;
    const blink = time % 4.7;
    const scale = blink < 0.13 ? 0.15 : 1;
    this.eyes.forEach((e) => (e.scale.y = scale));
  }
}
