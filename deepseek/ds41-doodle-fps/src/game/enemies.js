import * as THREE from 'three';
import { doodle, inkLine, inkFill, RED, RED_DARK, INK, segmentBlocked } from '../core/doodle.js';
import { makeBody, moveHorizontal, moveVertical, applyGravity } from './physics.js';
import { sfx } from '../core/audio.js';

/**
 * 红色火柴人：全部由「红笔线条 + 浅红填充」组成。
 * 会追击、会绕开墙、能爬楼梯、有起手动作再攻击。
 */

const EYE_H = 1.55;
const HEIGHT = 1.86;
const RADIUS = 0.4;
const STEP_UP = 0.56;
const ATTACK_RANGE = 2.45;
const ATTACK_DAMAGE = 11;
const WINDUP = 0.42;
const COOLDOWN = 1.05;

let idSeq = 0;

function redPart(geo, opts = {}) {
  return doodle(geo, {
    fillColor: 0xf8d9d2,
    fillHatch: 0,
    ink: RED,
    inkOpacity: 0.95,
    jitter: 0.016,
    doubleStroke: true,
    ...opts,
  });
}

export class Enemy {
  constructor(scene, world, spawnPos, opts = {}) {
    this.id = ++idSeq;
    this.world = world;
    this.scene = scene;
    this.health = opts.health ?? 34;
    this.maxHealth = this.health;
    this.speed = (opts.speed ?? 3.05) * (0.9 + Math.random() * 0.22);
    this.damage = ATTACK_DAMAGE;
    this.state = 'chase';
    this.stateT = 0;
    this.phase = Math.random() * 6.28;
    this.flash = 0;
    this.dead = false;
    this.remove = false;
    this.deathT = 0;
    this.attackDone = false;
    this.walkAmt = 0;
    this.stuckT = 0;
    this.sideSign = Math.random() > 0.5 ? 1 : -1;
    this.hitFlashT = 0;

    const p = spawnPos;
    this.body = makeBody(p.x, p.y, p.z);
    this.body.onGround = true;
    this.radius = RADIUS;
    this.height = HEIGHT;
    this.stepUp = STEP_UP;

    this.hitbox = {
      min: new THREE.Vector3(p.x - RADIUS, p.y, p.z - RADIUS),
      max: new THREE.Vector3(p.x + RADIUS, p.y + HEIGHT, p.z + RADIUS),
    };

    this.group = new THREE.Group();
    this.group.position.set(p.x, p.y, p.z);
    scene.add(this.group);

    this._build();
  }

