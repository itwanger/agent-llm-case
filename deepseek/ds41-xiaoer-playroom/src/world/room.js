import * as THREE from 'three';
import {
  PALETTE,
  toon,
  glossy,
  woodFloorTexture,
  wallTexture,
  puzzleMatTexture,
  bookCoverTexture,
  dotTexture,
} from '../core/materials.js';
import { rbox, sphere, cyl, cone, torus, plane, group, shadowed, shadowTree } from '../core/geometry.js';
import { ROOM, LAYOUT, CASTLE, MAT_TOP } from '../core/layout.js';

/**
 * 房间本体：地板、墙面、窗户、拼图爬爬垫、绘本架、绿植、收纳箱、墙面装饰。
 * 全部程序化生成，没有任何外部模型 / 贴图文件。
 */
export function buildRoom(scene) {
  const root = group();
  scene.add(root);

  const H = ROOM.half;

  /* ---------------- 地板 ---------------- */
  const floorTex = woodFloorTexture(3);
  const floorMat = toon(0xffffff, { map: floorTex });
  const floor = plane(H * 2 + 0.6, H * 2 + 0.6, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  // 地板厚度（从侧面看是一个小木台）
  const slab = rbox(H * 2 + 0.6, 0.22, H * 2 + 0.6, 0.06, toon(PALETTE.woodMid));
  slab.position.y = -0.11;
  shadowed(slab, { cast: true, receive: true });
  root.add(slab);

  /* ---------------- 墙面 ---------------- */
  const wallTex = wallTexture(2);
  const wallMat = toon(0xffffff, { map: wallTex });
  const wallSide = toon(PALETTE.wallShade);

  // 后墙（-z）
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(H * 2 + 0.6, ROOM.wallH, ROOM.wallT), [
    wallSide,
    wallSide,
    wallSide,
    wallSide,
    wallMat,
    wallSide,
  ]);
  backWall.position.set(0, ROOM.wallH / 2, -H - ROOM.wallT / 2);
  backWall.receiveShadow = true;
  root.add(backWall);

  // 左墙（-x）
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM.wallT, ROOM.wallH, H * 2 + 0.6), [
    wallMat,
    wallSide,
    wallSide,
    wallSide,
    wallSide,
    wallSide,
  ]);
  leftWall.position.set(-H - ROOM.wallT / 2, ROOM.wallH / 2, 0);
  leftWall.receiveShadow = true;
  root.add(leftWall);

  // 踢脚线
  const skirtMat = toon(PALETTE.wood);
  const skirtBack = rbox(H * 2 + 0.6, 0.17, 0.07, 0.03, skirtMat);
  skirtBack.position.set(0, 0.085, -H + 0.035);
  root.add(skirtBack);
  const skirtLeft = rbox(0.07, 0.17, H * 2 + 0.6, 0.03, skirtMat);
  skirtLeft.position.set(-H + 0.035, 0.085, 0);
  root.add(skirtLeft);

  // 开放侧的低矮木沿（让房间从外面看也有边界）
  const curbMat = toon(PALETTE.woodLight);
  const curbFront = rbox(H * 2 + 0.6, 0.13, 0.13, 0.05, curbMat);
  curbFront.position.set(0, 0.065, H + 0.0);
  root.add(curbFront);
  const curbRight = rbox(0.13, 0.13, H * 2 + 0.6, 0.05, curbMat);
  curbRight.position.set(H + 0.0, 0.065, 0);
  root.add(curbRight);
  shadowTree(root, true, true);

  /* ---------------- 窗户（左墙） ---------------- */
  root.add(buildWindow());

  /* ---------------- 拼图爬爬垫 ---------------- */
  root.add(buildPuzzleMat());

  /* ---------------- 绘本架 ---------------- */
  root.add(buildBookshelf());

  /* ---------------- 绿植 ---------------- */
  root.add(buildPlant());

  /* ---------------- 玩具收纳箱 ---------------- */
  root.add(buildToyBox());

  /* ---------------- 墙面装饰 ---------------- */
  root.add(buildWallDecor());

  return root;
}

/* ================================================================== *
 * 窗户
 * ================================================================== */

