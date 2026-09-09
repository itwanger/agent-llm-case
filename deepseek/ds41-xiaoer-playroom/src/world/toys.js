import * as THREE from 'three';
import { PALETTE, toon, glossy, ballTexture } from '../core/materials.js';
import { rbox, sphere, cyl, cone, connect, group, shadowTree } from '../core/geometry.js';
import { LAYOUT, CASTLE, INTERACTION_SPOTS, TOY_INFO, slideCurvePoint, groundHeight } from '../core/layout.js';

/**
 * 玩具：城堡滑梯、积木、小汽车、皮球。
 * 每个玩具都会注册成「可点击目标」，并带上小人该站的位置。
 */

function tagTarget(g, id, extra = {}) {
  const info = TOY_INFO[id];
  const spot = INTERACTION_SPOTS[id];
  const target = {
    id,
    group: g,
    label: info.label,
    action: info.action,
    spot: new THREE.Vector3(spot.x, 0, spot.z),
    face: new THREE.Vector3(spot.faceX, 0, spot.faceZ),
    ...extra,
  };
  g.userData.toyId = id;
  g.userData.target = target;
  g.traverse((o) => {
    if (o.isMesh) o.userData.toyId = id;
  });
  return target;
}

export function buildToys(scene) {
  const root = group();
  scene.add(root);

  const slide = buildCastle();
  const blocks = buildBlocks();
  const car = buildCar();
  const ball = buildBall();

  root.add(slide.group, blocks.group, car.group, ball.group);

  const targets = {
    slide: tagTarget(slide.group, 'slide'),
    blocks: tagTarget(blocks.group, 'blocks', { pieces: blocks.pieces }),
    car: tagTarget(car.group, 'car', { body: car.body }),
    ball: tagTarget(ball.group, 'ball', { mesh: ball.mesh }),
  };

  return { root, targets, blocks: blocks.pieces, car: car.group, ball: ball.mesh };
}

/* ================================================================== *
 * 城堡滑梯
 * ================================================================== */

