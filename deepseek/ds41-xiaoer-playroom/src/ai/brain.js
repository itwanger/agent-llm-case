import * as THREE from 'three';
import { ROOM, LAYOUT, CASTLE, TOY_INFO, slideCurvePoint, ladderPoint, groundHeight } from '../core/layout.js';
import { Tweens, lerp, clamp, damp, dampAngle, easeInOut, easeOut, easeIn, V3 } from '../core/tween.js';
import { Nav } from './nav.js';

const RADIUS = 0.17; // 小二的“身体半径”
const WALK_SPEED = 1.02;
const ROOM_LIMIT = ROOM.half - ROOM.wallT / 2 - RADIUS - 0.02;

/**
 * 小二的大脑：自主行动 + 点击引导 + 绕开家具。
 *
 * 状态机：
 *   idle  →  goto（沿路点走，遇到家具自动侧滑绕开）→  interact（每个玩具一套动作）→ idle
 */
export class Brain {
  constructor({ rig, animator, targets, obstacles, scene, onState }) {
    this.rig = rig;
    this.anim = animator;
    this.targets = targets;
    this.obstacles = obstacles;
    this.scene = scene;
    this.onState = onState || (() => {});

    this.tweens = new Tweens();
    // 网格寻路器（家具位置固定，只需建一次）
    this.nav = new Nav((x, z) => this.blocked(x, z));
    this.pos = new THREE.Vector3(LAYOUT.mat.x - 0.35, 0, 2.35);
    this.yaw = Math.PI; // 面朝房间里面（-z）
    this.mode = 'idle';
    this.idleTimer = 1.6;
    this.walkPhase = 0;
    this.lastToy = null;
    this.requested = null;
    this.queued = null;
    this.abort = null;
    this.task = null;
    this.path = [];
    this.pathIndex = 0;
    this.stuckTimer = 0;
    this.stuckAnchor = 0;
    this.violations = 0;
    this.violationLog = [];
    this.frameMoved = 0;
    this.targetY = 0;
    this.lastDt = 0.016;
    this.scripted = false; // 爬梯 / 滑梯时关闭碰撞
    this.blockStack = []; // 已经搭好的积木
    this.blockTimer = 0;
    this.blockIndex = 0;
    this.ballHeld = false;
    this.done = false;

    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
    this.setState('idle');
  }

  /* ================================================================ *
   * 对外接口
   * ================================================================ */

  /** 点击玩具 / 点按钮 */
  request(id) {
    if (!this.targets[id]) return;
    if (this.mode === 'interact' && this.task && this.task.id === id) return;
    if (this.scripted) {
      // 正在爬梯 / 下滑，等这一趟结束再响应
      this.queued = id;
      return;
    }
    if (this.mode === 'goto') {
      // 正在走 → 立刻改去新目标
      this.lastToy = id;
      this.startGoto(id);
      return;
    }
    if (this.mode === 'interact') {
      // 正在玩 → 玩完当前这一小段再走
      this.abort = id;
      return;
    }
    this.requested = id;
  }

  /** 中途放弃当前互动（皮球要放回地上） */
  abortCurrent() {
    if (this.ballHeld) {
      this.ballHeld = false;
      const ball = this.targets.ball.mesh;
      this.targets.ball.group.attach(ball);
      ball.position.set(0, 0.165, 0);
    }
    this.scripted = false;
    this.task = null;
  }

  /** 每帧更新 */
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.lastDt = dt;
    this.tweens.update(dt);

    switch (this.mode) {
      case 'goto':
        this.updateGoto(dt);
        break;
      case 'interact':
        this.updateInteract(dt);
        break;
      case 'idle':
      default:
        this.updateIdle(dt);
        break;
    }

    // 走路时的碰撞自检（正常情况下永远为 0）
    if (this.mode === 'goto' && this.blocked(this.pos.x, this.pos.z)) {
      this.violations++;
      if (this.violationLog.length < 12) {
        this.violationLog.push({ x: +this.pos.x.toFixed(3), z: +this.pos.z.toFixed(3), mode: this.mode });
      }
    }