function buildWindow() {
  const g = group(LAYOUT.window.x + ROOM.wallT / 2 - 0.01, LAYOUT.window.y, LAYOUT.window.z);
  const frameMat = toon(PALETTE.cream);
  const woodMat = toon(PALETTE.woodLight);

  const w = 1.45;
  const h = 1.15;

  // 窗外天空
  const sky = plane(w - 0.16, h - 0.16, toon(0xcfeaf7));
  sky.rotation.y = Math.PI / 2;
  sky.position.x = -0.03;
  g.add(sky);

  // 远景：小山坡 + 云
  const hill = sphere(0.34, toon(PALETTE.mintSoft));
  hill.scale.set(1, 0.55, 0.6);
  hill.rotation.y = Math.PI / 2;
  hill.position.set(-0.02, -0.42, -0.3);
  g.add(hill);
  const hill2 = sphere(0.24, toon(0x9fd8b6));
  hill2.scale.set(1, 0.5, 0.6);
  hill2.rotation.y = Math.PI / 2;
  hill2.position.set(-0.02, -0.4, 0.25);
  g.add(hill2);
  for (let i = 0; i < 2; i++) {
    const cloud = sphere(0.13 + i * 0.03, toon(0xffffff));
    cloud.scale.set(0.6, 1, 1.6);
    cloud.position.set(-0.02, 0.3 - i * 0.12, -0.35 + i * 0.55);
    g.add(cloud);
  }

  // 玻璃（淡淡的暖光）
  const glass = plane(w - 0.16, h - 0.16, new THREE.MeshBasicMaterial({
    color: 0xfff3d6,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  }));
  glass.rotation.y = Math.PI / 2;
  glass.position.x = 0.02;
  g.add(glass);

  // 窗框（四条边）
  const fw = 0.1;
  const parts = [
    [0.08, fw, w + fw, 0, h / 2, 0],
    [0.08, fw, w + fw, 0, -h / 2, 0],
    [0.08, h + fw, fw, 0, 0, w / 2],
    [0.08, h + fw, fw, 0, 0, -w / 2],
  ];
  parts.forEach(([d, hh, ww, px, py, pz]) => {
    const bar = rbox(d, hh, ww, 0.035, frameMat);
    bar.position.set(px, py, pz);
    g.add(bar);
  });
  // 十字窗棂
  const mullV = rbox(0.07, h, 0.05, 0.025, frameMat);
  mullV.position.x = 0.02;
  g.add(mullV);
  const mullH = rbox(0.07, 0.05, w, 0.025, frameMat);
  mullH.position.x = 0.02;
  g.add(mullH);

  // 窗台
  const sill = rbox(0.24, 0.08, w + 0.3, 0.03, woodMat);
  sill.position.set(0.12, -h / 2 - 0.05, 0);
  g.add(sill);

  // 窗帘（两片）
  for (const side of [-1, 1]) {
    const curtain = rbox(0.06, h + 0.75, 0.3, 0.06, toon(side < 0 ? PALETTE.creamDeep : PALETTE.pinkSoft));
    curtain.position.set(0.2, 0.06, side * (w / 2 + 0.06));
    g.add(curtain);
  }
  // 帘杆
  const rod = cyl(0.025, 0.025, w + 0.75, toon(PALETTE.woodDark));
  rod.rotation.x = Math.PI / 2;
  rod.position.set(0.2, h / 2 + 0.34, 0);
  g.add(rod);
  // 帘头
  const valance = rbox(0.1, 0.16, w + 0.72, 0.06, toon(PALETTE.cream));
  valance.position.set(0.18, h / 2 + 0.28, 0);
  g.add(valance);

  shadowTree(g, true, false);
  return g;
}

/* ================================================================== *
 * 拼图爬爬垫
 * ================================================================== */