function buildCastle() {
  const g = group(CASTLE.x, 0, CASTLE.z);

  const wallMat = toon(PALETTE.cream);
  const wallMat2 = toon(PALETTE.creamDeep);
  const roofMat = toon(PALETTE.pink);
  const slideMat = toon(PALETTE.sky);
  const slideRailMat = toon(PALETTE.cream);
  const woodMat = toon(PALETTE.yellow);
  const railMat = toon(PALETTE.mint);

  const hs = CASTLE.halfSize; // 0.46
  const py = CASTLE.platformY; // 0.78

  // ---- 平台 ----
  const platform = rbox(hs * 2, 0.1, hs * 2, 0.04, wallMat);
  platform.position.y = py - 0.05;
  g.add(platform);

  // ---- 四根立柱 ----
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = rbox(0.11, py, 0.11, 0.03, wallMat2);
      post.position.set(sx * (hs - 0.055), py / 2, sz * (hs - 0.055));
      g.add(post);
    }
  }

  // ---- 侧墙（左右两侧 + 后面），前面留空给滑梯 ----
  const sideW = 0.07;
  for (const sx of [-1, 1]) {
    const side = rbox(sideW, py - 0.12, hs * 2 - 0.02, 0.025, wallMat);
    side.position.set(sx * hs, (py - 0.12) / 2 + 0.08, 0);
    g.add(side);
  }
  const backWall = rbox(hs * 2 - 0.02, py - 0.12, sideW, 0.025, wallMat);
  backWall.position.set(0, (py - 0.12) / 2 + 0.08, -hs);
  g.add(backWall);

  // ---- 城垛（城堡的锯齿顶）----
  for (const sx of [-1, 0, 1]) {
    const merlon = rbox(0.16, 0.16, 0.12, 0.03, wallMat2);
    merlon.position.set(sx * (hs - 0.09), py + 0.08, -hs);
    g.add(merlon);
  }
  for (const sz of [-1, 1]) {
    const merlon = rbox(0.12, 0.16, 0.16, 0.03, wallMat2);
    merlon.position.set(-hs, py + 0.08, sz * (hs - 0.09));
    g.add(merlon);
  }

  // ---- 扶手 ----
  for (const sx of [-1, 1]) {
    const rail = rbox(0.07, 0.07, hs * 2, 0.03, railMat);
    rail.position.set(sx * hs, py + 0.2, 0);
    g.add(rail);
    for (const sz of [-0.3, 0, 0.3]) {
      const bar = rbox(0.06, 0.2, 0.06, 0.02, railMat);
      bar.position.set(sx * hs, py + 0.1, sz);
      g.add(bar);
    }
  }

  // ---- 角塔：从地面长到屋顶，城堡感更完整 ----
  const turretH = 1.42;
  const turret = cyl(0.17, 0.185, turretH, wallMat2, 18);
  turret.position.set(-hs + 0.02, turretH / 2, -hs + 0.02);
  g.add(turret);
  const turretWin = rbox(0.055, 0.13, 0.03, 0.014, toon(0x9fc9e8));
  turretWin.position.set(-hs + 0.02, 0.66, -hs + 0.19);
  g.add(turretWin);
  const turretRing = cyl(0.215, 0.215, 0.07, wallMat, 18);
  turretRing.position.set(-hs + 0.02, turretH - 0.035, -hs + 0.02);
  g.add(turretRing);
  const turretRoof = cone(0.26, 0.34, roofMat, 18);
  turretRoof.position.set(-hs + 0.02, turretH + 0.17, -hs + 0.02);
  g.add(turretRoof);
  const flagPole = cyl(0.012, 0.012, 0.26, toon(PALETTE.woodDark));
  flagPole.position.set(-hs + 0.02, turretH + 0.45, -hs + 0.02);
  g.add(flagPole);
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 3), toon(PALETTE.yellow));
  flag.rotation.z = -Math.PI / 2;
  flag.position.set(-hs + 0.1, turretH + 0.5, -hs + 0.02);
  g.add(flag);

  // ---- 梯子（贴在后面，从地面斜着上平台）----
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const p = ladderPointLocal(t);
    const step = rbox(0.34, 0.05, 0.1, 0.02, woodMat);
    step.position.set(p.x, p.y, p.z);
    g.add(step);
  }
  for (const sx of [-1, 1]) {
    const a = ladderPointLocal(0);
    const b = ladderPointLocal(1);
    const rail = connect(
      new THREE.Vector3(sx * 0.2, a.y + 0.06, a.z),
      new THREE.Vector3(sx * 0.2, b.y + 0.02, b.z),
      0.022,
      woodMat,
    );
    g.add(rail);
  }

  // ---- 滑梯滑道（沿着同一条曲线铺出软塑料面）----
  const N = 16;
  let prev = slideLocal(0);
  for (let i = 1; i <= N; i++) {
    const p = slideLocal(i / N);
    const mid = new THREE.Vector3((prev.x + p.x) / 2, (prev.y + p.y) / 2, (prev.z + p.z) / 2);
    const dir = new THREE.Vector3().subVectors(p, prev);
    const len = dir.length();
    const angle = Math.atan2(dir.y, dir.z);

    const seg = rbox(CASTLE.width, 0.055, len * 1.22, 0.026, slideMat);
    seg.position.copy(mid);
    seg.rotation.x = -angle;
    g.add(seg);

    // 两侧护栏
    for (const sx of [-1, 1]) {
      const rail = rbox(0.055, 0.12, len * 1.22, 0.022, slideRailMat);
      rail.position.set(sx * (CASTLE.width / 2 + 0.02), mid.y + 0.085, mid.z);
      rail.rotation.x = -angle;
      g.add(rail);
    }
    prev = p;
  }

  // 滑道与平台之间的小踏板
  const topLip = rbox(CASTLE.width, 0.06, 0.2, 0.026, slideMat);
  topLip.position.set(0, py - 0.02, hs + 0.02);
  g.add(topLip);

  // 滑梯出口的小翻边
  const lip = rbox(CASTLE.width + 0.06, 0.07, 0.16, 0.03, slideMat);
  lip.position.set(0, CASTLE.slideBottomY - 0.005, CASTLE.slideBottomZ - CASTLE.z + 0.05);
  lip.rotation.x = 0.22;
  g.add(lip);

  shadowTree(g, true, true);
  return { group: g };
}

function ladderPointLocal(t) {
  return {
    x: 0,
    y: CASTLE.platformY * t,
    z: CASTLE.ladderZ - CASTLE.z + (CASTLE.ladderTopZ - CASTLE.ladderZ) * t,
  };
}

function slideLocal(t) {
  const p = slideCurvePoint(t);
  return new THREE.Vector3(p.x - CASTLE.x, p.y, p.z - CASTLE.z);
}

/* ================================================================== *
 * 积木
 * ================================================================== */

