import * as THREE from 'three';
import { CONFIG } from './config';
import type { BikeView } from './models';

export type AttackType = 'punchL' | 'punchR' | 'club';
export type RacerState = 'race' | 'crashed' | 'finished';
export type AggroState = 'none' | 'approach' | 'taunt' | 'attack' | 'disengage';

export interface AttackState {
  type: AttackType;
  t: number;
  hit: Set<number>;
}

export class Racer {
  id: number;
  name: string;
  isPlayer: boolean;
  color: number;
  s = 0;
  t = 0;
  v = 0;
  tVel = 0;
  hp = CONFIG.combat.hp;
  state: RacerState = 'race';
  steer = 0;
  steerInput = 0;
  roll = 0;
  attack: AttackState | null = null;
  punchCd = 0;
  clubCd = 0;
  invuln = 0;
  hitStun = 0;
  flash = 0;
  finishTime = -1;
  throttle = 0;
  brake = 0;

  // crash sim
  downTimer = 0;
  riderS = 0;
  riderT = 0;
  riderY = 0;
  riderVS = 0;
  riderVT = 0;
  riderVY = 0;
  riderBounced = false;
  bikeVS = 0;
  bikeVT = 0;
  tumble = 0;
  tumbleDir = 1;

  // ai
  skill = 1;
  cruiseV = 0;
  laneT = 3.6;
  aggro: AggroState = 'none';
  aggroTimer = 0;
  attackCd = 2;
  side = 1;
  overtakeTimer = 0;
  pendingAttack?: AttackType;
  hold = false;

  view: BikeView | null = null;

  constructor(id: number, name: string, isPlayer: boolean, color: number) {
    this.id = id;
    this.name = name;
    this.isPlayer = isPlayer;
    this.color = color;
  }

  get alive() {
    return this.state === 'race';
  }

  reset(s: number, t: number, v: number, hp = CONFIG.combat.hp) {
    this.s = s;
    this.t = t;
    this.v = v;
    this.tVel = 0;
    this.hp = hp;
    this.state = 'race';
    this.steer = 0;
    this.steerInput = 0;
    this.roll = 0;
    this.attack = null;
    this.punchCd = 0;
    this.clubCd = 0;
    this.invuln = 0;
    this.hitStun = 0;
    this.flash = 0;
    this.finishTime = -1;
    this.throttle = 0;
    this.brake = 0;
    this.downTimer = 0;
    this.aggro = 'none';
    this.aggroTimer = 0;
    this.attackCd = 1 + Math.random() * 2;
    this.overtakeTimer = 0;
    this.laneT = t;
  }
}

export class TrafficCar {
  s = 0;
  t = 0;
  v = 0;
  active = false;
  wobble = Math.random() * 10;
  view: { group: THREE.Group; wheelF: THREE.Mesh[]; wheelR: THREE.Mesh[] } | null = null;
}
