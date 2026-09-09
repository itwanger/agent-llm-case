import { ROOM } from '../core/layout.js';

/**
 * 网格 A* 寻路。
 * 把房间切成 9cm 的小格子，家具占的格子标为不可走，
 * 于是小二总能绕开城堡、绘本架、绿植，绝不会穿模。
 */
export class Nav {
  constructor(blockedFn, { cell = 0.09, half = ROOM.half } = {}) {
    this.cell = cell;
    this.half = half;
    this.w = Math.ceil((half * 2) / cell);
    this.h = this.w;
    this.blockedFn = blockedFn;
    this.grid = new Uint8Array(this.w * this.h);
    for (let i = 0; i < this.w; i++) {
      for (let j = 0; j < this.h; j++) {
        const x = this.toWorldX(i);
        const z = this.toWorldZ(j);
        this.grid[j * this.w + i] = blockedFn(x, z) ? 1 : 0;
      }
    }
    this._came = new Int32Array(this.w * this.h);
    this._g = new Float32Array(this.w * this.h);
    this._f = new Float32Array(this.w * this.h);
    this._open = [];
    this._stamp = new Int32Array(this.w * this.h);
    this._run = 0;
  }

  toWorldX(i) {
    return -this.half + (i + 0.5) * this.cell;
  }

  toWorldZ(j) {
    return -this.half + (j + 0.5) * this.cell;
  }

  toCellX(x) {
    return Math.min(this.w - 1, Math.max(0, Math.floor((x + this.half) / this.cell)));
  }

  toCellZ(z) {
    return Math.min(this.h - 1, Math.max(0, Math.floor((z + this.half) / this.cell)));
  }

  free(i, j) {
    if (i < 0 || j < 0 || i >= this.w || j >= this.h) return false;
    return this.grid[j * this.w + i] === 0;
  }

  /** 起点到终点是否一条直线走得通 */
  lineClear(ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(2, Math.ceil(dist / (this.cell * 0.6)));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      if (this.blockedFn(ax + dx * t, az + dz * t)) return false;
    }
    return true;
  }

  /** 找最近的可行走格子（目标被家具占住时用） */
  nearestFree(x, z, maxRing = 14) {
    let i0 = this.toCellX(x);
    let j0 = this.toCellZ(z);
    if (this.free(i0, j0)) return { i: i0, j: j0 };
    for (let r = 1; r <= maxRing; r++) {
      for (let di = -r; di <= r; di++) {
        for (let dj = -r; dj <= r; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = i0 + di;
          const j = j0 + dj;
          if (this.free(i, j)) return { i, j };
        }
      }
    }
    return { i: i0, j: j0 };
  }

  /**
   * 返回平滑后的路点数组（世界坐标），最后一个是目标点。
   * 若完全找不到路，返回 []。
   */
  findPath(from, to) {
    const ax = from.x;
    const az = from.z;
    const bx = to.x;
    const bz = to.z;

    // 直线可达就不折腾了
    if (this.lineClear(ax, az, bx, bz)) return [{ x: bx, z: bz }];

    const start = this.nearestFree(ax, az);
    const goal = this.nearestFree(bx, bz);
    const w = this.w;
    const h = this.h;
    const sIdx = start.j * w + start.i;
    const gIdx = goal.j * w + goal.i;
    if (sIdx === gIdx) return [{ x: bx, z: bz }];

    this._run++;
    const run = this._run;
    const g = this._g;
    const f = this._f;
    const came = this._came;
    const stamp = this._stamp;
    const open = this._open;
    open.length = 0;

    g[sIdx] = 0;
    f[sIdx] = this.heur(start.i, start.j, goal.i, goal.j);
    stamp[sIdx] = run;
    came[sIdx] = -1;
    open.push(sIdx);

    const dirs = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.4142],
      [1, -1, 1.4142],
      [-1, 1, 1.4142],
      [-1, -1, 1.4142],
    ];

    let found = false;
    let guard = 0;
    while (open.length && guard++ < 40000) {
      // 取 f 最小的节点（规模小，线性扫描足够快）
      let best = 0;
      for (let k = 1; k < open.length; k++) {
        if (f[open[k]] < f[open[best]]) best = k;
      }
      const cur = open[best];
      open[best] = open[open.length - 1];
      open.pop();
      if (cur === gIdx) {
        found = true;
        break;
      }
      const ci = cur % w;
      const cj = (cur - ci) / w;
      for (const [di, dj, cost] of dirs) {
        const ni = ci + di;
        const nj = cj + dj;
        if (!this.free(ni, nj)) continue;
        // 不允许贴着墙角斜穿
        if (di && dj && (!this.free(ci + di, cj) || !this.free(ci, cj + dj))) continue;
        const nIdx = nj * w + ni;
        const ng = g[cur] + cost;
        if (stamp[nIdx] === run && ng >= g[nIdx]) continue;
        stamp[nIdx] = run;
        g[nIdx] = ng;
        f[nIdx] = ng + this.heur(ni, nj, goal.i, goal.j);
        came[nIdx] = cur;
        open.push(nIdx);
      }
    }

    if (!found) return [];

    // 回溯
    const cells = [];
    let cur = gIdx;
    while (cur !== -1) {
      const ci = cur % w;
      const cj = (cur - ci) / w;
      cells.push({ x: this.toWorldX(ci), z: this.toWorldZ(cj) });
      cur = came[cur];
    }
    cells.reverse();

    // 拉直：能直达的中间点全部删掉
    const out = [];
    let i = 0;
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      for (; j > i + 1; j--) {
        if (this.lineClear(cells[i].x, cells[i].z, cells[j].x, cells[j].z)) break;
      }
      out.push(cells[j]);
      i = j;
    }
    // 用真实目标点收尾
    out[out.length - 1] = { x: bx, z: bz };
    return out;
  }

  heur(ax, az, bx, bz) {
    const dx = Math.abs(ax - bx);
    const dz = Math.abs(az - bz);
    // 八方向启发式
    return (dx + dz) + (1.4142 - 2) * Math.min(dx, dz);
  }
}
