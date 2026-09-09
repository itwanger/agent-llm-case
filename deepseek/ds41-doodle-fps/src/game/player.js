import * as THREE from 'three';
import { makeBody, moveHorizontal, moveVertical, applyGravity } from './physics.js';
import { sfx } from '../core/audio.js';

/**
 * 玩家：WASD 移动、鼠标瞄准、跳跃、疾走。
 * 碰撞用 physics.js 的 AABB 推进；相机带手绘摇晃和呼吸感。
 */

const EYE = 1.62;
const HEIGHT = 1.8;
const RADIUS = 0.34;
const STEP_UP = 0.56;
const WALK = 5.6;
const SPRINT = 8.4;
const ACCEL_GROUND = 15;
const ACCEL_AIR = 4.5;
const FRICTION = 14;
const JUMP_V = 7.6;

export class Player {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;
    this.body = makeBody(world.playerStart.x, world.playerStart.y, world.playerStart.z);
    this.body.onGround = true;
    this.radius = RADIUS;
    this.height = HEIGHT;
    this.stepUp = STEP_UP;
    this.eye = EYE;

    this.yaw = 0; // 面向 -Z（场地中央）
    this.pitch = 0;
    this.recoilYaw = 0;
    this.recoilPitch = 0;
    this.shake = 0;

    this.maxHealth = 100;
    this.health = 100;
    this.alive = true;

