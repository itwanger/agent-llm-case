import * as THREE from 'three';
import { Xiaoer } from '../character/Xiaoer';
import { actions, walkPose } from '../character/actions';
import type { Toy } from '../toys/types';
import { findPath, roomObstacles, type Obstacle, type Point } from './navigation';
export type PlayState = 'walking' | 'playing' | 'idle';
export class Director {
  current: Toy | null = null;
  state: PlayState = 'idle';
  paused = false;
  auto = true;
  elapsed = 0;
  totalTime = 0;
  completed = new Set<string>();
  private path: Point[] = [];
  private actionOrigin = new THREE.Vector3();
  private clock = 0;
  private idle = 0;
  private queued: Toy | null = null;
  private last: string[] = [];
  readonly obstacles: Obstacle[];
  onChange: () => void = () => {};
  onComplete: (toy: Toy) => void = () => {};
  constructor(
    readonly actor: Xiaoer,
    readonly toys: Toy[],
  ) {
    this.obstacles = roomObstacles(toys);
  }
  choose(toy: Toy) {
    if (
      this.state === 'playing' &&
      (this.current?.action === 'climb' || this.current?.action === 'ride')
    ) {
      this.queued = toy;
      return true;
    }
    this.queued = null;
    const { x, z } = this.actor.root.position;
    const path = findPath({ x, z }, { x: toy.approach[0], z: toy.approach[1] }, this.obstacles);
    if (!path.length) return false;
    this.current?.reset?.();
    this.current = toy;
    this.path = path;
    this.state = 'walking';
    this.elapsed = 0;
    this.paused = false;
    this.last.push(toy.id);
    this.last = this.last.slice(-2);
    this.onChange();
    return true;
  }
  random() {
    const available = this.toys.filter((t) => !this.last.includes(t.id));
    for (const toy of available.sort(() => Math.random() - 0.5)) if (this.choose(toy)) return;
  }
  togglePause() {
    this.paused = !this.paused;
    this.onChange();
  }
  update(dt: number) {
    if (this.paused) return;
    this.clock += dt;
    this.totalTime += dt;
    if (this.state === 'walking' && this.current) {
      const dest = this.path[0];
      const pos = this.actor.root.position;
      const delta = new THREE.Vector3(dest.x - pos.x, 0, dest.z - pos.z);
      const distance = delta.length();
      if (distance < 0.055) {
        this.path.shift();
        if (!this.path.length) {
          pos.set(this.current.approach[0], 0.26, this.current.approach[1]);
          this.actionOrigin.copy(pos);
          this.elapsed = 0;
          this.state = 'playing';
          this.onChange();
        }
      } else {
        const speed = 0.67;
        pos.addScaledVector(delta.normalize(), Math.min(speed * dt, distance));
        pos.y = THREE.MathUtils.damp(pos.y, 0.26, 8, dt);
        this.turn(Math.atan2(delta.x, delta.z), dt);
      }
      this.actor.update(walkPose(this.clock, 1), dt, this.clock);
    } else if (this.state === 'playing' && this.current) {
      this.elapsed += dt;
      const progress = Math.min(1, this.elapsed / this.current.duration);
      const frame = actions[this.current.action](this.elapsed, progress);
      this.actor.root.position.copy(this.actionOrigin);
      if (frame.offset) this.actor.root.position.add(new THREE.Vector3(...frame.offset));
      this.turn(frame.facing ?? this.current.facing, dt);
      this.actor.update(frame.pose, dt, this.clock);
      if (progress >= 1) {
        this.completed.add(this.current.id);
        this.onComplete(this.current);
        this.current.reset?.();
        this.state = 'idle';
        this.idle = 0;
        this.onChange();
        if (this.queued) {
          const next = this.queued;
          this.queued = null;
          this.choose(next);
        }
      }
    } else {
      this.idle += dt;
      this.actor.update(
        {
          headY: Math.sin(this.clock * 0.8) * 0.22,
          armRX: -0.15,
          headZ: Math.sin(this.clock) * 0.03,
        },
        dt,
        this.clock,
      );
      if (this.auto && this.idle > 2) this.random();
    }
    for (const toy of this.toys) {
      const active = toy === this.current && this.state === 'playing';
      toy.animate?.(
        active ? this.elapsed : this.clock,
        active,
        this.current ? this.elapsed / this.current.duration : 0,
      );
    }
  }
  private turn(angle: number, dt: number) {
    const current = this.actor.root.rotation.y;
    const diff = Math.atan2(Math.sin(angle - current), Math.cos(angle - current));
    this.actor.root.rotation.y += diff * (1 - Math.exp(-dt * 7));
  }
}