    this.rig.root.position.x = this.pos.x;
    this.rig.root.position.z = this.pos.z;
    // 站在拼图垫上时整个人抬高一个垫子厚度
    const gy = groundHeight(this.pos.x, this.pos.z);
    this.rig.root.position.y = damp(this.rig.root.position.y, this.targetY + gy, 26, dt);
    this.rig.root.rotation.y = this.yaw;
    // 接触阴影始终贴在地面上，人升高时慢慢淡出
    const ry = this.rig.root.position.y;
    this.rig.shadow.position.y = gy + 0.008 - ry;
    this.rig.shadow.material.opacity = 0.42 * Math.max(0, 1 - Math.max(0, ry - gy) * 1.15);
    this.anim.update(dt);
  }

  /* ================================================================ *
   * 导航
   * ================================================================ */

  blocked(x, z) {
    if (Math.abs(x) > ROOM_LIMIT || Math.abs(z) > ROOM_LIMIT) return true;
    for (const o of this.obstacles) {
      if (o.type === 'circle') {
        const dx = x - o.x;
        const dz = z - o.z;
        const r = o.r + RADIUS;
        if (dx * dx + dz * dz < r * r) return true;
      } else {
        if (x > o.minX - RADIUS && x < o.maxX + RADIUS && z > o.minZ - RADIUS && z < o.maxZ + RADIUS) return true;
      }
    }
    return false;
  }

  /** 分轴滑动式移动：保证绝不穿过家具 */
  slideMove(dx, dz) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.045));
    const sx = dx / steps;
    const sz = dz / steps;
    let moved = 0;
    for (let i = 0; i < steps; i++) {
      const x0 = this.pos.x;
      const z0 = this.pos.z;
      if (!this.blocked(x0 + sx, z0 + sz)) {
        this.pos.x += sx;
        this.pos.z += sz;
      } else if (!this.blocked(x0 + sx, z0)) {
        this.pos.x += sx;
      } else if (!this.blocked(x0, z0 + sz)) {
        this.pos.z += sz;
      } else {
        break;
      }
      moved += Math.hypot(this.pos.x - x0, this.pos.z - z0);
    }
    return moved;
  }

  startGoto(id) {
    const target = this.targets[id];
    if (!target) return;
    this.goalId = id;
    this.requested = null;
    this.mode = 'goto';
    this.task = null;
    this.abort = null;
    this.scripted = false;
    this.targetY = 0;

    const spot = target.spot;
    this.path = this.nav.findPath(this.pos, { x: spot.x, z: spot.z });
    if (!this.path.length) this.path = [{ x: spot.x, z: spot.z }];
    this.pathIndex = 0;
    this.stuckTimer = 0;
    this.stuckAnchor = 0;
    this.walkPhase = 0;
    this.setState('walk', `小二正走向${target.label}…`);
  }

  updateGoto(dt) {
    const target = this.targets[this.goalId];
    if (!target) return this.setState('idle', '小二正在房间里东张西望…');

    const goal = this.path[this.pathIndex];
    if (!goal) return this.arrive();

    const dx = goal.x - this.pos.x;
    const dz = goal.z - this.pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.11) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) return this.arrive();
      return;
    }

    const wantYaw = Math.atan2(dx, dz);
    this.yaw = dampAngle(this.yaw, wantYaw, 9, dt);

    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const moved = this.slideMove(fx * WALK_SPEED * dt, fz * WALK_SPEED * dt);

    this.walkPhase += moved * 9.2;
    this.anim.play('walk', { phase: this.walkPhase });

    // 卡住检测：重新用 A* 规划一次
    if (moved < WALK_SPEED * dt * 0.35) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 0.8) {
        this.stuckTimer = 0;
        const goal = this.path[this.path.length - 1];
        const replanned = this.nav.findPath(this.pos, goal);
        if (replanned.length) {
          this.path = replanned;
          this.pathIndex = 0;
        }
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  arrive() {
    const target = this.targets[this.goalId];
    const fdx = target.face.x - this.pos.x;
    const fdz = target.face.z - this.pos.z;
    this.yaw = Math.atan2(fdx, fdz);
    this.mode = 'interact';
    this.task = { id: this.goalId, phase: 'enter', timer: 0, t: 0 };
    this.startInteraction(this.goalId);
  }

  /* ================================================================ *
   * 待机 / 自主行动
   * ================================================================ */

  updateIdle(dt) {
    this.anim.play('idle');
    if (this.requested) {
      const id = this.requested;
      this.requested = null;
      this.lastToy = id;
      return this.startGoto(id);
    }
    if (this.queued) {
      const id = this.queued;
      this.queued = null;
      this.lastToy = id;
      return this.startGoto(id);
    }

    this.idleTimer -= dt;
    if (this.idleTimer <= 0) {
      const ids = Object.keys(this.targets).filter((k) => k !== this.lastToy);
      const id = ids[Math.floor(Math.random() * ids.length)];
      this.lastToy = id;
      this.startGoto(id);
    }
  }

  /* ================================================================ *
   * 互动分发
   * ================================================================ */

  startInteraction(id) {
    this.blockTimer = 0;
    switch (id) {
      case 'blocks':
        this.beginBlocks();
        break;
      case 'car':
        this.beginCar();
        break;
      case 'ball':
        this.beginBall();
        break;
      case 'slide':
        this.beginSlide();
        break;
      default:
        this.finishInteraction();
    }
  }

  finishInteraction(label) {
    this.scripted = false;
    this.mode = 'idle';
    this.task = null;
    this.abort = null;
    this.targetY = 0;
    this.idleTimer = 1.3 + Math.random() * 1.6;
    this.anim.play('idle');
    this.setState('idle', label || '小二心满意足地站着…');
    if (this.queued) {
      const id = this.queued;
      this.queued = null;
      this.requested = id;
    }
  }

  setState(mode, text) {
    this.modeName = mode;
    if (text) this.onState(text, mode !== 'idle');
  }

  /* ================================================================ *
   * 玩具 1：坐下搭积木
   * ================================================================ */

  beginBlocks() {
    const target = this.targets.blocks;
    this.setState('blocks', '小二坐下来搭积木啦');
    this.anim.play('sitBuild');

    // 积木堆的位置：在身前 0.42m
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    this.stackBase = new THREE.Vector3(this.pos.x + fx * 0.44, 0, this.pos.z + fz * 0.44);

    // 剩下的积木不够搭就先把它们散回去
    const pieces = target.pieces.filter((p) => !p.userData.stacked);
    if (pieces.length < 5) {
      target.pieces.forEach((p) => {
        p.userData.stacked = false;
        this.tweens.add({
          from: p.position,
          to: p.userData.home,
          dur: 0.6,
          arc: 0.35,
          onUpdate: (v) => p.position.copy(v),
          onDone: () => {
            p.rotation.copy(p.userData.homeRot);
          },
        });
      });
      this.blockReset = 0.7;
    } else {
      this.blockReset = 0;
    }
    this.stackHeight = 0;
    this.blockIndex = 0;
  }

  updateBlocks(dt) {
    const target = this.targets.blocks;
    const task = this.task;

    if (this.blockReset > 0) {
      this.blockReset -= dt;
      return;
    }

    this.blockTimer -= dt;
    if (this.blockTimer <= 0) {
      if (task.phase === 'stand') return; // 已经在站起来了，别重复触发
      const next = target.pieces.find((p) => !p.userData.stacked);
      if (next && this.blockIndex < 9) {
        this.blockTimer = 0.72;
        this.blockIndex++;
        const size = next.userData.size;
        const y = groundHeight(this.stackBase.x, this.stackBase.z) + this.stackHeight + size / 2;
        const wob = (Math.random() - 0.5) * 0.035;
        const to = V3(this.stackBase.x + wob, y, this.stackBase.z + wob);
        next.userData.stacked = true;
        this.stackHeight += size * 0.94;

        this.tweens.add({
          from: next.position,
          to,
          dur: 0.46,
          arc: 0.4 + Math.random() * 0.18,
          ease: easeInOut,
          onUpdate: (v) => next.position.copy(v),
          onDone: () => {
            next.rotation.y = Math.random() * Math.PI;
          },
        });
      } else {
        // 搭完了 → 站起来
        task.phase = 'stand';
        this.anim.play('getUp', { progress: 0 });
        this.tweens.add({
          from: V3(0, 0, 0),
          to: V3(0, 1, 0),
          dur: 0.85,
          ease: easeOut,
          onUpdate: (v) => this.anim.play('getUp', { progress: v.y }),
          onDone: () => this.finishInteraction('小二搭好了一座积木塔！'),
        });
      }
    }
  }

  /* ================================================================ *
   * 玩具 2：蹲着推小车
   * ================================================================ */

  beginCar() {
    const car = this.targets.car.group;
    this.setState('car', '小二蹲下来推小车');

    // 小车先转向，让小二的“前方”就是车头方向
    const start = car.position.clone();
    const yaw0 = car.rotation.y;
    const yaw1 = this.yaw;
    this.tweens.add({
      from: V3(yaw0, 0, 0),
      to: V3(yaw1, 0, 0),
      dur: 0.45,
      onUpdate: (v) => {
        car.rotation.y = v.x;
      },
    });

    // 一条绕回来的一小圈路径
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const curve = new THREE.CatmullRomCurve3([
      start.clone(),
      V3(start.x + fx * 0.75, 0, start.z + fz * 0.75),
      V3(start.x + fx * 1.5 + rx * 0.15, 0, start.z + fz * 1.5 + rz * 0.15),
      V3(start.x + fx * 1.85 + rx * 1.05, 0, start.z + fz * 1.85 + rz * 1.05),
      V3(start.x + fx * 0.85 + rx * 1.15, 0, start.z + fz * 0.85 + rz * 1.15),
      V3(start.x + rx * 0.35, 0, start.z + rz * 0.35),
      start.clone(),
    ]);
    this.carCurve = curve;
    this.carStart = start.clone();
    this.carDur = 7.2;
    this.carT = 0;
    this.task.phase = 'push';

    // 小二的站位：车后面
    this.anim.play('squatPush');
    this.followCar(0);
  }

  followCar(u) {
    const car = this.targets.car.group;
    const p = this.carCurve.getPointAt(clamp(u, 0, 1));
    const tan = this.carCurve.getTangentAt(clamp(u, 0, 1));
    car.position.set(p.x, 0, p.z);
    car.rotation.y = Math.atan2(tan.x, tan.z);

    // 站在车后面推，距离要大于车的碰撞半径
    let back = 0.52;
    let bx = p.x - tan.x * back;
    let bz = p.z - tan.z * back;
    while (this.blocked(bx, bz) && back < 0.95) {
      back += 0.12;
      bx = p.x - tan.x * back;
      bz = p.z - tan.z * back;
    }
    if (!this.blocked(bx, bz)) {
      this.pos.x = bx;
      this.pos.z = bz;
    }
    this.yaw = dampAngle(this.yaw, Math.atan2(tan.x, tan.z), 10, this.lastDt);
  }

  updateCar(dt) {
    this.carT += dt;
    const u = clamp(this.carT / this.carDur, 0, 1);
    this.followCar(easeInOut(u));
    this.anim.play('squatPush');
    if (u >= 1 && this.task.phase !== 'done') {
      this.task.phase = 'done';
      const car = this.targets.car.group;
      car.position.set(this.carStart.x, 0, this.carStart.z);
      this.anim.play('getUp', { progress: 0 });
      this.tweens.add({
        from: V3(0, 0, 0),
        to: V3(0, 1, 0),
        dur: 0.8,
        ease: easeOut,
        onUpdate: (v) => this.anim.play('getUp', { progress: v.y }),
        onDone: () => this.finishInteraction('小车兜了一圈，回到原位啦'),
      });
    }
  }

  /* ================================================================ *
   * 玩具 3：抱起皮球
   * ================================================================ */

  beginBall() {
    const ball = this.targets.ball.mesh;
    this.setState('ball', '小二把皮球抱了起来');
    this.anim.play('hugBall');

    // 把球挂到躯干上（保留世界变换），再飞进怀里
    this.rig.torso.attach(ball);
    const from = ball.position.clone();
    this.tweens.add({
      from,
      to: V3(0, 0.13, 0.2),
      dur: 0.55,
      arc: 0.25,
      ease: easeOut,
      onUpdate: (v) => ball.position.copy(v),
    });

    this.ballHold = 3.4;
    this.ballHeld = true;
  }

  updateBall(dt) {
    this.ballHold -= dt;
    this.anim.play('hugBall');
    if (this.ballHeld && this.ballHold <= 0) {
      const ball = this.targets.ball.mesh;
      const from = ball.position.clone();
      this.ballHeld = false;
      this.anim.play('idle');
      this.tweens.add({
        from,
        to: V3(0, -0.35, 0.34),
        dur: 0.4,
        onUpdate: (v) => ball.position.copy(v),
        onDone: () => {
          // 放回地上（挂回玩具组里，保证还能被点击）
          const grp = this.targets.ball.group;
          grp.attach(ball);
          const p = ball.position.clone();
          this.tweens.add({
            from: p,
            to: V3(0, 0.165, 0),
            dur: 0.5,
            arc: 0.2,
            ease: easeOut,
            onUpdate: (v) => ball.position.copy(v),
            onDone: () => this.finishInteraction('小二把皮球放回了地上'),
          });
        },
      });
    }
  }

  /* ================================================================ *
   * 玩具 4：爬上城堡滑梯再滑下来
   * ================================================================ */

  beginSlide() {
    this.scripted = true;
    this.setState('slide', '小二正在爬城堡滑梯…');
    this.task = { id: 'slide', phase: 'climb', t: 0 };
    this.anim.play('climb', { progress: 0 });
    // 站在梯子前，面朝 +z（城堡）
    this.yaw = 0;
    this.pos.x = CASTLE.x;
    this.pos.z = CASTLE.ladderZ - 0.5;
    this.targetY = 0;
  }

  updateSlide(dt) {
    const task = this.task;
    const T = task.t;

    if (task.phase === 'climb') {
      const dur = 2.3;
      const k = clamp(T / dur, 0, 1);
      const p = ladderPoint(k);
      this.pos.x = p.x;
      this.pos.z = p.z;
      this.targetY = p.y;
      this.yaw = 0;
      this.anim.play('climb', { progress: k });
      if (k >= 1) {
        task.phase = 'platform';
        task.t = 0;
        this.anim.play('walk', { phase: 0 });
        this.setState('slide', '小二爬到城堡顶上了，准备滑下来！');
      }
      return;
    }

    if (task.phase === 'platform') {
      const dur = 0.9;
      const k = clamp(T / dur, 0, 1);
      const z0 = CASTLE.ladderTopZ;
      const z1 = CASTLE.slideTopZ;
      this.pos.x = CASTLE.x;
      this.pos.z = lerp(z0, z1, easeInOut(k));
      this.targetY = CASTLE.platformY;
      this.yaw = 0;
      this.anim.play('walk', { phase: k * 5.5 });
      if (k >= 1) {
        task.phase = 'sit';
        task.t = 0;
        this.anim.play('slide', { progress: 0 });
        this.setState('slide', '小二坐好了，要滑下来咯——');
      }
      return;
    }

    if (task.phase === 'sit') {
      if (T > 0.32) {
        task.phase = 'slideDown';
        task.t = 0;
      }
      return;
    }

    if (task.phase === 'slideDown') {
      const dur = 1.45;
      const k = clamp(T / dur, 0, 1);
      const e = easeIn(k); // 越滑越快
      const p = slideCurvePoint(e);
      this.pos.x = p.x;
      this.pos.z = p.z;
      this.targetY = Math.max(0, p.y - 0.08);
      this.yaw = 0;
      this.anim.play('slide', { progress: e });
      if (k >= 1) {
        task.phase = 'land';
        task.t = 0;
        this.anim.play('getUp', { progress: 0 });
        this.targetY = 0;
        this.setState('slide', '呼——小二滑到底啦！');
      }
      return;
    }

    if (task.phase === 'land') {
      const dur = 1.0;
      const k = clamp(T / dur, 0, 1);
      this.anim.play('getUp', { progress: k });
      // 一边站起来一边往前走两步，离开滑梯底部的占位区
      this.pos.x = CASTLE.x;
      this.pos.z = lerp(CASTLE.slideBottomZ, CASTLE.slideBottomZ + 0.78, easeInOut(k));
      this.targetY = 0;
      if (k >= 1) {
        this.scripted = false;
        this.finishInteraction('小二滑下来啦，还想再玩一次！');
      }
    }
  }

  /* ================================================================ *
   * 互动主循环
   * ================================================================ */

  updateInteract(dt) {
    if (!this.task) return this.finishInteraction();
    this.task.t += dt;
    if (this.abort && this.task.t > 0.7) {
      const id = this.abort;
      this.abort = null;
      this.abortCurrent();
      this.lastToy = id;
      return this.startGoto(id);
    }
    switch (this.task.id) {
      case 'blocks':
        this.updateBlocks(dt);
        break;
      case 'car':
        this.updateCar(dt);
        break;
      case 'ball':
        this.updateBall(dt);
        break;
      case 'slide':
        this.updateSlide(dt);
        break;
      default:
        this.finishInteraction();
    }
  }

  /* ================================================================ *
   * 调试信息
   * ================================================================ */

  debug() {
    return {
      mode: this.mode,
      stateName: this.modeName,
      action: this.task ? this.task.id : null,
      phase: this.task ? this.task.phase : null,
      pos: { x: +this.pos.x.toFixed(3), z: +this.pos.z.toFixed(3), y: +this.rig.root.position.y.toFixed(3) },
      yaw: +this.yaw.toFixed(3),
      violations: this.violations,
      violationLog: this.violationLog,
      scripted: this.scripted,
      ballHeld: this.ballHeld,
      stacked: this.targets.blocks.pieces.filter((p) => p.userData.stacked).length,
    };
  }
}
