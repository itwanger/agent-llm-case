/* ============================================================
 * entities.ts — Racer: player + AI share one class.
 *
 * Motion is modelled in track space (totalS along the road,
 * x = lateral offset) which keeps ranking, AI, combat and
 * lap counting exact and jitter-free. A crash detaches the
 * rider from the bike and lets both slide as separate bodies.
 * ============================================================ */

import * as THREE from 'three';
import { CONFIG, PALETTE } from './config';
import { Track } from './track';
import { buildBike, buildRider, BikeModel, RiderModel } from './models';
import { clamp, damp, RNG, wrapDist } from './utils';

export type AttackKind = 'none' | 'punchL' | 'punchR' | 'club';
export type RacerState = 'riding' | 'sliding' | 'recovering' | 'finished';

export interface RagdollBody {
  active: boolean;
  s: number;
  x: number;
  y: number; // height above ground
  vs: number;
  vx: number;
  vy: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

const emptyBody = (): RagdollBody => ({
  active: false,
  s: 0,
  x: 0,
  y: 0,
  vs: 0,
  vx: 0,
  vy: 0,
  spinX: 0,
  spinY: 0,
  spinZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
});

export class Racer {
  /* --- identity --- */
  readonly id: number;
  readonly isPlayer: boolean;
  readonly name: string;
  readonly color: number;

  /* --- track-space motion --- */
  totalS = 0; // monotonically increasing distance (ranking key)
  s = 0; // wrapped position for rendering
  x = 0;
  speed = 0;
  lateralVel = 0;
  steerInput = 0;
  lean = 0;
  steerVis = 0;
  wheelSpin = 0;

  /* --- race progress --- */
  lap = 1;
  rank = 1;
  finished = false;
  finishTime = 0;
  dnf = false;

  /* --- health / state --- */
  health: number = CONFIG.combat.maxHealth;
  state: RacerState = 'riding';
  stunTimer = 0;
  invulnTimer = 0;
  offroad = false;
  crashTimer = 0;
  crashKind = '';

  /* --- combat --- */
  attack: AttackKind = 'none';
  attackT = 0;
  attackDur = 0;
  attackHit = false;
  cooldown = 0;
  hitFlash = 0;
  lastAttacker = -1;
  combo = 0;
  comboTimer = 0;
  hitsLanded = 0;
  knockdowns = 0;

  /* --- ragdoll bodies --- */
  riderBody: RagdollBody = emptyBody();
  bikeBody: RagdollBody = emptyBody();

  /* --- ai scratch --- */
  aiTargetX = 0;
  aiThrottle = 1;
  aiBrake = false;
  aiSkill = 1;
  aiAggression = 1;
  aiNextAttack = 2;
  aiWobble = 0;
  aiWobblePhase = 0;
  aiTargetSpeed = 0;
  readonly aiRng: RNG;

  /* --- three.js --- */
  readonly root = new THREE.Group();
  readonly bikeGroup: THREE.Group;
  readonly riderGroup: THREE.Group;
  readonly bike: BikeModel;
  readonly rider: RiderModel;

  private readonly tmpV = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpM = new THREE.Matrix4();
  private readonly qYaw = new THREE.Quaternion();
  private readonly qRoll = new THREE.Quaternion();
  private readonly qA = new THREE.Quaternion();
  private readonly qB = new THREE.Quaternion();
  private readonly qC = new THREE.Quaternion();
  private readonly AXIS_Y = new THREE.Vector3(0, 1, 0);
  private readonly AXIS_Z = new THREE.Vector3(0, 0, 1);
  private readonly AXIS_X = new THREE.Vector3(1, 0, 0);