function buildPuzzleMat() {
  const g = group(LAYOUT.mat.x, 0, LAYOUT.mat.z);
  const s = LAYOUT.mat.size;

  // 泡棉底座
  const base = rbox(s + 0.06, MAT_TOP, s + 0.06, 0.016, toon(PALETTE.creamDeep));
  base.position.y = MAT_TOP / 2;
  base.castShadow = false;
  base.receiveShadow = true;
  g.add(base);

  // 拼图表面
  const matTex = puzzleMatTexture(4);
  const top = plane(s, s, toon(0xffffff, { map: matTex }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = MAT_TOP + 0.001;
  top.receiveShadow = true;
  g.add(top);

  // 边缘小圆角（让垫子看起来是软的）
  const edgeMat = toon(PALETTE.creamDeep);
  const r = 0.04;
  for (const [dx, dz, rot] of [
    [0, s / 2, 0],
    [0, -s / 2, 0],
    [s / 2, 0, Math.PI / 2],
    [-s / 2, 0, Math.PI / 2],
  ]) {
    const e = cyl(r, r, s, edgeMat);
    e.rotation.z = Math.PI / 2;
    e.rotation.y = rot;
    e.position.set(dx, MAT_TOP, dz);
    g.add(e);
  }

  return g;
}

/* ================================================================== *
 * 绘本架
 * ================================================================== */

function buildBookshelf() {
  const g = group(LAYOUT.books.x, 0, LAYOUT.books.z);
  const woodMat = toon(PALETTE.wood);
  const woodLight = toon(PALETTE.woodLight);

  const W = 1.8;
  const D = 0.34;
  const Hh = 0.82;

  // 两侧立板
  for (const sx of [-1, 1]) {
    const side = rbox(0.07, Hh, D, 0.025, woodMat);
    side.position.set(sx * (W / 2 - 0.035), Hh / 2, 0);
    g.add(side);
  }
  // 顶板 / 背板 / 层板
  const top = rbox(W, 0.06, D + 0.04, 0.025, woodMat);
  top.position.y = Hh - 0.03;
  g.add(top);

  const backPanel = rbox(W - 0.1, Hh - 0.06, 0.04, 0.02, woodLight);
  backPanel.position.set(0, Hh / 2, -D / 2 + 0.02);
  g.add(backPanel);

  const shelf = rbox(W - 0.14, 0.05, D - 0.02, 0.02, woodMat);
  shelf.position.set(0, 0.42, 0);
  g.add(shelf);

  // 绘本：下层立着放，上层平放
  const covers = [0, 1, 2, 3, 4];
  let ci = 0;
  for (let i = 0; i < 7; i++) {
    const w = 0.1 + (i % 3) * 0.02;
    const h = 0.28 + ((i * 7) % 5) * 0.02;
    const book = rbox(w, h, 0.24, 0.012, toon([PALETTE.coral, PALETTE.mint, PALETTE.sky, PALETTE.yellow, PALETTE.lavender][i % 5]));
    book.position.set(-W / 2 + 0.16 + i * 0.135, 0.42 + h / 2 + 0.03, 0.01);
    book.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.03;
    g.add(book);
    // 封面
    const cover = plane(w * 0.78, h * 0.86, toon(0xffffff, { map: bookCoverTexture(covers[ci++ % covers.length]) }));
    cover.position.set(book.position.x, book.position.y, 0.135);
    g.add(cover);
  }

  // 上层平放两本
  for (let i = 0; i < 2; i++) {
    const flat = rbox(0.26, 0.045, 0.2, 0.012, toon(i === 0 ? PALETTE.tomato : PALETTE.sky));
    flat.position.set(0.45 - i * 0.02, Hh + 0.02 + i * 0.045, 0);
    flat.rotation.y = i * 0.12;
    g.add(flat);
  }

  // 小摆件：一颗木球
  const deco = sphere(0.06, toon(PALETTE.yellow));
  deco.position.set(-0.62, Hh + 0.06, 0.02);
  g.add(deco);

  shadowTree(g, true, true);
  return g;
}

/* ================================================================== *
 * 绿植
 * ================================================================== */

function buildPlant() {
  const g = group(LAYOUT.plant.x, 0, LAYOUT.plant.z);

  const pot = cyl(0.19, 0.14, 0.26, toon(PALETTE.coral), 22);
  pot.position.y = 0.13;
  g.add(pot);
  const rim = cyl(0.205, 0.205, 0.05, toon(PALETTE.cream), 22);
  rim.position.y = 0.26;
  g.add(rim);
  const soil = cyl(0.17, 0.17, 0.03, toon(0x6b4a32), 20);
  soil.position.y = 0.28;
  g.add(soil);

  // 叶子
  const leafMat = toon(PALETTE.leaf);
  const leafMat2 = toon(0x9ad3a2);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = sphere(0.14, i % 2 ? leafMat : leafMat2);
    leaf.scale.set(0.5, 1.5, 0.22);
    const r = 0.1 + (i % 3) * 0.05;
    leaf.position.set(Math.cos(a) * r, 0.42 + (i % 3) * 0.09, Math.sin(a) * r);
    leaf.rotation.set(Math.cos(a) * 0.55, -a, Math.sin(a) * 0.55);
    g.add(leaf);
  }
  const bud = sphere(0.07, toon(PALETTE.pink));
  bud.position.y = 0.68;
  g.add(bud);

  shadowTree(g, true, true);
  return g;
}

/* ================================================================== *
 * 玩具收纳箱
 * ================================================================== */

function buildToyBox() {
  const g = group(LAYOUT.toybox.x, 0, LAYOUT.toybox.z);
  const body = rbox(0.86, 0.52, 0.62, 0.07, toon(PALETTE.sky));
  body.position.y = 0.26;
  g.add(body);

  const lid = rbox(0.9, 0.09, 0.66, 0.04, toon(PALETTE.cream));
  lid.position.y = 0.55;
  lid.rotation.x = -0.06;
  g.add(lid);

  const knob = sphere(0.05, toon(PALETTE.wood));
  knob.position.set(0, 0.6, 0.2);
  g.add(knob);

  // 箱子上贴一颗小星星
  const starMat = toon(PALETTE.yellow);
  for (let i = 0; i < 3; i++) {
    const s = sphere(0.035, starMat);
    s.position.set(-0.2 + i * 0.2, 0.3 + (i % 2) * 0.12, 0.315);
    s.scale.set(1, 1, 0.4);
    g.add(s);
  }

  // 从箱子里探出来的玩具
  const peek = sphere(0.11, toon(PALETTE.tomato));
  peek.position.set(0.22, 0.62, -0.02);
  g.add(peek);
  const peek2 = rbox(0.16, 0.16, 0.16, 0.04, toon(PALETTE.mint));
  peek2.position.set(-0.24, 0.64, 0.02);
  peek2.rotation.set(0.3, 0.5, 0.2);
  g.add(peek2);

  shadowTree(g, true, true);
  return g;
}

/* ================================================================== *
 * 墙面装饰：三角旗 + 相框 + 星星贴纸
 * ================================================================== */

function buildWallDecor() {
  const g = group(0, 0, -ROOM.half + 0.02);

  // 三角旗
  const colors = [PALETTE.pink, PALETTE.mint, PALETTE.yellow, PALETTE.sky, PALETTE.coral, PALETTE.lavender];
  const count = 9;
  const span = 2.4;
  const topY = 2.2;
  const stringY = (t) => topY + 0.05 - Math.sin(t * Math.PI) * 0.22;
  const triH = 0.32;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = -span / 2 + t * span;
    // 三角旗的顶边正好挂在绳子上，避免看起来“飘”在空中
    const tri = new THREE.Mesh(new THREE.ConeGeometry(0.135, triH, 3), toon(colors[i % colors.length]));
    tri.rotation.x = Math.PI;
    tri.rotation.z = Math.PI / 6;
    tri.position.set(x, stringY(t) - triH / 2 + 0.01, 0.055);
    g.add(tri);
  }
  const string = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        Array.from({ length: 20 }, (_, i) => {
          const t = i / 19;
          return new THREE.Vector3(-span / 2 - 0.15 + t * (span + 0.3), stringY(t), 0.045);
        }),
      ),
      24,
      0.016,
      5,
      false,
    ),
    toon(PALETTE.woodDark),
  );
  g.add(string);

  // 相框
  const frame = rbox(0.72, 0.56, 0.05, 0.03, toon(PALETTE.woodLight));
  frame.position.set(-1.85, 1.55, 0.05);
  g.add(frame);
  const pic = plane(0.6, 0.44, toon(0xffffff, { map: dotTexture(PALETTE.creamDeep, PALETTE.pinkSoft, 4) }));
  pic.position.set(-1.85, 1.55, 0.085);
  g.add(pic);
  // 相框里的小太阳
  const sun = sphere(0.09, toon(PALETTE.yellow));
  sun.position.set(-1.85, 1.6, 0.1);
  g.add(sun);

  // 星星贴纸
  for (let i = 0; i < 6; i++) {
    const star = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 4), toon(i % 2 ? PALETTE.yellow : PALETTE.pinkSoft));
    star.rotation.x = Math.PI / 2;
    star.rotation.z = Math.PI / 4;
    star.position.set(1.1 + (i % 3) * 0.32, 1.55 + Math.floor(i / 3) * 0.36, 0.05);
    g.add(star);
  }

  // 墙面小挂灯
  const lampCord = cyl(0.008, 0.008, 0.5, toon(PALETTE.woodDark));
  lampCord.position.set(2.5, 2.4, 0.1);
  g.add(lampCord);
  const lamp = cone(0.17, 0.24, toon(PALETTE.cream), 20);
  lamp.rotation.x = Math.PI;
  lamp.position.set(2.5, 2.02, 0.1);
  g.add(lamp);
  const bulb = sphere(0.07, new THREE.MeshBasicMaterial({ color: 0xffe6a8 }));
  bulb.position.set(2.5, 1.96, 0.1);
  g.add(bulb);
  const lampLight = new THREE.PointLight(0xffd9a0, 1.6, 4.2, 2);
  lampLight.position.set(2.5, 1.9, 0.1);
  g.add(lampLight);

  shadowTree(g, true, false);
  return g;
}
