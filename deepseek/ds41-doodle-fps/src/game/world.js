import * as THREE from 'three';
import {
  doodleBox,
  doodle,
  inkLine,
  INK,
  PAPER,
  PAPER_SHADE,
  INK_LIGHT,
} from '../core/doodle.js';

/**
 * 地图：一页 64×64 的横格纸。
 * 所有实体都是轴对齐盒子（AABB），碰撞、射线、阴影共用同一份数据。
 *
 * 垂直结构：
 *   - 中央高台 3.0 高，两块楼梯上去（西侧 / 南侧）
 *   - 两只叠起来的集装箱，可以踩着木箱跳上去
 *   - 若干木箱 / 纸筒 / 矮墙做掩体
 */

export const WORLD_SIZE = 64;
export const WALL_HEIGHT = 6;

export function buildWorld(scene) {
  const root = new THREE.Group();
  root.name = 'world';
  scene.add(root);

  /** 参与移动碰撞的实体 */
  const colliders = [];
  /** 参与子弹 / 视线判定的实体（目前与 colliders 相同，分开是为了以后能细分） */
  const shootables = [];
  const shadowMats = [];

  const addBox = (cx, cy, cz, w, h, d, opts = {}) => {
    const { fillColor = PAPER, fillHatch = 1, ink = INK, jitter = 0.022, tag = 'solid', shadows = true } = opts;
    const g = doodleBox(w, h, d, {
      fillColor,
      fillHatch,
      ink,
      jitter,
      // 场景实体用受光材质，才有立体的明暗；线条仍然是纯蓝圆珠笔
      flat: opts.flat !== undefined ? opts.flat : false,
    });
    g.position.set(cx, cy, cz);
    root.add(g);

    const box = {
      min: new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
      max: new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2),
      tag,
      mesh: g,
    };
    colliders.push(box);
    shootables.push(box);

    if (shadows && cy - h / 2 < 0.6) {
      addShadow(cx, cz, w * 1.25, d * 1.25, 0.016 + Math.random() * 0.004, 0.34);
    }
    return box;
  };

  // ------------------------------------------------------------- 地面
  const groundMat = new THREE.MeshBasicMaterial({ map: scene.userData.paperTexture });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  root.add(ground);

  // 地面碰撞体：薄板，站上去 & 接住向下打的子弹
  const groundBox = {
    min: new THREE.Vector3(-WORLD_SIZE / 2, -2, -WORLD_SIZE / 2),
    max: new THREE.Vector3(WORLD_SIZE / 2, 0, WORLD_SIZE / 2),
    tag: 'ground',
  };
  colliders.push(groundBox);
  shootables.push(groundBox);

  // ------------------------------------------------------- 四周的墙
  const H = WORLD_SIZE / 2;
  const wallOpts = { fillColor: PAPER_SHADE, fillHatch: 2, ink: INK, shadows: false };
  addBox(0, WALL_HEIGHT / 2, -H - 0.5, WORLD_SIZE + 2, WALL_HEIGHT, 1, wallOpts);
  addBox(0, WALL_HEIGHT / 2, H + 0.5, WORLD_SIZE + 2, WALL_HEIGHT, 1, wallOpts);
  addBox(-H - 0.5, WALL_HEIGHT / 2, 0, 1, WALL_HEIGHT, WORLD_SIZE + 2, wallOpts);
  addBox(H + 0.5, WALL_HEIGHT / 2, 0, 1, WALL_HEIGHT, WORLD_SIZE + 2, wallOpts);

  // --------------------------------------------------------- 中央高台
  const PLAT = { x: 8, z: 8, w: 14, d: 10, top: 3.0, thick: 0.34 };
  const platY = PLAT.top - PLAT.thick / 2;
  addBox(PLAT.x, platY, PLAT.z, PLAT.w, PLAT.thick, PLAT.d, {
    fillColor: PAPER,
    fillHatch: 1,
    tag: 'platform',
    shadows: false,
  });
  addShadow(PLAT.x, PLAT.z, PLAT.w * 1.1, PLAT.d * 1.1, 0.02, 0.3);

  // 台下的四根柱子，留出可以钻进去的空隙
  const px = PLAT.w / 2 - 0.7;
  const pz = PLAT.d / 2 - 0.7;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    addBox(PLAT.x + sx * px, platY / 2 - 0.02, PLAT.z + sz * pz, 0.55, platY - 0.05, 0.55, {
      fillColor: PAPER_SHADE,
      fillHatch: 2,
      shadows: false,
    });
  }

  // 台面栏杆：西侧和南侧各留一个缺口给楼梯
  const railY = PLAT.top + 0.5;
  const railH = 1.0;
  const railT = 0.14;
  const rail = (cx, cz, w, d) =>
    addBox(cx, railY, cz, w, railH, d, {
      fillColor: PAPER,
      fillHatch: 1,
      ink: INK,
      jitter: 0.014,
      shadows: false,
      tag: 'rail',
    });

  const x0 = PLAT.x - PLAT.w / 2;
  const x1 = PLAT.x + PLAT.w / 2;
  const z0 = PLAT.z - PLAT.d / 2;
  const z1 = PLAT.z + PLAT.d / 2;
  const stairGapZ0 = PLAT.z - 1.6;
  const stairGapZ1 = PLAT.z + 1.6; // 西侧楼梯口
  const stairGapX0 = PLAT.x + 1.4;
  const stairGapX1 = PLAT.x + 4.6; // 南侧楼梯口

  // 北边整条
  rail(PLAT.x, z1, PLAT.w, railT);
  // 东边整条
  rail(x1, PLAT.z, railT, PLAT.d);
  // 西边分成两段，中间留楼梯口
  rail(x0, (z0 + stairGapZ0) / 2, railT, stairGapZ0 - z0);
  rail(x0, (stairGapZ1 + z1) / 2, railT, z1 - stairGapZ1);
  // 南边分成两段
  rail((x0 + stairGapX0) / 2, z0, stairGapX0 - x0, railT);
  rail((stairGapX1 + x1) / 2, z0, x1 - stairGapX1, railT);

  // ----------------------------------------------------------- 楼梯
  /** 沿 axis 方向铺 n 级台阶 */
  const buildStairs = (startX, startZ, axis, dir, steps = 10, stepH = 0.3, stepD = 0.6, width = 3.2) => {
    for (let i = 0; i < steps; i++) {
      const h = stepH * (i + 1);
      const cx = axis === 'x' ? startX + dir * (stepD * i + stepD / 2) : startX;
      const cz = axis === 'z' ? startZ + dir * (stepD * i + stepD / 2) : startZ;
      const w = axis === 'x' ? stepD : width;
      const d = axis === 'z' ? stepD : width;
      addBox(cx, h / 2, cz, w, h, d, {
        fillColor: PAPER,
        fillHatch: i % 2 ? 1 : 0,
        jitter: 0.018,
        shadows: false,
        tag: 'stairs',
      });
    }
    // 楼梯底下画一片排线阴影
    const len = steps * stepD;
    const sx = axis === 'x' ? startX + dir * len * 0.5 : startX;
    const sz = axis === 'z' ? startZ + dir * len * 0.5 : startZ;
    addShadow(sx, sz, (axis === 'x' ? len : width) * 1.2, (axis === 'z' ? len : width) * 1.2, 0.014, 0.26);
  };

  // 西侧楼梯：从 x = 1 - 6 开始向 +x 爬升到高台
  buildStairs(PLAT.x - PLAT.w / 2 - 6, PLAT.z, 'x', 1);
  // 南侧楼梯：从 z = 3 - 6 开始向 +z 爬升
  buildStairs(PLAT.x + 3, PLAT.z - PLAT.d / 2 - 6, 'z', 1);

  // ------------------------------------------------------- 集装箱
  const containerOpts = (h) => ({
    fillColor: 0xe8eef8,
    fillHatch: h,
    ink: INK,
    jitter: 0.026,
    tag: 'container',
  });

  const containerDetail = (box, alongX) => {
    // 集装箱表面的竖棱：几根线就够，不用建模
    const { min, max } = box;
    const pts = [];
    const n = 7;
    if (alongX) {
      for (let i = 1; i < n; i++) {
        const x = min.x + ((max.x - min.x) * i) / n;
        pts.push(x, min.y + 0.12, max.z + 0.012, x, max.y - 0.12, max.z + 0.012);
        pts.push(x, min.y + 0.12, min.z - 0.012, x, max.y - 0.12, min.z - 0.012);
      }
    } else {
      for (let i = 1; i < n; i++) {
        const z = min.z + ((max.z - min.z) * i) / n;
        pts.push(max.x + 0.012, min.y + 0.12, z, max.x + 0.012, max.y - 0.12, z);
        pts.push(min.x - 0.012, min.y + 0.12, z, min.x - 0.012, max.y - 0.12, z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const l = new THREE.LineSegments(g, inkLine(INK_LIGHT, 0.5));
    root.add(l);
  };

  // 叠起来的两个集装箱（长边沿 X）；上层矮一点，可以踩着下层跳上去
  const c1 = addBox(-12, 1.3, -8, 6, 2.6, 2.6, containerOpts(1));
  const c2 = addBox(-11.4, 3.25, -8.2, 4.6, 1.3, 2.4, containerOpts(2));
  containerDetail(c1, true);
  containerDetail(c2, true);

  // 长边沿 Z 的集装箱
  const c3 = addBox(-15, 1.3, 5, 2.6, 2.6, 6, containerOpts(1));
  containerDetail(c3, false);

  // 远处一个矮一点的集装箱
  const c4 = addBox(6, 1.3, -15, 6, 2.6, 2.6, containerOpts(2));
  containerDetail(c4, true);

  // 东南角再来一个集装箱，填掉大片空地
  const c5 = addBox(11, 1.3, -13, 6, 2.6, 2.6, containerOpts(1));
  containerDetail(c5, true);
  // 靠墙的短集装箱
  const c6 = addBox(-13, 1.3, -18, 2.6, 2.6, 5, containerOpts(2));
  containerDetail(c6, false);

  // ------------------------------------------------------- 木箱 / 掩体
  const crate = (x, z, s = 1.3) =>
    addBox(x, s / 2, z, s, s, s, { fillColor: PAPER, fillHatch: 1, jitter: 0.02, tag: 'crate' });

  crate(-8.4, -8);      // 上集装箱的踏脚箱
  crate(-8.4, -6.4, 1.1);
  crate(0, -5.6);
  crate(2.4, -6.8, 1.1);
  crate(-3.4, 11.5);
  crate(16.5, -2.5);
  crate(-21, -15);
  crate(20, 14, 1.5);
  crate(21.6, 14, 1.1);
  // 叠一摞箱子，做高处的掩体
  crate(12.6, -8, 1.3);
  addBox(12.6, 1.95, -8, 1.3, 1.3, 1.3, { fillColor: PAPER, fillHatch: 1, tag: 'crate' });
  crate(14.2, -7.4, 1.1);
  crate(-2, -16);
  crate(-4.2, -16.6, 1.1);
  crate(8, 18);

  // 矮墙（掩体）—— 注意不要挡住任何楼梯口
  addBox(0, 1.1, -1.5, 9, 2.2, 0.45, { fillColor: PAPER, fillHatch: 1, tag: 'cover' });
  addBox(-6.5, 1.1, 17, 0.45, 2.2, 7, { fillColor: PAPER, fillHatch: 1, tag: 'cover' });
  addBox(18, 1.1, -10, 0.45, 2.2, 9, { fillColor: PAPER, fillHatch: 1, tag: 'cover' });
  addBox(10, 1.1, -7, 6, 2.2, 0.45, { fillColor: PAPER, fillHatch: 1, tag: 'cover' });

  // 纸筒（圆柱，碰撞用方形近似）
  const barrel = (x, z) => {
    const r = 0.75;
    const h = 1.9;
    const g = doodle(new THREE.CylinderGeometry(r, r * 0.95, h, 14, 1), {
      fillColor: 0xf0e8d6,
      fillHatch: 1,
      ink: INK,
      jitter: 0.016,
      threshold: 30,
    });
    g.position.set(x, h / 2, z);
    root.add(g);
    // 桶口的一圈手绘线
    const ringPts = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ringPts.push(
        new THREE.Vector3(x + Math.cos(a) * r * 0.9, h + 0.004, z + Math.sin(a) * r * 0.9),
      );
    }
    root.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(ringPts),
        inkLine(INK, 0.85),
      ),
    );
    const box = {
      min: new THREE.Vector3(x - r * 0.9, 0, z - r * 0.9),
      max: new THREE.Vector3(x + r * 0.9, h, z + r * 0.9),
      tag: 'barrel',
      mesh: g,
    };
    colliders.push(box);
    shootables.push(box);
    addShadow(x, z, r * 3, r * 3, 0.017, 0.3);
  };
  barrel(-7.5, -19);
  barrel(19, 5);
  barrel(-19, 16);

  // ------------------------------------------------- 地面装饰涂鸦
  const floorDoodles = new THREE.Group();
  root.add(floorDoodles);
  const drawFloorPath = (pts, color = INK_LIGHT, opacity = 0.45) => {
    const g = new THREE.BufferGeometry();
    const arr = [];
    for (let i = 0; i < pts.length - 1; i++) {
      arr.push(pts[i][0], 0.02, pts[i][1], pts[i + 1][0], 0.02, pts[i + 1][1]);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    floorDoodles.add(new THREE.LineSegments(g, inkLine(color, opacity)));
  };
  // 从出生点指向中央的箭头
  drawFloorPath([[0, 14], [0, 6]]);
  drawFloorPath([[-1.1, 7.4], [0, 6]]);
  drawFloorPath([[1.1, 7.4], [0, 6]]);
  // 一个大圆圈，像随手画的靶子
  const circlePts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    circlePts.push([-10 + Math.cos(a) * 5, 14 + Math.sin(a) * 5]);
  }
  for (let i = 0; i < circlePts.length - 1; i++) {
    drawFloorPath([circlePts[i], circlePts[i + 1]], 0xd8402f, 0.35);
  }
  // 几个手写的小标记
  drawFloorPath([[-22, -6], [-20, -8], [-22, -8], [-20, -6]], INK_LIGHT, 0.4);
  drawFloorPath([[22, 8], [24, 8], [23, 9.6], [22, 8]], INK_LIGHT, 0.4);

  // 随手涂的墨圈 / 折线，让空地上也有笔迹
  const scribble = (cx, cz, r, color, opacity, seed) => {
    const pts = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const wob = 0.72 + ((Math.sin(a * 3 + seed) + 1) / 2) * 0.5;
      pts.push([cx + Math.cos(a) * r * wob, cz + Math.sin(a) * r * wob]);
    }
    for (let i = 0; i < pts.length - 1; i++) drawFloorPath([pts[i], pts[i + 1]], color, opacity);
  };
  scribble(6, -3, 1.4, INK_LIGHT, 0.35, 1.3);
  scribble(-14, 12, 1.7, 0xd8402f, 0.3, 4.1);
  scribble(16, 8, 1.2, INK_LIGHT, 0.32, 2.7);
  scribble(-18, -6, 1.5, INK_LIGHT, 0.3, 5.2);
  drawFloorPath([[12, 2], [13.5, 3.5], [12, 5], [13.5, 6.5]], INK_LIGHT, 0.35);
  drawFloorPath([[-16, -12], [-14, -14], [-16, -16]], INK_LIGHT, 0.35);

  // --------------------------------------------- 远处的铅笔云（填掉天空的空）
  const addCloud = (cx, cy, cz, scale) => {
    const lobes = [
      [-0.95, -0.05, 0.5],
      [-0.35, 0.16, 0.72],
      [0.3, 0.1, 0.6],
      [0.95, -0.04, 0.46],
      [0.05, -0.26, 0.78],
    ];
    const pts = [];
    const seg = 16;
    for (const [ox, oy, r] of lobes) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2;
        const a1 = ((i + 1) / seg) * Math.PI * 2;
        const wob = (a) => 1 + Math.sin(a * 3 + ox * 7 + oy * 5) * 0.09;
        pts.push(
          new THREE.Vector3(
            (ox + Math.cos(a0) * r * wob(a0)) * scale,
            (oy + Math.sin(a0) * r * wob(a0)) * scale,
            0,
          ),
          new THREE.Vector3(
            (ox + Math.cos(a1) * r * wob(a1)) * scale,
            (oy + Math.sin(a1) * r * wob(a1)) * scale,
            0,
          ),
        );
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const cloud = new THREE.LineSegments(g, inkLine(INK_LIGHT, 0.34));
    cloud.position.set(cx, cy, cz);
    cloud.lookAt(0, cy, 0); // 朝向场地中心，从地图里看总是正面
    root.add(cloud);
  };
  addCloud(-24, 15, -27, 3.4);
  addCloud(6, 18, -32, 4.2);
  addCloud(28, 14, -14, 3.0);
  addCloud(-30, 16, 10, 3.6);
  addCloud(22, 19, 27, 3.2);
  addCloud(-8, 21, 30, 2.8);

  // ------------------------------------------------------- 阴影贴图
  function addShadow(x, z, w, d, y, opacity) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({
        map: scene.userData.shadowTexture,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.renderOrder = -1;
    root.add(m);
    shadowMats.push(m);
    return m;
  }

  // 敌人出生点：贴边、互相分散、避开箱子
  const spawnPoints = [
    new THREE.Vector3(-26, 0, -26),
    new THREE.Vector3(26, 0, -26),
    new THREE.Vector3(26, 0, 26),
    new THREE.Vector3(-26, 0, 26),
    new THREE.Vector3(0, 0, -27),
    new THREE.Vector3(27, 0, 0),
    new THREE.Vector3(0, 0, 27),
    new THREE.Vector3(-27, 0, 0),
    new THREE.Vector3(-20, 0, -20),
    new THREE.Vector3(20, 0, 20),
    new THREE.Vector3(12, 0, -24),
    new THREE.Vector3(-24, 0, 12),
  ];

  return {
    root,
    colliders,
    shootables,
    spawnPoints,
    playerStart: new THREE.Vector3(0, 0, 20),
    platform: PLAT,
  };
}
