/**
 * 极简 AABB 物理：够用、可预测、便于验证。
 *
 * 角色被当成一根竖直的胶囊（水平方向用半径 r 的方盒近似）。
 * - 水平移动分 X / Z 两次推进，撞墙时贴着墙滑
 * - 可跨越 stepUp 以内的高度（楼梯就是靠这个）
 * - 头顶有东西时会顶住
 * - 脚下取「所有候选支撑面」里最高的一个
 */

export const GRAVITY = 20;
export const TERMINAL = 42;

export function makeBody(x, y, z) {
  return { x, y, z, vy: 0, onGround: false, coyote: 0 };
}

function xzOverlap(bx, bz, r, b) {
  return bx + r > b.min.x && bx - r < b.max.x && bz + r > b.min.z && bz - r < b.max.z;
}

/**
 * 判断一个盒子在这一帧是否「挡路」：
 * - 地面永远不挡水平移动
 * - 矮到能踩上去的不挡（楼梯靠这个）
 * - 完全在头顶之上的不挡（能从高台底下钻过去）
 */
function blocks(b, body, radius, height, stepUp) {
  if (b.tag === 'ground') return false;
  if (b.max.y <= body.y + stepUp + 0.02) return false;
  if (b.min.y >= body.y + height - 0.02) return false;
  return true;
}

/**
 * 残留重叠的最小平移分离（MTV）。
 * 只推开「刚刚陷进去」的那一点，绝不会把角色甩到墙的另一侧。
 */
function depenetrate(body, colliders, radius, height, stepUp) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (!blocks(b, body, radius, height, stepUp)) continue;
      if (!(body.x + radius > b.min.x && body.x - radius < b.max.x)) continue;
      if (!(body.z + radius > b.min.z && body.z - radius < b.max.z)) continue;

      const outL = b.min.x - radius - body.x; // 往 -x 推
      const outR = b.max.x + radius - body.x; // 往 +x 推
      const outB = b.min.z - radius - body.z;
      const outF = b.max.z + radius - body.z;
      const dx = Math.abs(outL) < Math.abs(outR) ? outL : outR;
      const dz = Math.abs(outB) < Math.abs(outF) ? outB : outF;

      if (Math.abs(dx) <= Math.abs(dz)) body.x += dx;
      else body.z += dz;
      moved = true;
    }
    if (!moved) break;
  }
}

/** 水平推进（dx, dz 是这一帧的位移） */
export function moveHorizontal(body, dx, dz, colliders, { radius, height, stepUp }) {
  let blockedX = false;
  let blockedZ = false;

  if (dx !== 0) {
    const oldX = body.x;
    let nx = body.x + dx;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (!blocks(b, body, radius, height, stepUp)) continue;
      if (!(body.z + radius > b.min.z && body.z - radius < b.max.z)) continue;
      if (nx + radius > b.min.x && nx - radius < b.max.x) {
        // 只有当「出发时确实在这一侧」才回推，避免把身体甩到对面
        if (dx > 0 && oldX <= b.min.x - radius + 1e-3) {
          nx = Math.min(nx, b.min.x - radius);
          blockedX = true;
        } else if (dx < 0 && oldX >= b.max.x + radius - 1e-3) {
          nx = Math.max(nx, b.max.x + radius);
          blockedX = true;
        }
      }
    }
    body.x = nx;
  }

  if (dz !== 0) {
    const oldZ = body.z;
    let nz = body.z + dz;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (!blocks(b, body, radius, height, stepUp)) continue;
      if (!(body.x + radius > b.min.x && body.x - radius < b.max.x)) continue;
      if (nz + radius > b.min.z && nz - radius < b.max.z) {
        if (dz > 0 && oldZ <= b.min.z - radius + 1e-3) {
          nz = Math.min(nz, b.min.z - radius);
          blockedZ = true;
        } else if (dz < 0 && oldZ >= b.max.z + radius - 1e-3) {
          nz = Math.max(nz, b.max.z + radius);
          blockedZ = true;
        }
      }
    }
    body.z = nz;
  }

  // 兜底：万一已经陷进去了，用最小平移推出来（不会瞬移）
  depenetrate(body, colliders, radius, height, stepUp);

  return { blockedX, blockedZ, blocked: blockedX || blockedZ };
}

/** 竖直推进；返回是否落地 */
export function moveVertical(body, dy, colliders, { radius, height, stepUp }) {
  const prevY = body.y;
  body.y += dy;

  // 天花板
  if (dy > 0) {
    const newHead = body.y + height;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (b.tag === 'ground') continue;
      if (xzOverlap(body.x, body.z, radius, b)) {
        if (b.min.y >= prevY + height - 0.03 && b.min.y < newHead) {
          body.y = b.min.y - height - 0.002;
          body.vy = Math.min(body.vy, 0);
        }
      }
    }
  }

  // 找支撑面
  let support = -Infinity;
  const r = radius * 0.72;
  for (let i = 0; i < colliders.length; i++) {
    const b = colliders[i];
    if (!xzOverlap(body.x, body.z, r, b)) continue;
    if (b.max.y <= prevY + stepUp + 0.02) {
      if (b.max.y > support) support = b.max.y;
    }
  }

  let landed = false;
  if (support > -Infinity && body.vy <= 0 && body.y <= support + 0.001) {
    body.y = support;
    body.vy = 0;
    landed = true;
  }
  body.onGround = landed;
  return landed;
}

export function applyGravity(body, dt) {
  body.vy -= GRAVITY * dt;
  if (body.vy < -TERMINAL) body.vy = -TERMINAL;
  return body.vy * dt;
}