    this.velX = 0;
    this.velZ = 0;
    this.speedMult = 1;
    this.bobT = 0;
    this.bobY = 0;
    this.bobX = 0;
    this.stepSide = 0;
    this.visualY = this.body.y;
    this.landKick = 0;
    this.hurtFlash = 0;
    this.hurtCooldown = 0;
    this.damageIdle = 0;
    this.regen = 0;
    this.lastMoveSpeed = 0;
  }

  reset(pos) {
    const p = pos || this.world.playerStart;
    this.body = makeBody(p.x, p.y, p.z);
    this.body.onGround = true;
    this.yaw = 0;
    this.pitch = 0;
    this.recoilYaw = 0;
    this.recoilPitch = 0;
    this.shake = 0;
    this.health = this.maxHealth;
    this.alive = true;
    this.velX = 0;
    this.velZ = 0;
    this.speedMult = 1;
    this.visualY = p.y;
    this.hurtFlash = 0;
    this.hurtCooldown = 0;
    this.landKick = 0;
    this.bobY = 0;
    this.bobX = 0;
    this.bobT = 0;
    this.shake = 0;
    this.damageIdle = 0;
    this.regen = 0;
  }

  get position() {
    return this.body;
  }

  /** 眼睛（相机）位置 */
  get eyePos() {
    return new THREE.Vector3(this.body.x, this.visualY + this.eye + this.bobY, this.body.z);
  }

  /** 相机朝向单位向量 */
  forward(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);
    out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    return out.normalize();
  }

  /** 水平朝向（敌人 AI / 移动用） */
  forwardFlat(out = new THREE.Vector3()) {
    out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    return out.normalize();
  }

  addLook(dx, dy) {
    if (!this.alive) return;
    const sens = 0.0022;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const lim = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  addRecoil(pitch, yaw, shake) {
    this.recoilPitch += pitch;
    this.recoilYaw += yaw;
    this.shake = Math.min(1.4, this.shake + shake);
  }

  hurt(amount, fromX, fromZ) {
    if (!this.alive || this.hurtCooldown > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.hurtCooldown = 0.35;
    this.hurtFlash = 1;
    this.damageIdle = 0;
    this.shake = Math.min(1.6, this.shake + 0.55);
    sfx('hurt');
    // 被打时被推一下
    if (fromX !== undefined) {
      const dx = this.body.x - fromX;
      const dz = this.body.z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      this.velX += (dx / d) * 4.2;
      this.velZ += (dz / d) * 4.2;
    }
    if (this.health <= 0) this.alive = false;
    return true;
  }

  update(dt, input, opts = {}) {
    if (this.hurtCooldown > 0) this.hurtCooldown -= dt;
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dt * 3.2);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3.4);
    this.recoilPitch *= Math.max(0, 1 - dt * 12);
    this.recoilYaw *= Math.max(0, 1 - dt * 12);

    if (!this.alive) {
      // 倒地：视角下沉
      this.visualY += (this.body.y - 0.55 - this.visualY) * Math.min(1, dt * 6);
      this.updateCamera();
      return;
    }

    // ---- 输入方向（相对相机 yaw） ----
    let ix = 0;
    let iz = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) iz -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) iz += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) ix -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) ix += 1;
    const len = Math.hypot(ix, iz);
    if (len > 0) {
      ix /= len;
      iz /= len;
    }

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // 相机空间 -> 世界空间（前方 = -Z 时 iz = -1）
    const wx = ix * cos + iz * sin;
    const wz = -ix * sin + iz * cos;

    const sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const base = sprint ? SPRINT : WALK;
    const speed = base * this.speedMult;
    const wantX = wx * speed;
    const wantZ = wz * speed;

    const accel = this.body.onGround ? ACCEL_GROUND : ACCEL_AIR;
    const k = Math.min(1, accel * dt);
    this.velX += (wantX - this.velX) * k;
    this.velZ += (wantZ - this.velZ) * k;
    if (len === 0 && this.body.onGround) {
      const f = Math.max(0, 1 - FRICTION * dt);
      this.velX *= f;
      this.velZ *= f;
    }

    // ---- 跳跃 ----
    this.body.coyote = this.body.onGround ? 0.12 : Math.max(0, this.body.coyote - dt);
    if ((input.consumePress('Space') || opts.jump) && this.body.coyote > 0) {
      this.body.vy = JUMP_V;
      this.body.onGround = false;
      this.body.coyote = 0;
      sfx('jump');
    }

    // ---- 位移 ----
    const wasGround = this.body.onGround;
    moveHorizontal(this.body, this.velX * dt, this.velZ * dt, this.world.colliders, this);
    const dy = applyGravity(this.body, dt);
    const landed = moveVertical(this.body, dy, this.world.colliders, this);
    if (landed && !wasGround) {
      this.landKick = Math.min(0.14, Math.abs(this.body.vy) * 0.012 + 0.05);
      sfx('land');
    }
    this.landKick = Math.max(0, this.landKick - dt * 0.6);

    // 掉出世界兜底
    if (this.body.y < -12) {
      this.hurt(999);
      this.body.y = 0;
    }

    // ---- 相机摇晃 / 走路起伏 ----
    const hspeed = Math.hypot(this.velX, this.velZ);
    this.lastMoveSpeed = hspeed;
    const ratio = Math.min(1, hspeed / SPRINT);
    if (this.body.onGround && hspeed > 0.5) {
      const prev = this.bobT;
      this.bobT += dt * (5.6 + ratio * 4.2);
      this.bobY = Math.sin(this.bobT * 2) * 0.05 * ratio;
      this.bobX = Math.cos(this.bobT) * 0.045 * ratio;
      if (Math.floor(prev / Math.PI) !== Math.floor(this.bobT / Math.PI)) {
        sfx('step', this.stepSide);
        this.stepSide ^= 1;
      }
    } else {
      this.bobY += (0 - this.bobY) * Math.min(1, dt * 8);
      this.bobX += (0 - this.bobX) * Math.min(1, dt * 8);
    }

    // 视觉高度平滑跟上（走楼梯不会一顿一顿）
    const targetY = this.body.y;
    this.visualY += (targetY - this.visualY) * Math.min(1, dt * 16);
    if (Math.abs(targetY - this.visualY) < 0.002) this.visualY = targetY;

    // ---- 缓慢回血（受伤 6 秒后） ----
    this.damageIdle += dt;
    if (this.damageIdle > 6 && this.health < this.maxHealth && this.alive) {
      this.regen += dt;
      if (this.regen > 0.5) {
        this.regen = 0;
        this.health = Math.min(this.maxHealth, this.health + 3);
      }
    }

    this.updateCamera();
  }

  updateCamera() {
    const c = this.camera;
    const shakeX = (Math.random() - 0.5) * this.shake * 0.045;
    const shakeY = (Math.random() - 0.5) * this.shake * 0.045;
    const shakeZ = (Math.random() - 0.5) * this.shake * 0.05;

    const yaw = this.yaw + this.recoilYaw;
    const pitch = Math.max(
      -Math.PI / 2 + 0.02,
      Math.min(Math.PI / 2 - 0.02, this.pitch + this.recoilPitch),
    );

    c.position.set(
      this.body.x + this.bobX * 0.5 + shakeX,
      this.visualY + this.eye + this.bobY - this.landKick + shakeY,
      this.body.z + shakeZ,
    );
    c.rotation.set(0, 0, 0);
    c.rotation.order = 'YXZ';
    c.rotation.y = yaw;
    c.rotation.x = pitch;
    // 走路时轻微侧倾
    c.rotation.z = this.bobX * 0.16 + (this.hurtFlash > 0 ? (Math.random() - 0.5) * 0.04 : 0);
  }

  /** 供射线用的眼睛位置 + 方向（含后坐力） */
  aimRay() {
    const origin = new THREE.Vector3(
      this.body.x,
      this.visualY + this.eye + this.bobY,
      this.body.z,
    );
    const cp = Math.cos(this.pitch + this.recoilPitch);
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw + this.recoilYaw) * cp,
      Math.sin(this.pitch + this.recoilPitch),
      -Math.cos(this.yaw + this.recoilYaw) * cp,
    ).normalize();
    return { origin, dir };
  }
}