function buildBlocks() {
  const g = group();
  const pieces = [];
  const colors = [
    PALETTE.tomato,
    PALETTE.yellow,
    PALETTE.mint,
    PALETTE.sky,
    PALETTE.pink,
    PALETTE.lavender,
    PALETTE.coral,
    PALETTE.leaf,
    PALETTE.cream,
    PALETTE.tomato,
    PALETTE.sky,
    PALETTE.yellow,
  ];

  // 固定随机数，保证每次打开布局一致
  let seed = 20240910;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 0.1 + rnd() * 0.34;
    const x = LAYOUT.blocks.x + Math.cos(a) * r;
    const z = LAYOUT.blocks.z + Math.sin(a) * r;
    const size = 0.1 + rnd() * 0.045;
    const kind = i % 4;

    let mesh;
    if (kind === 3) {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(size / 2, size / 2, size, 14), toon(colors[i % colors.length]));
    } else {
      mesh = rbox(size, size, size, size * 0.22, toon(colors[i % colors.length]));
    }
    mesh.position.set(x, groundHeight(x, z) + size / 2, z);
    mesh.rotation.y = rnd() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.home = mesh.position.clone();
    mesh.userData.homeRot = mesh.rotation.clone();
    mesh.userData.size = size;
    g.add(mesh);
    pieces.push(mesh);

    // 积木上的小圆点装饰
    if (kind !== 3) {
      const dot = cyl(size * 0.14, size * 0.14, 0.008, toon(0xffffff));
      dot.rotation.x = Math.PI / 2;
      dot.position.set(0, 0, size / 2 + 0.004);
      mesh.add(dot);
    }
  }
  return { group: g, pieces };
}

/* ================================================================== *
 * 小汽车
 * ================================================================== */

function buildCar() {
  const g = group(LAYOUT.car.x, 0, LAYOUT.car.z);
  g.rotation.y = -0.5;

  const body = group();
  g.add(body);

  const paint = toon(PALETTE.tomato);
  const paintDark = toon(0xe4563f);

  // 车身
  const shell = rbox(0.22, 0.11, 0.36, 0.05, paint);
  shell.position.y = 0.11;
  body.add(shell);
  // 底盘
  const chassis = rbox(0.24, 0.04, 0.38, 0.02, paintDark);
  chassis.position.y = 0.055;
  body.add(chassis);
  // 驾驶舱
  const cabin = rbox(0.18, 0.1, 0.17, 0.045, paint);
  cabin.position.set(0, 0.2, -0.04);
  body.add(cabin);
  // 挡风玻璃
  const glass = rbox(0.15, 0.075, 0.03, 0.014, glossy(0x8fc7e8, { transparent: true, opacity: 0.85 }));
  glass.position.set(0, 0.2, 0.05);
  glass.rotation.x = -0.28;
  body.add(glass);
  // 后窗
  const glass2 = rbox(0.15, 0.07, 0.03, 0.014, glossy(0x8fc7e8, { transparent: true, opacity: 0.85 }));
  glass2.position.set(0, 0.2, -0.128);
  glass2.rotation.x = 0.28;
  body.add(glass2);

  // 车灯
  for (const sx of [-1, 1]) {
    const lamp = sphere(0.028, new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    lamp.position.set(sx * 0.07, 0.12, 0.183);
    body.add(lamp);
  }
  // 轮子
  const wheelMat = toon(0x4a3a30);
  const hubMat = toon(PALETTE.cream);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = cyl(0.055, 0.055, 0.05, wheelMat, 16);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * 0.115, 0.055, sz * 0.115);
      body.add(wheel);
      const hub = cyl(0.022, 0.022, 0.055, hubMat, 12);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(sx * 0.117, 0.055, sz * 0.115);
      body.add(hub);
    }
  }
  // 小车也有表情
  for (const sx of [-1, 1]) {
    const eye = sphere(0.016, new THREE.MeshBasicMaterial({ color: 0x2b2118 }));
    eye.position.set(sx * 0.05, 0.15, 0.184);
    body.add(eye);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x2b2118 }),
  );
  smile.rotation.set(0, 0, Math.PI);
  smile.position.set(0, 0.115, 0.185);
  body.add(smile);

  shadowTree(g, true, true);
  return { group: g, body };
}

/* ================================================================== *
 * 皮球
 * ================================================================== */

function buildBall() {
  const g = group(LAYOUT.ball.x, groundHeight(LAYOUT.ball.x, LAYOUT.ball.z), LAYOUT.ball.z);
  const tex = ballTexture();
  const mat = toon(0xffffff, { map: tex });
  const mesh = sphere(0.165, mat, 32);
  mesh.position.y = 0.165;
  g.add(mesh);

  // 一点点高光，让球看起来是亮面塑料
  const hi = sphere(0.05, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  hi.scale.set(1, 0.6, 0.6);
  hi.position.set(-0.06, 0.26, 0.08);
  g.add(hi);

  shadowTree(g, true, true);
  return { group: g, mesh };
}