  constructor(
    private track: Track,
    id: number,
    isPlayer: boolean,
    name: string,
    colorIdx: number,
    seed: number,
  ) {
    this.id = id;
    this.isPlayer = isPlayer;
    this.name = name;
    this.color = PALETTE.bikeFrames[colorIdx % PALETTE.bikeFrames.length];

    this.bike = buildBike(this.color);
    this.rider = buildRider(
      PALETTE.riderSuits[colorIdx % PALETTE.riderSuits.length],
      this.color,
    );
    this.bikeGroup = this.bike.group;
    this.riderGroup = this.rider.group;
    this.root.add(this.bikeGroup, this.riderGroup);

    const rng = new RNG(seed);
    this.aiRng = rng;
    this.aiSkill = rng.range(0.82, 1.06);
    this.aiAggression = rng.range(0.55, 1.25);
    this.aiWobble = rng.range(-1.6, 1.6);
    this.aiWobblePhase = rng.range(0, 6.28);
    this.aiNextAttack = rng.range(1.2, 4);
  }

  /* ---------------------------------------------------------------
   * reset / grid placement
   * ------------------------------------------------------------- */
  placeOnGrid(slot: number): void {
    const row = Math.floor(slot / 2);
    const col = slot % 2;
    // staggered grid, like a real race start
    this.totalS = -row * 4.6 - col * 2.0 - 1.5;
    this.x = (col === 0 ? -1 : 1) * 3.4 + (row % 2 === 0 ? 0 : 0.7);
    this.s = wrapDist(this.totalS, this.track.length);
    this.speed = 0;
    this.lateralVel = 0;
    this.lean = 0;
    this.steerVis = 0;
    this.steerInput = 0;
    this.health = CONFIG.combat.maxHealth;
    this.state = 'riding';
    this.stunTimer = 0;
    this.invulnTimer = 1.2;
    this.crashTimer = 0;
    this.attack = 'none';
    this.attackT = 0;
    this.attackHit = false;
    this.cooldown = 0;
    this.hitFlash = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hitsLanded = 0;
    this.knockdowns = 0;
    this.finished = false;
    this.dnf = false;
    this.finishTime = 0;
    this.lap = 1;
    this.riderBody = emptyBody();
    this.bikeBody = emptyBody();
    this.riderGroup.visible = true;
    this.bikeGroup.visible = true;
    this.riderGroup.position.set(0, 0, 0);
    this.riderGroup.rotation.set(0, 0, 0);
    this.bikeGroup.position.set(0, 0, 0);
    this.bikeGroup.rotation.set(0, 0, 0);
    this.rider.torso.rotation.set(-0.42, 0, 0);
    this.rider.head.rotation.set(0, 0, 0);
    this.rider.club.visible = true;
  }

  get isCrashed(): boolean {
    return this.state === 'sliding';
  }

  get progress(): number {
    return this.totalS;
  }

  get maxSpeed(): number {
    return CONFIG.bike.maxSpeed * (this.isPlayer ? 1 : this.aiSkill);
  }

  /* ---------------------------------------------------------------
   * driving physics
   * ------------------------------------------------------------- */
  drive(dt: number, throttle: boolean, brake: boolean, steer: number): void {
    if (this.state !== 'riding' && this.state !== 'finished') return;

    const B = CONFIG.bike;
    const stunned = this.stunTimer > 0;
    const steerMul = stunned ? 0.35 : 1;

    /* longitudinal */
    let accel = 0;
    const speedFrac = clamp(this.speed / B.maxSpeed, 0, 1);
    if (throttle && !stunned) {
      accel += B.accel * (1 - speedFrac * 0.82);
    }
    if (brake) {
      accel -= this.speed > 0 ? B.brake : B.brake * 0.4;
    }
    if (!throttle && !brake) {
      accel -= B.coastDrag * Math.sign(this.speed) + B.engineBrake * 0.25 * Math.sign(this.speed);
    }
    // gravity along the slope
    accel -= this.track.sample(this.s).grade * 9.81 * 0.55;
    // off-road penalty
    if (this.offroad) accel -= B.offroadDrag * clamp(this.speed / 20, 0.25, 1.4);

    this.speed += accel * dt;
    this.speed = clamp(this.speed, B.reverseSpeed, this.maxSpeed);
    if (!throttle && !brake && Math.abs(this.speed) < 0.6) this.speed *= 0.86;

    /* lateral */
    const speedFactor =
      clamp(this.speed / 13, 0, 1) * (1 - 0.3 * clamp(this.speed / B.maxSpeed, 0, 1));
    const targetLat = steer * steerMul * 3.35 * speedFactor;
    this.lateralVel = damp(this.lateralVel, targetLat, B.steerLerp, dt);

    /* integrate */
    this.totalS += this.speed * dt;
    this.x += this.lateralVel * dt;

    /* off-road / wall handling */
    const limit = this.track.offroadLimit;
    const asphalt = this.track.halfWidth - 0.2;
    this.offroad = Math.abs(this.x) > asphalt;
    if (Math.abs(this.x) > limit) {
      this.x = Math.sign(this.x) * limit;
      this.lateralVel *= -0.15;
      this.speed *= 0.9;
      this.hitFlash = Math.max(this.hitFlash, 0.25);
    }
    this.s = wrapDist(this.totalS, this.track.length);
  }