  _build() {
    const g = this.group;
    const bodyMat = 0xf8d9d2;

    // 躯干
    this.torso = redPart(new THREE.BoxGeometry(0.36, 0.66, 0.17), { fillColor: bodyMat });
    this.torso.position.y = 1.08;
    g.add(this.torso);

    // 胯部到腿的支点
    this.legPivots = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.11, 0.78, 0);
      const leg = redPart(new THREE.BoxGeometry(0.115, 0.78, 0.115), { fillColor: bodyMat });
      leg.position.y = -0.39;
      pivot.add(leg);
      g.add(pivot);
      this.legPivots.push(pivot);
    }

    // 肩关节
    this.armPivots = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.24, 1.36, 0);
      const arm = redPart(new THREE.BoxGeometry(0.1, 0.64, 0.1), { fillColor: bodyMat });
      arm.position.y = -0.32;
      pivot.add(arm);
      // 手：小方块
      const hand = redPart(new THREE.BoxGeometry(0.15, 0.15, 0.15), { fillColor: 0xf3bdb3 });
      hand.position.y = -0.68;
      pivot.add(hand);
      g.add(pivot);
      this.armPivots.push(pivot);
    }

    // 头（面向相机的圆）
    this.head = new THREE.Group();
    this.head.position.y = 1.63;
    const face = redPart(new THREE.CircleGeometry(0.235, 20), {
      fillColor: 0xfbe6e1,
      doubleStroke: false,
      jitter: 0.012,
    });
    face.position.z = 0;
    this.head.add(face);
    // 眼睛：两个墨点
    const eyeGeo = new THREE.CircleGeometry(0.033, 8);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, inkFill(INK, { flat: true }));
      eye.position.set(s * 0.075, 0.045, 0.005);
      this.head.add(eye);
    }
    // 倒竖的眉毛，让表情凶一点
    for (const s of [-1, 1]) {
      const brow = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(s * 0.125, 0.125, 0.006),
          new THREE.Vector3(s * 0.03, 0.078, 0.006),
        ]),
        inkLine(RED_DARK, 0.95),
      );
      this.head.add(brow);
    }
    // 一张向下撇的嘴（生气，不是委屈）
    const mouth = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.075, -0.052, 0.01),
        new THREE.Vector3(0, -0.095, 0.01),
        new THREE.Vector3(0.075, -0.052, 0.01),
      ]),
      inkLine(RED_DARK, 0.95),
    );
    this.head.add(mouth);
    g.add(this.head);

    // 脚下的手绘圆圈，让火柴人在纸面上「站得住」
    const ring = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 25 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * 0.42, 0.012, Math.sin(a) * 0.42);
        }),
      ),
      inkLine(RED, 0.3),
    );
    g.add(ring);
  }

  get position() {
    return this.body;
  }

  /** 玩家射击用：世界坐标 AABB */
  updateHitbox() {
    const b = this.body;
    this.hitbox.min.set(b.x - RADIUS, b.y, b.z - RADIUS);
    this.hitbox.max.set(b.x + RADIUS, b.y + HEIGHT, b.z + RADIUS);
    return this.hitbox;
  }

  /** 被击中；返回是否致死 */
  hit(damage, dirX, dirZ, hx, hy, hz, effects) {
    if (this.dead) return false;
    this.health -= damage;
    this.flash = 1;
    this.hitFlashT = 0.18;

    // 溅墨：红色颗粒 + 命中点贴花（贴花小一点，别糊住火柴人的四肢）
    const n = Math.hypot(dirX, dirZ) || 1;
    effects.burst(hx, hy, hz, -dirX / n, 0.4, -dirZ / n, 12, 0xd8402f, 3.6, 1.1, 0.13, 0.45);
    effects.splat(hx, hy, hz, -dirX / n, 0.25, -dirZ / n, 0.24, 1, 6);

    // 被推一下（力度和伤害挂钩，但不要太夸张）
    const push = damage * 0.018;
    this.body.x += (dirX / n) * push;
    this.body.z += (dirZ / n) * push;

    if (this.health <= 0) {
      this.die(effects);
      return true;
    }
    // 打断攻击
    if (this.state === 'windup') {
      this.state = 'stagger';
      this.stateT = 0.34;
    }
    return false;
  }

  die(effects) {
    if (this.dead) return;
    this.dead = true;
    this.deathT = 0;
    this.state = 'dead';
    sfx('kill');
    const b = this.body;
    effects.burst(b.x, b.y + 1.0, b.z, 0, 1, 0, 34, 0xd8402f, 4.4, 1.4, 0.15, 0.7);
    effects.burst(b.x, b.y + 1.4, b.z, 0, 1, 0, 10, 0x9c2a1c, 3.0, 1.2, 0.18, 0.6);
    effects.splat(b.x, 0.014, b.z, 0, 1, 0, 1.5, 1, 60, true);
    effects.splat(b.x, b.y + 1.0, b.z, 0, 0, 1, 0.7, 1, 12, true);
  }

  update(dt, player, effects, others) {
    if (this.dead) {
      this._updateDeath(dt);
      return;
    }

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4.5);
    if (this.hitFlashT > 0) this.hitFlashT -= dt;

    const b = this.body;
    const px = player.body.x;
    const pz = player.body.z;
    const dx = px - b.x;
    const dz = pz - b.z;
    const dist = Math.hypot(dx, dz);
    const los = !segmentBlocked(
      b.x, b.y + EYE_H, b.z,
      player.body.x, player.visualY + player.eye, player.body.z,
      this.world.shootables,
    );

    let moveX = 0;
    let moveZ = 0;
    let speed = this.speed;

    this.stateT += dt;

    if (this.state === 'chase') {
      if (dist < ATTACK_RANGE && los && player.alive) {
        this.state = 'windup';
        this.stateT = 0;
        this.attackDone = false;
      } else if (dist > 0.4) {
        // 朝向玩家走；贴墙时侧向绕行
        let dirX = dx / dist;
        let dirZ = dz / dist;
        if (this.stuckT > 0.25) {
          const a = this.sideSign * 1.15;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const rx = dirX * c - dirZ * s;
          const rz = dirX * s + dirZ * c;
          dirX = rx;
          dirZ = rz;
        }
        moveX = dirX * speed * dt;
        moveZ = dirZ * speed * dt;
      }
    } else if (this.state === 'windup') {
      if (this.stateT >= WINDUP) {
        this.state = 'strike';
        this.stateT = 0;
        this.attackDone = false;
      }
      // 起手时缓慢逼近，不站桩
      if (dist > 1.4) {
        moveX = (dx / dist) * this.speed * 0.4 * dt;
        moveZ = (dz / dist) * this.speed * 0.4 * dt;
      }
    } else if (this.state === 'strike') {
      if (!this.attackDone) {
        this.attackDone = true;
        if (dist < ATTACK_RANGE + 0.55 && los && player.alive) {
          player.hurt(this.damage, b.x, b.z);
          effects.burst(
            player.body.x, player.visualY + 1.2, player.body.z,
            0, 0.6, 0, 14, 0xd8402f, 3.2, 1.2, 0.12, 0.4,
          );
        } else {
          sfx('dry');
        }
      }
      if (this.stateT > 0.22) {
        this.state = 'cooldown';
        this.stateT = 0;
      }
    } else if (this.state === 'cooldown') {
      if (this.stateT > COOLDOWN) {
        this.state = 'chase';
        this.stateT = 0;
      }
    } else if (this.state === 'stagger') {
      if (this.stateT > 0.34) {
        this.state = 'chase';
        this.stateT = 0;
      }
    }

    // ---- 位移 ----
    const before = { x: b.x, z: b.z };
    const res = moveHorizontal(b, moveX, moveZ, this.world.colliders, this);
    const moved = Math.hypot(b.x - before.x, b.z - before.z);
    const wanted = Math.hypot(moveX, moveZ);
    if (wanted > 1e-4 && moved < wanted * 0.35) {
      this.stuckT += dt;
      if (this.stuckT > 1.1) {
        this.sideSign *= -1;
        this.stuckT = 0.3;
      }
    } else {
      this.stuckT = Math.max(0, this.stuckT - dt * 2);
    }
    if (res.blocked && this.stuckT > 0.5) this.sideSign *= Math.random() > 0.5 ? 1 : -1;

    // 与其他火柴人分离
    if (others) {
      for (let i = 0; i < others.length; i++) {
        const o = others[i];
        if (o === this || o.dead) continue;
        const ddx = b.x - o.body.x;
        const ddz = b.z - o.body.z;
        const dd = Math.hypot(ddx, ddz);
        const min = RADIUS * 2;
        if (dd < min && dd > 1e-4) {
          const push = ((min - dd) / dd) * 0.5;
          b.x += ddx * push;
          b.z += ddz * push;
        }
      }
    }

    const dy = applyGravity(b, dt);
    moveVertical(b, dy, this.world.colliders, this);

    this.updateHitbox();
    this._animate(dt, dist, Math.hypot(moveX, moveZ) > 1e-4, player);
  }

  _animate(dt, dist, moving, player) {
    const g = this.group;
    g.position.set(this.body.x, this.body.y, this.body.z);

    // 面向玩家
    const targetYaw = Math.atan2(player.body.x - this.body.x, player.body.z - this.body.z);
    let d = targetYaw - g.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    g.rotation.y += d * Math.min(1, dt * 8);

    // 走路摆动
    const speedNow = moving ? 1 : 0;
    this.walkAmt += (speedNow - this.walkAmt) * Math.min(1, dt * 8);
    this.phase += dt * (6.5 * this.walkAmt + 1.1);
    const sw = Math.sin(this.phase) * 0.62 * this.walkAmt;
    const armSwing = Math.sin(this.phase + Math.PI) * 0.5 * this.walkAmt;

    let armTarget = armSwing;
    let lean = 0;

    if (this.state === 'windup') {
      const t = Math.min(1, this.stateT / WINDUP);
      armTarget = -2.3 * ease(t);
      lean = -0.12 * ease(t);
    } else if (this.state === 'strike') {
      const t = Math.min(1, this.stateT / 0.22);
      armTarget = -2.3 + 3.1 * ease(t);
      lean = -0.12 + 0.34 * ease(t);
    } else if (this.state === 'stagger') {
      armTarget = -2.6;
      lean = -0.4;
    } else if (this.state === 'cooldown') {
      armTarget = armSwing * 0.4 + 0.5;
    }

    for (let i = 0; i < 2; i++) {
      const a = this.armPivots[i];
      a.rotation.x += (armTarget - a.rotation.x) * Math.min(1, dt * 14);
      a.rotation.z = (i === 0 ? 1 : -1) * 0.09;
      const l = this.legPivots[i];
      const legTarget = i === 0 ? sw : -sw;
      l.rotation.x += (legTarget - l.rotation.x) * Math.min(1, dt * 12);
    }

    this.torso.rotation.x = lean;
    this.torso.position.y = 1.08 + Math.sin(this.phase * 2) * 0.012;
    this.head.rotation.x = lean * 0.5;
    this.head.position.y = 1.63 + Math.sin(this.phase * 2) * 0.012;

    // 头始终面向相机（火柴人的圆头是「贴」在纸面上的）
    if (player.camera) {
      this.head.lookAt(player.camera.position.x, this.head.getWorldPosition(_tmpV).y, player.camera.position.z);
    }

    // 受击闪白（只换材质引用，不动共享材质本身）
    const on = this.flash > 0.02;
    if (this._flashState !== on) {
      this._flashState = on;
      this._applyFlash(on);
    }
  }

  _applyFlash(on) {
    const line = on ? inkLine(0xffffff, 0.95) : inkLine(RED, 0.95);
    const line2 = on ? inkLine(0xffffff, 0.5) : inkLine(RED, 0.32);
    this.group.traverse((o) => {
      if (!o.isLineSegments) return;
      o.material = o.parent && o.parent.userData.line2 === o ? line2 : line;
    });
  }

  _updateDeath(dt) {
    this.deathT += dt;
    const t = this.deathT;
    const g = this.group;
    g.position.set(this.body.x, this.body.y, this.body.z);
    // 向前扑倒
    const fall = Math.min(1, t / 0.42);
    g.rotation.x = -Math.PI / 2 * ease(fall);
    g.position.y = this.body.y + 0.05 * fall;
    // 收缩（不碰共享材质，只靠缩放和地面墨迹表达死亡）
    if (t > 0.9) {
      const k = Math.max(0, 1 - (t - 0.9) / 0.6);
      g.scale.setScalar(0.55 + k * 0.45);
    }
    if (t > 1.55) this.remove = true;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
}

const _tmpV = new THREE.Vector3();

function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export { EYE_H, HEIGHT as ENEMY_HEIGHT, RADIUS as ENEMY_RADIUS, ATTACK_RANGE };
