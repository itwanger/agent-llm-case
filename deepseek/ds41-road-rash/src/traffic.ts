/* ============================================================
 * traffic.ts — civilian cars, including oncoming ones
 * ============================================================ */

import * as THREE from 'three';
import { CONFIG, PALETTE } from './config';
import { Track } from './track';
import { buildCar, CarModel } from './models';
import { RNG, clamp } from './utils';

export class TrafficCar {
  readonly model: CarModel;
  readonly group: THREE.Group;
  s = 0;
  totalS = 0;
  x = 0;
  speed = 20;
  dir: 1 | -1 = 1;
  kind: 'sedan' | 'truck' | 'wagon' = 'sedan';
  alive = false;
  wheelSpin = 0;
  halfWidth = 1.0;
  halfLength = 2.2;

  constructor(private track: Track, colorIdx: number, kind: 'sedan' | 'truck' | 'wagon') {
    this.kind = kind;
    this.model = buildCar(PALETTE.carBodies[colorIdx % PALETTE.carBodies.length], kind);
    this.group = this.model.group;
    this.halfLength = kind === 'truck' ? 2.8 : kind === 'wagon' ? 2.5 : 2.3;
    this.halfWidth = 1.0;
  }

  spawn(s: number, x: number, dir: 1 | -1, speed: number): void {
    this.totalS = s;
    this.s = s;
    this.x = x;
    this.dir = dir;
    this.speed = speed;
    this.alive = true;
    this.group.visible = true;
    // face along travel direction
    const sm = this.track.sample(s);
    this.group.position.copy(sm.pos).addScaledVector(sm.right, x);
    this.group.rotation.set(0, sm.yaw + (dir < 0 ? Math.PI : 0), 0);
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.totalS += this.dir * this.speed * dt;
    this.s = ((this.totalS % this.track.length) + this.track.length) % this.track.length;

    const sm = this.track.sample(this.s);
    this.group.position.copy(sm.pos).addScaledVector(sm.right, this.x);
    this.group.rotation.set(0, sm.yaw + (this.dir < 0 ? Math.PI : 0), 0);

    this.wheelSpin += (this.speed / 0.36) * dt;
    for (const w of this.model.wheels) w.rotation.x = this.wheelSpin;
  }

  hide(): void {
    this.alive = false;
    this.group.visible = false;
  }
}

export class Traffic {
  readonly group = new THREE.Group();
  readonly cars: TrafficCar[] = [];
  private rng = new RNG(2024);

  constructor(private track: Track) {
    const kinds: Array<'sedan' | 'truck' | 'wagon'> = ['sedan', 'wagon', 'truck'];
    for (let i = 0; i < CONFIG.traffic.count; i++) {
      const car = new TrafficCar(track, i, kinds[i % kinds.length]);
      car.hide();
      this.cars.push(car);
      this.group.add(car.group);
    }
  }

  /** Fill the road ahead of the given player distance. */
  seed(playerS: number): void {
    const T = CONFIG.traffic;
    for (let i = 0; i < this.cars.length; i++) {
      const ahead = 60 + (i / this.cars.length) * T.respawnAhead + this.rng.range(-25, 25);
      this.respawn(this.cars[i], playerS + ahead);
    }
  }

  private respawn(car: TrafficCar, s: number): void {
    const T = CONFIG.traffic;
    const oncoming = this.rng.chance(T.oncomingRatio);
    const dir: 1 | -1 = oncoming ? -1 : 1;
    // right-hand traffic: oncoming keeps to the left of the racing direction
    const lane = oncoming
      ? -this.track.halfWidth * 0.55 + this.rng.range(-1.6, 0.6)
      : this.track.halfWidth * 0.5 + this.rng.range(-0.8, 1.8);
    car.spawn(
      s,
      clamp(lane, -this.track.halfWidth + 1.2, this.track.halfWidth - 1.2),
      dir,
      this.rng.range(T.minSpeed, T.maxSpeed),
    );
  }

  update(dt: number, playerS: number): void {
    const T = CONFIG.traffic;
    for (const car of this.cars) {
      if (!car.alive) continue;
      car.update(dt);
      const rel = this.track.delta(playerS, car.s);
      if (rel < -T.despawnBehind) {
        this.respawn(car, playerS + T.respawnAhead * this.rng.range(0.75, 1.2));
      }
    }
  }

  reset(playerS: number): void {
    for (const car of this.cars) car.hide();
    this.rng = new RNG(2024);
    this.seed(playerS);
  }
}