  /** Apply longitudinal/lateral impulses (combat, bumps). */
  nudge(ds: number, dx: number, speedMul = 1): void {
    this.totalS += ds;
    this.x += dx;
    this.lateralVel += dx * 6;
    this.speed *= speedMul;
    this.s = wrapDist(this.totalS, this.track.length);
  }

  takeHit(damage: number, fromX: number, byId: number, now: number): boolean {
    if (this.invulnTimer > 0 || this.state === 'sliding') return false;
    this.health -= damage;
    this.hitFlash = 1;
    this.stunTimer = CONFIG.combat.hitStun;
    this.lastAttacker = byId;
    const dir = Math.sign(this.x - fromX) || 1;
    this.lateralVel += dir * CONFIG.combat.knockback;
    this.speed *= CONFIG.bike.takeHitSlowdown;
    this.invulnTimer = 0.22;
    if (this.health <= 0) {
      this.health = 0;
      this.startCrash(now, 'KO');
      return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------
   * crash + recovery
   * ------------------------------------------------------------- */
  startCrash(now: number, kind: string): void {
    if (this.state === 'sliding') return;
    this.state = 'sliding';
    this.crashTimer = 0;
    this.crashKind = kind;
    this.attack = 'none';
    this.attackT = 0;
    this.lean = 0;

    const sm = this.track.sample(this.s);
    const fwd = sm.fwd;
    const right = sm.right;
    const spd = Math.max(6, Math.abs(this.speed));
    const dirS = Math.sign(this.speed) || 1;

    const launch = (
      body: RagdollBody,
      side: number,
      up: number,
      spin: number,
      fwdFrac: number,
      sidePush: number,
    ) => {
      body.active = true;
      body.s = this.s;
      body.x = clamp(
        this.x + side * sidePush,
        -this.track.offroadLimit,
        this.track.offroadLimit,
      );
      body.y = 0.35 + up;
      body.vs = dirS * spd * fwdFrac + 1.5;
      body.vx = side * (2.4 + Math.random() * 2.2) + this.lateralVel * 0.7;
      body.vy = 3.2 + up * 2.4;
      body.spinX = (Math.random() - 0.5) * spin;
      body.spinY = (Math.random() - 0.5) * spin * 1.6;
      body.spinZ = (Math.random() - 0.5) * spin * 1.3;
      body.rotX = 0;
      body.rotY = sm.yaw;
      body.rotZ = 0;
    };
    // the rider is thrown sideways and up while the bike keeps sliding
    // forward — different velocities make the two bodies separate clearly
    const side = Math.random() < 0.5 ? -1 : 1;
    launch(this.riderBody, side, 0.55, 9.0, 0.5, 1.1);
    launch(this.bikeBody, -side, 0.05, 12.0, 1.0, 0.5);
    this.bikeBody.vy += 1.4;
    void fwd;
    void right;
  }

  private updateRagdoll(body: RagdollBody, dt: number, isBike: boolean): void {
    if (!body.active) return;
    const C = CONFIG.crash;
    body.vy -= C.gravity * dt;
    body.y += body.vy * dt;

    if (body.y <= 0) {
      body.y = 0;
      if (body.vy < -1.6) {
        body.vy = -body.vy * (isBike ? 0.3 : 0.22);
        body.spinX += (Math.random() - 0.5) * 3;
      } else {
        body.vy = 0;
      }
      const f = Math.exp(-C.friction * (isBike ? 2.2 : 1.5) * dt);
      body.vs *= f;
      body.vx *= f;
      body.spinX *= Math.exp(-2.2 * dt);
      body.spinY *= Math.exp(-1.8 * dt);
      body.spinZ *= Math.exp(-2.4 * dt);
    }
    body.s += body.vs * dt;
    body.x += body.vx * dt;

    const lim = this.track.offroadLimit + 1.5;
    if (Math.abs(body.x) > lim) {
      body.x = Math.sign(body.x) * lim;
      body.vx *= -0.4;
    }
    body.rotX += body.spinX * dt;
    body.rotY += body.spinY * dt;
    body.rotZ += body.spinZ * dt;
  }

  updateCrash(dt: number): void {
    if (this.state !== 'sliding') return;
    this.crashTimer += dt;
    this.updateRagdoll(this.riderBody, dt, false);
    this.updateRagdoll(this.bikeBody, dt, true);
    this.speed *= Math.exp(-1.6 * dt);
    this.totalS += this.speed * dt * 0.35;
    this.s = wrapDist(this.totalS, this.track.length);

    if (this.crashTimer >= CONFIG.crash.slideTime) {
      this.recover();
    }
  }

  recover(): void {
    const C = CONFIG.crash;
    this.state = 'riding';
    this.riderBody.active = false;
    this.bikeBody.active = false;
    this.health = Math.max(this.health, C.recoverHealth);
    this.speed = 14;
    this.lateralVel = 0;
    this.stunTimer = 0;
    this.invulnTimer = C.invuln;
    this.offroad = false;
    this.x = clamp(this.x, -this.track.halfWidth * 0.6, this.track.halfWidth * 0.6);
    this.s = wrapDist(this.totalS, this.track.length);
    this.riderGroup.position.set(0, 0, 0);
    this.riderGroup.rotation.set(0, 0, 0);
    this.bikeGroup.position.set(0, 0, 0);
    this.bikeGroup.rotation.set(0, 0, 0);
    this.rider.torso.rotation.set(-0.42, 0, 0);
    this.rider.head.rotation.set(0, 0, 0);
  }

  /* ---------------------------------------------------------------
   * combat timers
   * ------------------------------------------------------------- */
  startAttack(kind: AttackKind): boolean {
    if (this.state !== 'riding' && this.state !== 'finished') return false;
    if (this.cooldown > 0 || this.attack !== 'none' || this.stunTimer > 0) return false;
    const C = CONFIG.combat;
    this.attack = kind;
    this.attackT = 0;
    this.attackHit = false;
    this.attackDur =
      kind === 'club' ? C.clubSwingTime : kind === 'none' ? 0 : C.punchTime;
    this.cooldown =
      kind === 'club' ? C.clubCooldown : kind === 'none' ? 0 : C.punchCooldown;
    return true;
  }

  get attackActive(): boolean {
    if (this.attack === 'none') return false;
    const t = this.attackT / this.attackDur;
    return t > 0.12 && t < 0.72;
  }

  updateTimers(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 3.2);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;

    if (this.attack !== 'none') {
      this.attackT += dt;
      if (this.attackT >= this.attackDur) {
        this.attack = 'none';
        this.attackT = 0;
      }
    }
    this.lap = clamp(Math.floor(this.totalS / this.track.length) + 1, 1, CONFIG.race.laps);
  }

  /* ---------------------------------------------------------------
   * visuals
   * ------------------------------------------------------------- */
  updateVisual(dt: number, time: number): void {
    const B = CONFIG.bike;
    const sm = this.track.sample(this.s);

    /* lean & steering visuals */
    const speedFrac = clamp(Math.abs(this.speed) / B.maxSpeed, 0, 1);
    let leanTarget = clamp(-this.lateralVel * 0.3, -B.maxLean, B.maxLean);
    if (this.state === 'sliding') leanTarget = 0;
    if (this.stunTimer > 0) {
      leanTarget += Math.sin(time * 26) * 0.13 * (this.stunTimer / CONFIG.combat.hitStun);
    }
    this.lean = damp(this.lean, leanTarget, 7.5, dt);
    const steerTarget = clamp(this.lateralVel * 0.34, -0.5, 0.5);
    this.steerVis = damp(this.steerVis, steerTarget, 9, dt);

    /* wheel + suspension */
    this.wheelSpin += (this.speed / B.wheelRadius) * dt;
    this.bike.frontWheel.rotation.x = this.wheelSpin;
    this.bike.rearWheel.rotation.x = this.wheelSpin;
    this.bike.fork.rotation.y = -this.steerVis * 0.85;

    const bump = this.offroad ? Math.sin(time * 34 + this.id * 2.1) * 0.055 * clamp(Math.abs(this.speed) / 18, 0.2, 1) : 0;

    if (this.state === 'sliding') {
      this.applyRagdollVisual();
      return;
    }

    /* bike transform */
    const yaw = sm.yaw + this.steerVis * 0.5;
    this.tmpM.makeBasis(sm.right, sm.up, sm.fwd);
    this.tmpQ.setFromRotationMatrix(this.tmpM);
    this.qYaw.setFromAxisAngle(this.AXIS_Y, this.steerVis * 0.42);
    this.qRoll.setFromAxisAngle(this.AXIS_Z, this.lean);
    this.bikeGroup.quaternion.copy(this.tmpQ).multiply(this.qYaw).multiply(this.qRoll);
    this.bikeGroup.position.copy(sm.pos).addScaledVector(sm.right, this.x).addScaledVector(sm.up, bump);

    /* rider shares the bike transform, plus its own animation */
    this.riderGroup.position.copy(this.bikeGroup.position);
    this.riderGroup.quaternion.copy(this.bikeGroup.quaternion);

    this.animateRider(dt, time, speedFrac);

    /* brake light */
    const braking = this.speed < -0.5;
    (this.bike.brakeLight.material as THREE.MeshLambertMaterial).emissiveIntensity =
      braking ? 3.2 : 1.4;

    /* damage tint */
    const f = this.hitFlash;
    const bodyMat = this.bike.brakeLight.material as THREE.MeshLambertMaterial;
    void bodyMat;
    this.rider.torso.rotation.z = -this.lean * 0.28;
    if (f > 0.01) {
      this.rider.torso.rotation.x = -0.42 + Math.sin(time * 40) * 0.09 * f;
    }
  }

  private applyRagdollVisual(): void {
    const r = this.riderBody;
    const b = this.bikeBody;
    const smR = this.track.sample(r.s);
    this.tmpM.makeBasis(smR.right, smR.up, smR.fwd);
    this.tmpQ.setFromRotationMatrix(this.tmpM);
    this.qA.setFromAxisAngle(this.AXIS_X, r.rotX);
    this.qB.setFromAxisAngle(this.AXIS_Y, r.rotY);
    this.qC.setFromAxisAngle(this.AXIS_Z, r.rotZ);
    this.riderGroup.quaternion.copy(this.tmpQ).multiply(this.qA).multiply(this.qB).multiply(this.qC);
    this.riderGroup.position
      .copy(smR.pos)
      .addScaledVector(smR.right, r.x)
      .addScaledVector(smR.up, r.y);
    this.rider.torso.rotation.set(-0.2, 0, 0);

    const smB = this.track.sample(b.s);
    this.tmpM.makeBasis(smB.right, smB.up, smB.fwd);
    this.tmpQ.setFromRotationMatrix(this.tmpM);
    this.qA.setFromAxisAngle(this.AXIS_X, b.rotX);
    this.qB.setFromAxisAngle(this.AXIS_Y, b.rotY);
    this.qC.setFromAxisAngle(this.AXIS_Z, b.rotZ);
    this.bikeGroup.quaternion.copy(this.tmpQ).multiply(this.qA).multiply(this.qB).multiply(this.qC);
    this.bikeGroup.position
      .copy(smB.pos)
      .addScaledVector(smB.right, b.x)
      .addScaledVector(smB.up, b.y);
    this.wheelSpin += 8 * 0.016;
    this.bike.frontWheel.rotation.x = this.wheelSpin;
    this.bike.rearWheel.rotation.x = this.wheelSpin;
  }

  private animateRider(dt: number, time: number, speedFrac: number): void {
    const R = this.rider;
    const t = this.attack === 'none' ? 0 : clamp(this.attackT / this.attackDur, 0, 1);

    /* rest pose */
    let armLX = -1.16;
    let armRX = -1.16;
    let armLY = 0;
    let armRY = 0;
    let armLZ = 0;
    let armRZ = 0;
    let foreL = -0.22;
    let foreR = -0.22;
    let torsoY = 0;
    let headY = 0;

    const bounce = Math.sin(time * 3.1 + this.id) * 0.02 * speedFrac;
    const crouch = -0.42 - speedFrac * 0.12 + bounce;

    if (this.attack === 'punchL') {
      const e = Math.sin(Math.PI * t); // out and back
      armLX = -1.16 - e * 0.85;
      armLY = e * 0.95;
      armLZ = e * 0.25;
      foreL = -0.22 + e * 0.75;
      torsoY = e * 0.28;
      headY = e * 0.12;
    } else if (this.attack === 'punchR') {
      const e = Math.sin(Math.PI * t);
      armRX = -1.16 - e * 0.85;
      armRY = -e * 0.95;
      armRZ = -e * 0.25;
      foreR = -0.22 + e * 0.75;
      torsoY = -e * 0.28;
      headY = -e * 0.12;
    } else if (this.attack === 'club') {
      // wind up behind, then a wide overhead swing across the body
      const wind = clamp(t / 0.34, 0, 1);
      const swing = clamp((t - 0.3) / 0.55, 0, 1);
      const e = swing * swing;
      armRX = -1.16 + wind * 1.1 - e * 1.9;
      armRY = wind * 0.5 - e * 1.75;
      armRZ = wind * -1.15 + e * 0.9;
      foreR = -0.22 + wind * 0.5 - e * 0.35;
      torsoY = wind * -0.32 + e * 0.85;
      headY = torsoY * 0.45;
    }

    const k = 12;
    R.armL.rotation.x = damp(R.armL.rotation.x, armLX, k, dt);
    R.armR.rotation.x = damp(R.armR.rotation.x, armRX, k, dt);
    R.armL.rotation.y = damp(R.armL.rotation.y, armLY, k, dt);
    R.armR.rotation.y = damp(R.armR.rotation.y, armRY, k, dt);
    R.armL.rotation.z = damp(R.armL.rotation.z, armLZ, k, dt);
    R.armR.rotation.z = damp(R.armR.rotation.z, armRZ, k, dt);
    R.foreL.rotation.x = damp(R.foreL.rotation.x, foreL, k, dt);
    R.foreR.rotation.x = damp(R.foreR.rotation.x, foreR, k, dt);
    R.torso.rotation.y = damp(R.torso.rotation.y, torsoY, 10, dt);
    R.head.rotation.y = damp(R.head.rotation.y, headY, 10, dt);
    R.torso.rotation.x = damp(R.torso.rotation.x, crouch, 8, dt);
    R.club.visible = true;

    /* legs tuck with lean */
    R.legL.rotation.z = damp(R.legL.rotation.z, this.lean * 0.35, 8, dt);
    R.legR.rotation.z = damp(R.legR.rotation.z, this.lean * 0.35, 8, dt);

    /* stun wobble */
    if (this.stunTimer > 0) {
      R.head.rotation.z = Math.sin(time * 30) * 0.22 * (this.stunTimer / CONFIG.combat.hitStun);
    } else {
      R.head.rotation.z = damp(R.head.rotation.z, 0, 8, dt);
    }
  }

  /** World-space position of the rider's chest (for particles / camera). */
  chestPos(out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(this.riderGroup.position).addScaledVector(this.track.sample(this.s).up, 1.35);
  }

  dispose(): void {
    this.root.clear();
  }
}
