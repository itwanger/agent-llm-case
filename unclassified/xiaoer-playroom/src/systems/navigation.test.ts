import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearSegment, findPath, isFree, roomObstacles } from './navigation';
import { toyDefinitions } from '../toys/registry';
import { actions } from '../character/actions';
const obstacles = roomObstacles(toyDefinitions);
test('Every toy has a reachable and unblocked approach point', () => {
  for (const toy of toyDefinitions) {
    const end = { x: toy.approach[0], z: toy.approach[1] };
    assert.ok(isFree(end, obstacles), `${toy.id} approach is blocked`);
    assert.ok(findPath({ x: 0, z: 0.1 }, end, obstacles).length, `${toy.id} is unreachable`);
  }
});
test('Routes between all 7 toys avoid furniture, toys, and diagonal corner cuts', () => {
  for (const a of toyDefinitions)
    for (const b of toyDefinitions) {
      if (a.id === b.id) continue;
      let previous = { x: a.approach[0], z: a.approach[1] };
      const end = { x: b.approach[0], z: b.approach[1] },
        path = findPath(previous, end, obstacles);
      assert.ok(path.length, `${a.id} -> ${b.id} has no path`);
      for (const point of path) {
        assert.ok(
          clearSegment(previous, point, obstacles),
          `${a.id} -> ${b.id} intersects an obstacle`,
        );
        previous = point;
      }
    }
});
test('Castle slide exit is on the ground and can reach every toy', () => {
  const frame = actions.climb(18, 1);
  assert.equal(frame.offset![1], 0);
  const castle = toyDefinitions.find((t) => t.id === 'castle')!;
  const start = {
    x: castle.approach[0] + frame.offset![0],
    z: castle.approach[1] + frame.offset![2],
  };
  assert.ok(isFree(start, obstacles));
  for (const toy of toyDefinitions)
    assert.ok(
      findPath(start, { x: toy.approach[0], z: toy.approach[1] }, obstacles).length,
      `slide -> ${toy.id}`,
    );
});
test('Blocked destinations fail without routing through furniture', () => {
  assert.deepEqual(findPath({ x: 0, z: 0.1 }, { x: 3.18, z: -1.75 }, obstacles), []);
});
test('Every action has finite joint transforms throughout its duration; rocker dismounts', () => {
  for (const [name, action] of Object.entries(actions))
    for (let i = 0; i <= 100; i++) {
      const frame = action(i / 5, i / 100);
      for (const value of Object.values(frame.pose))
        assert.ok(Number.isFinite(value), `${name} nonfinite pose`);
      for (const value of frame.offset ?? []) assert.ok(Number.isFinite(value));
    }
  assert.deepEqual(actions.ride(12, 1).offset, [0, 0, -0]);
});
