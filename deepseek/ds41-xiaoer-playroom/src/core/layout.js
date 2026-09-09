import { PALETTE } from './materials.js';

/**
 * 全屋布局常量：房间、家具、玩具的位置都从这里取，
 * 保证「渲染」和「行走导航」用的是同一份数据。
 */

export const ROOM = {
  half: 3.5, // 房间半径（x / z 各 ±3.5）
  wallH: 2.75,
  wallT: 0.14,
};

export const LAYOUT = {
  // 拼图爬爬垫
  mat: { x: 0, z: 0.3, size: 3.3 },

  // 城堡滑梯（塔楼中心）
  castle: { x: 2.32, z: -1.62 },

  // 玩具
  blocks: { x: 0.95, z: 0.95 },
  car: { x: -1.8, z: 1.35 },
  ball: { x: 1.5, z: 1.85 },
  books: { x: -1.75, z: -3.02 },

  // 装饰
  plant: { x: -3.02, z: 2.82 },
  toybox: { x: 2.95, z: 2.8 },
  window: { x: -ROOM.half, y: 1.55, z: 0.55 },
};

/** 小二出生的位置 */
export const SPAWN = { x: -0.35, z: 2.35 };

/** 城堡滑梯的关键尺寸（供角色攀爬 / 下滑脚本使用） */
export const CASTLE = {
  x: LAYOUT.castle.x,
  z: LAYOUT.castle.z,
  platformY: 0.78,
  halfSize: 0.46, // 塔楼半宽
  ladderZ: LAYOUT.castle.z - 0.78, // 梯子底部所在 z
  ladderTopZ: LAYOUT.castle.z - 0.44,
  slideTopZ: LAYOUT.castle.z + 0.5, // 滑梯顶端
  slideBottomZ: LAYOUT.castle.z + 1.62, // 滑梯底部
  slideBottomY: 0.1,
  width: 0.78,
};

/**
 * 行走障碍：圆形 (circle) 与矩形 (box)。
 * 小二走路时会绕开它们，绝不会穿模。
 */
export function buildObstacles() {
  const c = CASTLE;
  const L = LAYOUT;
  return [
    // 城堡塔楼
    { type: 'circle', x: c.x, z: c.z, r: c.halfSize + 0.12, tag: 'castle' },
    // 滑梯（斜面占位）
    { type: 'circle', x: c.x, z: c.z + 1.05, r: 0.5, tag: 'slide' },
    { type: 'circle', x: c.x, z: c.z + 1.55, r: 0.36, tag: 'slide' },
    // 梯子
    { type: 'circle', x: c.x, z: c.ladderZ + 0.12, r: 0.34, tag: 'ladder' },

    // 绘本架
    { type: 'box', minX: L.books.x - 0.92, maxX: L.books.x + 0.92, minZ: -3.5, maxZ: L.books.z + 0.28, tag: 'shelf' },
    // 玩具收纳箱
    { type: 'circle', x: L.toybox.x, z: L.toybox.z, r: 0.52, tag: 'toybox' },
    // 绿植
    { type: 'circle', x: L.plant.x, z: L.plant.z, r: 0.44, tag: 'plant' },
    // 玩具（小人靠近时要停在旁边，所以它们也是障碍）
    { type: 'circle', x: L.blocks.x, z: L.blocks.z, r: 0.42, tag: 'blocks' },
    { type: 'circle', x: L.car.x, z: L.car.z, r: 0.24, tag: 'car' },
    { type: 'circle', x: L.ball.x, z: L.ball.z, r: 0.2, tag: 'ball' },
  ];
}

/** 每个玩具的「站位」与「朝向」 */
export const INTERACTION_SPOTS = {
  blocks: { x: LAYOUT.blocks.x - 0.05, z: LAYOUT.blocks.z + 0.86, faceX: LAYOUT.blocks.x, faceZ: LAYOUT.blocks.z },
  car: { x: LAYOUT.car.x, z: LAYOUT.car.z + 0.56, faceX: LAYOUT.car.x, faceZ: LAYOUT.car.z },
  ball: { x: LAYOUT.ball.x - 0.02, z: LAYOUT.ball.z + 0.72, faceX: LAYOUT.ball.x, faceZ: LAYOUT.ball.z },
  // 滑梯要走一条绕到城堡后面的路线，所以显式给两个路点
  slide: {
    x: CASTLE.x,
    z: CASTLE.ladderZ - 0.5,
    faceX: CASTLE.x,
    faceZ: CASTLE.z,
    path: [
      { x: 1.15, z: -2.35 },
      { x: 1.95, z: -2.78 },
    ],
  },
};

export const TOY_INFO = {
  blocks: { label: '积木', emoji: '🧱', action: '坐下搭积木' },
  car: { label: '小汽车', emoji: '🚗', action: '蹲着推小车' },
  ball: { label: '皮球', emoji: '⚽', action: '抱起皮球' },
  slide: { label: '城堡滑梯', emoji: '🏰', action: '爬上滑梯滑下来' },
};

export const COLORS = PALETTE;

/** 拼图爬爬垫的顶面高度（人和玩具踩在上面时要抬高这么多） */
export const MAT_TOP = 0.036;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** 某个位置的地面高度：在爬爬垫上时抬高 MAT_TOP，边缘做 12cm 平滑过渡 */
export function groundHeight(x, z) {
  const m = LAYOUT.mat;
  const half = m.size / 2;
  const fade = (d) => clamp01((half - d) / 0.12);
  return MAT_TOP * Math.min(fade(Math.abs(x - m.x)), fade(Math.abs(z - m.z)));
}

/** 滑梯曲面上的点：t = 0 顶端，t = 1 底端 */
export function slideCurvePoint(t) {
  const k = Math.min(1, Math.max(0, t));
  const s = 1 - Math.pow(1 - k, 1.55); // 上陡下缓
  return {
    x: CASTLE.x,
    y: CASTLE.platformY - (CASTLE.platformY - CASTLE.slideBottomY) * s,
    z: CASTLE.slideTopZ + (CASTLE.slideBottomZ - CASTLE.slideTopZ) * k,
  };
}

/** 梯子上的点：t = 0 地面，t = 1 平台 */
export function ladderPoint(t) {
  const k = Math.min(1, Math.max(0, t));
  return {
    x: CASTLE.x,
    y: CASTLE.platformY * k,
    z: CASTLE.ladderZ + (CASTLE.ladderTopZ - CASTLE.ladderZ) * k,
  };
}
