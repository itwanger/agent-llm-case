import * as THREE from 'three';
import { PALETTE, toon, glossy, softShadowTexture } from '../core/materials.js';
import { rbox, sphere, cyl, capsule, torus, group, shadowTree } from '../core/geometry.js';

/**
 * 小二 —— 2 岁的亚洲小男孩，全部由代码程序化生成。
 *
 * 骨骼结构（方便做动作）：
 *   root → body → hips → torso → { chest, neck → head, armL/R → elbowL/R }
 *                       └ legL/R → kneeL/R → ankleL/R
 *
 * 朝向：局部 +z 为“脸朝向”。
 */

const DIM = {
  hipY: 0.352,
  upperLeg: 0.15,
  lowerLeg: 0.13,
  shoulderY: 0.24, // 相对 torso
  upperArm: 0.1,
  lowerArm: 0.09,
  headY: 0.375, // 相对 torso
  headR: 0.155,
};

export function buildXiaoer() {
  const M = makeMaterials();

  const root = new THREE.Group();
  root.name = 'xiaoer';

  const body = group();
  root.add(body);

  const hips = group(0, DIM.hipY, 0);
  body.add(hips);

  /* ---------------- 躯干 ---------------- */
  const torso = group();
  hips.add(torso);

  // 短裤 / 纸尿裤包住的小屁股
  const shorts = rbox(0.25, 0.17, 0.18, 0.075, M.denim);
  shorts.position.y = -0.035;
  torso.add(shorts);
  const shortCuffL = rbox(0.115, 0.06, 0.15, 0.03, M.denim);
  shortCuffL.position.set(-0.065, -0.115, 0);
  torso.add(shortCuffL);
  const shortCuffR = shortCuffL.clone();
  shortCuffR.position.x = 0.065;
  torso.add(shortCuffR);

  // 上衣（奶白色小 T 恤）
  const shirt = rbox(0.255, 0.27, 0.175, 0.08, M.shirt);
  shirt.position.y = 0.115;
  torso.add(shirt);
  const hem = rbox(0.265, 0.05, 0.185, 0.025, M.shirtShade);
  hem.position.y = -0.005;
  torso.add(hem);

  // 背带裤的护胸 + 背带
  const bib = rbox(0.16, 0.17, 0.03, 0.03, M.denim);
  bib.position.set(0, 0.16, 0.083);
  torso.add(bib);
  const pocket = rbox(0.1, 0.06, 0.014, 0.014, M.denimDark);
  pocket.position.set(0, 0.14, 0.101);
  torso.add(pocket);
  // 护胸上的小鸭子
  const duck = sphere(0.028, M.duck);
  duck.scale.set(1, 0.9, 0.6);
  duck.position.set(0, 0.185, 0.101);
  torso.add(duck);
  const duckBeak = sphere(0.011, M.duckBeak);
  duckBeak.scale.set(1, 0.7, 0.7);
  duckBeak.position.set(0.028, 0.185, 0.104);
  torso.add(duckBeak);

  for (const sx of [-1, 1]) {
    const strap = rbox(0.036, 0.2, 0.026, 0.013, M.denim);
    strap.position.set(sx * 0.068, 0.215, 0.075);
    strap.rotation.x = -0.12;
    strap.rotation.z = sx * 0.06;
    torso.add(strap);
    const button = sphere(0.017, M.wood);
    button.position.set(sx * 0.068, 0.088, 0.096);
    torso.add(button);
  }

  // 领口
  const collar = torus(0.062, 0.017, M.shirtShade, 20, 8);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.248;
  collar.scale.set(1, 0.85, 1);
  torso.add(collar);

  // 脖子
  const neck = cyl(0.052, 0.058, 0.06, M.skin, 16);
  neck.position.y = 0.275;
  torso.add(neck);

  /* ---------------- 头 ---------------- */
  const head = group(0, DIM.headY, 0);
  torso.add(head);

  const skull = sphere(DIM.headR, M.skin, 28);
  skull.scale.set(1, 1.02, 0.98);
  head.add(skull);

  // 脸颊（肉嘟嘟）
  for (const sx of [-1, 1]) {
    const cheek = sphere(0.062, M.skin);
    cheek.scale.set(1, 0.82, 0.72);
    cheek.position.set(sx * 0.082, -0.055, 0.093);
    head.add(cheek);
    // 腮红
    const blush = sphere(0.036, M.blush);
    blush.scale.set(1, 0.62, 0.28);
    blush.position.set(sx * 0.098, -0.062, 0.118);
    head.add(blush);
  }

  // 耳朵
  for (const sx of [-1, 1]) {
    const ear = sphere(0.042, M.skin);
    ear.scale.set(0.45, 0.85, 0.72);
    ear.position.set(sx * 0.152, -0.022, 0.002);
    head.add(ear);
  }

  /* ---- 头发：圆圆的锅盖头 ---- */
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(DIM.headR * 1.045, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.58),
    M.hair,
  );
  hair.position.y = 0.008;
  hair.scale.set(1.0, 1.03, 1.0);
  head.add(hair);
  // 后脑勺填满
  const hairBack = sphere(DIM.headR * 0.99, M.hair, 24);
  hairBack.scale.set(0.98, 1.0, 1.0);
  hairBack.position.set(0, -0.028, -0.045);
  head.add(hairBack);
  // 刘海
  const bangs = sphere(0.115, M.hair, 20);
  bangs.scale.set(1.28, 0.5, 0.62);
  bangs.position.set(0, 0.082, 0.088);
  head.add(bangs);
  const bangs2 = sphere(0.08, M.hair, 18);
  bangs2.scale.set(1.5, 0.55, 0.7);
  bangs2.position.set(0, 0.1, 0.05);
  head.add(bangs2);
  // 一撮小翘毛（朝前，避免从背面看像动物耳朵）
  const tuft = sphere(0.034, M.hair);
  tuft.scale.set(1.15, 0.7, 0.9);
  tuft.position.set(0.045, 0.162, 0.062);
  head.add(tuft);
  const tuft2 = sphere(0.022, M.hair);
  tuft2.scale.set(1.1, 0.7, 0.9);
  tuft2.position.set(-0.055, 0.155, 0.055);
  head.add(tuft2);
  // 鬓角
  for (const sx of [-1, 1]) {
    const sideburn = rbox(0.03, 0.075, 0.06, 0.014, M.hair);
    sideburn.position.set(sx * 0.148, 0.045, 0.03);
    sideburn.rotation.z = sx * 0.12;
    head.add(sideburn);
  }

  /* ---- 五官 ---- */
  const face = group(0, 0, 0);
  head.add(face);

  const eyes = [];
  for (const sx of [-1, 1]) {
    const eye = group(sx * 0.063, -0.012, 0.128);
    const ball = sphere(0.033, M.eye, 18);
    ball.scale.set(1, 1.12, 0.85);
    eye.add(ball);
    const shine = sphere(0.013, M.shine, 12);
    shine.position.set(sx * -0.009, 0.013, 0.021);
    eye.add(shine);
    const shine2 = sphere(0.007, M.shine, 10);
    shine2.position.set(sx * 0.012, -0.012, 0.023);
    eye.add(shine2);
    face.add(eye);
    eyes.push(eye);

    // 眉毛
    const brow = rbox(0.052, 0.014, 0.016, 0.007, M.hair);
    brow.position.set(sx * 0.066, 0.052, 0.132);
    brow.rotation.z = sx * -0.16;
    brow.rotation.x = -0.1;
    face.add(brow);
  }

  // 鼻子
  const nose = sphere(0.019, M.skinShade, 14);
  nose.scale.set(1, 0.85, 0.9);
  nose.position.set(0, -0.042, 0.152);
  face.add(nose);

  // 嘴巴（上翘的微笑）
  const mouth = torus(0.031, 0.0095, M.mouth, 16, 8, Math.PI);
  mouth.rotation.z = Math.PI;
  mouth.rotation.x = -0.18;
  mouth.position.set(0, -0.072, 0.138);
  face.add(mouth);
  const mouthOpen = sphere(0.02, M.mouthInner, 12);
  mouthOpen.scale.set(1.15, 0.55, 0.3);
  mouthOpen.position.set(0, -0.077, 0.132);
  face.add(mouthOpen);

  /* ---------------- 手臂 ---------------- */
  const arms = {};
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const shoulder = group(sx * 0.142, DIM.shoulderY, 0);
    torso.add(shoulder);

    // 短袖
    const sleeve = capsule(0.05, 0.022, M.shirt, 4, 14);
    sleeve.position.y = -0.03;
    shoulder.add(sleeve);

    const upper = capsule(0.038, DIM.upperArm - 0.076, M.skin, 4, 14);
    upper.position.y = -DIM.upperArm / 2;
    shoulder.add(upper);

    const elbow = group(0, -DIM.upperArm, 0);
    shoulder.add(elbow);

    const lower = capsule(0.034, DIM.lowerArm - 0.068, M.skin, 4, 14);
    lower.position.y = -DIM.lowerArm / 2;
    elbow.add(lower);

    const hand = sphere(0.042, M.skin, 14);
    hand.scale.set(1, 0.95, 0.8);
    hand.position.y = -DIM.lowerArm - 0.012;
    elbow.add(hand);

    arms[side] = { shoulder, elbow, hand };
  }

  /* ---------------- 腿 ---------------- */
  const legs = {};
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const hip = group(sx * 0.072, -0.02, 0);
    hips.add(hip);

    const upper = capsule(0.055, DIM.upperLeg - 0.11, M.skin, 4, 14);
    upper.position.y = -DIM.upperLeg / 2;
    hip.add(upper);

    const knee = group(0, -DIM.upperLeg, 0);
    hip.add(knee);

    const lower = capsule(0.048, DIM.lowerLeg - 0.096, M.skin, 4, 14);
    lower.position.y = -DIM.lowerLeg / 2;
    knee.add(lower);

    const ankle = group(0, -DIM.lowerLeg, 0);
    knee.add(ankle);

    // 袜子
    const sock = capsule(0.05, 0.03, M.sock, 4, 14);
    sock.position.y = 0.012;
    ankle.add(sock);

    // 鞋子
    const shoe = rbox(0.098, 0.062, 0.15, 0.03, M.shoe);
    shoe.position.set(0, -0.021, 0.022);
    ankle.add(shoe);
    const sole = rbox(0.1, 0.022, 0.155, 0.01, M.sole);
    sole.position.set(0, -0.041, 0.022);
    ankle.add(sole);
    const strapShoe = rbox(0.1, 0.026, 0.03, 0.011, M.shoeTrim);
    strapShoe.position.set(0, -0.005, 0.06);
    ankle.add(strapShoe);

    legs[side] = { hip, knee, ankle };
  }

  /* ---------------- 接触阴影 ---------------- */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshBasicMaterial({
      map: softShadowTexture(),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.016;
  shadow.renderOrder = 2;
  root.add(shadow);

  shadowTree(root, true, false);

  return {
    root,
    body,
    hips,
    torso,
    head,
    face,
    eyes,
    arms,
    legs,
    mouth,
    shadow,
    dim: DIM,
  };
}

function makeMaterials() {
  return {
    skin: toon(PALETTE.skin),
    skinShade: toon(PALETTE.skinShade),
    hair: toon(PALETTE.hair),
    shirt: toon(0xfffaf0),
    shirtShade: toon(0xffe8c9),
    denim: toon(PALETTE.denim),
    denimDark: toon(PALETTE.denimDark),
    sock: toon(0xfffdf8),
    shoe: toon(PALETTE.shoe),
    sole: toon(0xd9c6ae),
    shoeTrim: toon(PALETTE.mint),
    eye: new THREE.MeshBasicMaterial({ color: PALETTE.eye }),
    shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    mouth: new THREE.MeshBasicMaterial({ color: PALETTE.mouth }),
    mouthInner: new THREE.MeshBasicMaterial({ color: 0xd4685c }),
    blush: new THREE.MeshBasicMaterial({ color: PALETTE.blush, transparent: true, opacity: 0.5 }),
    wood: toon(PALETTE.wood),
    duck: toon(PALETTE.yellow),
    duckBeak: toon(PALETTE.coral),
  };
}
