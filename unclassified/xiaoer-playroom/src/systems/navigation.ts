import type { ToyDefinition } from '../toys/types';
export interface Point {
  x: number;
  z: number;
}
export interface Obstacle extends Point {
  radius: number;
}
const STEP = 0.2,
  MIN_X = -4.45,
  MAX_X = 4.5,
  MIN_Z = -2.65,
  MAX_Z = 2.57;
export function isFree(p: Point, obstacles: Obstacle[], padding = 0.13) {
  return (
    p.x >= MIN_X &&
    p.x <= MAX_X &&
    p.z >= MIN_Z &&
    p.z <= MAX_Z &&
    obstacles.every((o) => Math.hypot(p.x - o.x, p.z - o.z) > o.radius + padding)
  );
}
export function clearSegment(a: Point, b: Point, obstacles: Obstacle[]) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.08));
  for (let i = 1; i <= n; i++)
    if (!isFree({ x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n }, obstacles))
      return false;
  return true;
}
/** Small A* grid with corner-cut prevention and line-of-sight simplification. */
export function findPath(start: Point, end: Point, obstacles: Obstacle[]): Point[] {
  if (!isFree(end, obstacles)) return [];
  if (clearSegment(start, end, obstacles)) return [end];
  const toCell = (p: Point) => [Math.round((p.x - MIN_X) / STEP), Math.round((p.z - MIN_Z) / STEP)];
  const toPoint = (x: number, z: number) => ({ x: MIN_X + x * STEP, z: MIN_Z + z * STEP });
  const [sx, sz] = toCell(start),
    [ex, ez] = toCell(end);
  const key = (x: number, z: number) => `${x},${z}`;
  type Node = { x: number; z: number; g: number; f: number; parent?: Node };
  const first: Node = { x: sx, z: sz, g: 0, f: 0 },
    open = [first],
    visited = new Set<string>(),
    costs = new Map<string, number>([[key(sx, sz), 0]]);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const n = open.shift()!;
    const k = key(n.x, n.z);
    if (visited.has(k)) continue;
    visited.add(k);
    const here = toPoint(n.x, n.z);
    if (Math.hypot(n.x - ex, n.z - ez) <= 1.5 && clearSegment(here, end, obstacles)) {
      const path: Point[] = [end];
      let cur: Node | undefined = n;
      while (cur?.parent) {
        path.unshift(toPoint(cur.x, cur.z));
        cur = cur.parent;
      }
      const simple: Point[] = [];
      let anchor = start;
      for (let i = 0; i < path.length; i++) {
        if (i === path.length - 1 || !clearSegment(anchor, path[i + 1], obstacles)) {
          simple.push(path[i]);
          anchor = path[i];
        }
      }
      return simple;
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const x = n.x + dx,
          z = n.z + dz,
          p = toPoint(x, z),
          nk = key(x, z);
        if (visited.has(nk) || !isFree(p, obstacles)) continue;
        if (
          dx &&
          dz &&
          (!isFree(toPoint(n.x + dx, n.z), obstacles) || !isFree(toPoint(n.x, n.z + dz), obstacles))
        )
          continue;
        const g = n.g + Math.hypot(dx, dz);
        if (g >= (costs.get(nk) ?? Infinity)) continue;
        costs.set(nk, g);
        open.push({ x, z, g, f: g + Math.hypot(x - ex, z - ez), parent: n });
      }
  }
  return [];
}

export function roomObstacles(toys: Pick<ToyDefinition, 'obstacle'>[]): Obstacle[] {
  return [
    ...toys.flatMap((t) => (t.obstacle ? [t.obstacle] : [])),
    { x: -4.4, z: 1.2, radius: 0.75 },
    { x: -3.35, z: -0.6, radius: 0.55 },
    { x: 3.8, z: -0.4, radius: 0.5 },
  ];
}
