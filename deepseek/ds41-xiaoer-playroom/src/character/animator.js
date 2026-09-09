import { lerp, clamp } from '../core/tween.js';

/**
 * 小二的姿势动画器。
 * 每个状态产出一组「姿势目标值」，再用指数平滑过渡到骨骼上，
 * 所以状态切换永远是柔和的，不会瞬移。
 */

const HIP_Y = 0.352;

function neutral() {
  return {
    bodyY: 0,
    bodyRX: 0,
    bodyRY: 0,
    bodyRZ: 0,
    hipsY: HIP_Y,
    hipsRX: 0,
    hipsRY: 0,
    hipsRZ: 0,
    torsoRX: 0,
    torsoRY: 0,
    torsoRZ: 0,
    headRX: 0,
    headRY: 0,
    headRZ: 0,
    shLX: 0,
    shLY: 0,
    shLZ: 0.12,
    elLX: 0,
    elLZ: 0,
    shRX: 0,
    shRY: 0,
    shRZ: -0.12,
    elRX: 0,
    elRZ: 0,
    legLX: 0,
    legLY: 0,
    legLZ: 0.07,
    kneeLX: 0,
    kneeLZ: 0,
    ankLX: 0,
    legRX: 0,
    legRY: 0,
    legRZ: -0.07,
    kneeRX: 0,
    kneeRZ: 0,
    ankRX: 0,
  };
}

export class Animator {
  constructor(rig) {
    this.rig = rig;
    this.state = 'idle';
    this.t = 0;
    this.params = {};
    this.blendRate = 16;
    this.blinkTimer = 2.5;
    this.blinkPhase = 99;
    this.phase = 0; // 走路相位
    this.pose = neutral();
    this.applyPose(this.pose, 1);
  }

  play(state, params = {}) {
    if (this.state !== state) {
      this.state = state;
      this.t = 0;
      this.blendRate = state === 'walk' ? 26 : 14;
    }
    this.params = params;
  }

  is(state) {
    return this.state === state;
  }

  update(dt) {
    this.t += dt;
    const p = this.buildPose();
    this.applyPose(p, dt);
    this.updateBlink(dt);
  }

  /* ------------------------------------------------------------ *
   * 各状态的姿势
   * ------------------------------------------------------------ */

  buildPose() {
    const p = neutral();
    const t = this.t;
    const P = this.params;

    switch (this.state) {
      case 'walk':
        this.poseWalk(p, t, P);
        break;
      case 'sitBuild':
        this.poseSit(p, t);
        break;
      case 'squatPush':
        this.poseSquat(p, t);
        break;
      case 'hugBall':
        this.poseHug(p, t);
        break;
      case 'climb':
        this.poseClimb(p, P.progress || 0);
        break;
      case 'slide':
        this.poseSlide(p, t, P.progress || 0);
        break;
      case 'getUp':
        this.poseGetUp(p, clamp(P.progress || 0, 0, 1));
        break;
      case 'cheer':
        this.poseCheer(p, t);
        break;
      case 'idle':
      default:
        this.poseIdle(p, t);
        break;
    }
    return p;
  }

  poseIdle(p, t) {
    p.bodyY = Math.sin(t * 1.9) * 0.007;
    p.torsoRX = 0.02 + Math.sin(t * 1.9) * 0.02;
    p.torsoRZ = Math.sin(t * 0.7) * 0.02;
    p.headRX = Math.sin(t * 0.85) * 0.05;
    p.headRY = Math.sin(t * 0.55) * 0.3 + Math.sin(t * 1.4) * 0.06;
    p.headRZ = Math.sin(t * 0.42) * 0.07;
    p.shLX = Math.sin(t * 1.9) * 0.07;
    p.shRX = -Math.sin(t * 1.9) * 0.07;
    p.elLX = 0.12 + Math.sin(t * 1.9 + 0.6) * 0.05;
    p.elRX = 0.12 - Math.sin(t * 1.9 + 0.6) * 0.05;
    p.hipsRZ = Math.sin(t * 0.7) * 0.015;
  }

  poseWalk(p, t, P) {
    const ph = P.phase || 0;
    const s = Math.sin(ph);
    const c = Math.cos(ph);

    p.bodyY = Math.abs(Math.sin(ph)) * 0.022;
    p.bodyRZ = Math.sin(ph) * 0.045;
    p.hipsRY = Math.sin(ph) * 0.1;
    p.hipsRZ = Math.sin(ph) * 0.05;
    p.torsoRX = 0.08;
    p.torsoRY = -Math.sin(ph) * 0.07;
    p.torsoRZ = -Math.sin(ph) * 0.03;
    p.headRX = -0.05;
    p.headRY = Math.sin(ph * 0.5) * 0.1;

    // 腿
    p.legLX = 0.52 * s;
    p.legLZ = 0.07 + Math.max(0, s) * 0.05;
    p.kneeLX = -0.28 - 0.55 * Math.max(0, Math.sin(ph + 1.1));
    p.ankLX = 0.16 - 0.28 * s;

    p.legRX = -0.52 * s;
    p.legRZ = -0.07 - Math.max(0, -s) * 0.05;
    p.kneeRX = -0.28 - 0.55 * Math.max(0, Math.sin(ph + Math.PI + 1.1));
    p.ankRX = 0.16 + 0.28 * s;

    // 手臂反向摆
    p.shLX = -0.42 * s;
    p.shRX = 0.42 * s;
    p.elLX = 0.32 + 0.18 * Math.max(0, -s);
    p.elRX = 0.32 + 0.18 * Math.max(0, s);
  }

  poseSit(p, t) {
    const swing = Math.sin(t * 3.1);
    p.hipsY = 0.138;
    p.hipsRX = -0.14;
    p.torsoRX = 0.2;
    p.headRX = 0.26;
    p.headRY = Math.sin(t * 0.9) * 0.12;

    // 腿向前伸，微微外八
    p.legLX = 1.42;
    p.legLZ = 0.26;
    p.kneeLX = -0.52;
    p.kneeLZ = -0.12;
    p.ankLX = 0.34;

    p.legRX = 1.42;
    p.legRZ = -0.26;
    p.kneeRX = -0.52;
    p.kneeRZ = 0.12;
    p.ankRX = 0.34;

    // 两只手在身前搭积木
    p.shLX = 0.95 + swing * 0.3;
    p.shLZ = 0.3 - swing * 0.06;
    p.elLX = -0.62 + swing * 0.42;
    p.elLZ = -0.12;

    p.shRX = 0.95 - swing * 0.3;
    p.shRZ = -0.3 + swing * 0.06;
    p.elRX = -0.62 - swing * 0.42;
    p.elRZ = 0.12;

    p.bodyY = 0.004 * Math.sin(t * 3.1);
  }

  poseSquat(p, t) {
    const ph = t * 5.2;
    p.hipsY = 0.205;
    p.hipsRX = 0.12;
    p.torsoRX = 0.52;
    p.headRX = -0.3;
    p.headRY = Math.sin(t * 1.6) * 0.08;
    p.bodyY = Math.abs(Math.sin(ph)) * 0.016;
    p.bodyRZ = Math.sin(ph) * 0.035;

    p.legLX = 0.95;
    p.legLZ = 0.22;
    p.kneeLX = -1.35;
    p.kneeLZ = -0.1;
    p.ankLX = 0.52;

    p.legRX = 0.95;
    p.legRZ = -0.22;
    p.kneeRX = -1.35;
    p.kneeRZ = 0.1;
    p.ankRX = 0.52;

    // 双手扶着车尾
    p.shLX = 1.02 + Math.sin(ph) * 0.07;
    p.shLZ = 0.2;
    p.elLX = -0.2;
    p.shRX = 1.02 - Math.sin(ph) * 0.07;
    p.shRZ = -0.2;
    p.elRX = -0.2;
  }

  poseHug(p, t) {
    const rock = Math.sin(t * 2.1);
    p.hipsY = HIP_Y;
    p.torsoRX = -0.05;
    p.bodyRZ = rock * 0.05;
    p.headRX = 0.1;
    p.headRZ = rock * 0.1;
    p.headRY = rock * 0.06;

    // 双手把球抱在胸前
    p.shLX = 0.55;
    p.shLZ = -0.72;
    p.elLX = 1.42;
    p.elLZ = -0.3;

    p.shRX = 0.55;
    p.shRZ = 0.72;
    p.elRX = 1.42;
    p.elRZ = 0.3;

    p.bodyY = 0.004 * Math.sin(t * 2.1);
  }

  poseClimb(p, progress) {
    const ph = progress * Math.PI * 6;
    p.torsoRX = 0.22;
    p.headRX = -0.2;
    p.bodyY = Math.abs(Math.sin(ph)) * 0.012;

    // 手脚交替
    p.shLX = 2.05 + 0.42 * Math.sin(ph);
    p.shLZ = 0.16;
    p.elLX = -0.55;

    p.shRX = 2.05 + 0.42 * Math.sin(ph + Math.PI);
    p.shRZ = -0.16;
    p.elRX = -0.55;

    p.legLX = 0.72 + 0.38 * Math.sin(ph + Math.PI);
    p.legLZ = 0.16;
    p.kneeLX = -1.05 - 0.25 * Math.sin(ph + Math.PI);
    p.ankLX = 0.35;

    p.legRX = 0.72 + 0.38 * Math.sin(ph);
    p.legRZ = -0.16;
    p.kneeRX = -1.05 - 0.25 * Math.sin(ph);
    p.ankRX = 0.35;
  }

  poseSlide(p, t, progress) {
    const wob = Math.sin(t * 9) * 0.05;
    p.hipsY = 0.145;
    p.hipsRX = -0.2;
    p.bodyRX = -0.34 - progress * 0.1;
    p.torsoRX = 0.16;
    p.headRX = -0.12 + wob * 0.4;
    p.headRZ = wob;

    // 腿伸直朝前
    p.legLX = 1.28;
    p.legLZ = 0.2;
    p.kneeLX = -0.45;
    p.ankLX = 0.4;

    p.legRX = 1.28;
    p.legRZ = -0.2;
    p.kneeRX = -0.45;
    p.ankRX = 0.4;

    // 双手举高高
    p.shLX = 2.25 + wob * 0.3;
    p.shLZ = 0.22;
    p.elLX = -0.25;
    p.shRX = 2.25 - wob * 0.3;
    p.shRZ = -0.22;
    p.elRX = -0.25;
  }

  poseGetUp(p, k) {
    const e = k * k * (3 - 2 * k);
    p.hipsY = lerp(0.2, HIP_Y, e);
    p.hipsRX = lerp(0.1, 0, e);
    p.torsoRX = lerp(0.45, 0.02, e);
    p.headRX = lerp(-0.1, 0, e);

    p.legLX = lerp(0.9, 0, e);
    p.legLZ = lerp(0.22, 0.07, e);
    p.kneeLX = lerp(-1.25, 0, e);
    p.ankLX = lerp(0.5, 0, e);

    p.legRX = lerp(0.9, 0, e);
    p.legRZ = lerp(-0.22, -0.07, e);
    p.kneeRX = lerp(-1.25, 0, e);
    p.ankRX = lerp(0.5, 0, e);

    p.shLX = lerp(0.7, 0, e);
    p.shRX = lerp(0.7, 0, e);
    p.elLX = lerp(-0.4, 0.12, e);
    p.elRX = lerp(-0.4, 0.12, e);
    p.bodyY = Math.sin(e * Math.PI) * 0.03;
  }

  poseCheer(p, t) {
    const b = Math.sin(t * 8) * 0.5 + 0.5;
    p.bodyY = b * 0.03;
    p.torsoRX = -0.06;
    p.headRX = -0.12;
    p.shLX = 2.4 + b * 0.2;
    p.shLZ = 0.3;
    p.elLX = -0.35;
    p.shRX = 2.4 + b * 0.2;
    p.shRZ = -0.3;
    p.elRX = -0.35;
    p.legLX = 0.1;
    p.legRX = 0.1;
  }

  /* ------------------------------------------------------------ *
   * 应用到骨骼
   * ------------------------------------------------------------ */

  applyPose(p, dt) {
    const r = this.rig;
    const k = 1 - Math.exp(-this.blendRate * dt);
    const L = (cur, target) => lerp(cur, target, k);

    r.body.position.y = L(r.body.position.y, p.bodyY);
    r.body.rotation.x = L(r.body.rotation.x, p.bodyRX);
    r.body.rotation.y = L(r.body.rotation.y, p.bodyRY);
    r.body.rotation.z = L(r.body.rotation.z, p.bodyRZ);

    r.hips.position.y = L(r.hips.position.y, p.hipsY);
    r.hips.rotation.x = L(r.hips.rotation.x, p.hipsRX);
    r.hips.rotation.y = L(r.hips.rotation.y, p.hipsRY);
    r.hips.rotation.z = L(r.hips.rotation.z, p.hipsRZ);

    r.torso.rotation.x = L(r.torso.rotation.x, p.torsoRX);
    r.torso.rotation.y = L(r.torso.rotation.y, p.torsoRY);
    r.torso.rotation.z = L(r.torso.rotation.z, p.torsoRZ);

    r.head.rotation.x = L(r.head.rotation.x, p.headRX);
    r.head.rotation.y = L(r.head.rotation.y, p.headRY);
    r.head.rotation.z = L(r.head.rotation.z, p.headRZ);

    const setArm = (arm, x, y, z, ex, ez) => {
      arm.shoulder.rotation.x = L(arm.shoulder.rotation.x, x);
      arm.shoulder.rotation.y = L(arm.shoulder.rotation.y, y);
      arm.shoulder.rotation.z = L(arm.shoulder.rotation.z, z);
      arm.elbow.rotation.x = L(arm.elbow.rotation.x, ex);
      arm.elbow.rotation.z = L(arm.elbow.rotation.z, ez);
    };
    setArm(r.arms.L, p.shLX, p.shLY, p.shLZ, p.elLX, p.elLZ);
    setArm(r.arms.R, p.shRX, p.shRY, p.shRZ, p.elRX, p.elRZ);

    const setLeg = (leg, x, y, z, kx, kz, ax) => {
      leg.hip.rotation.x = L(leg.hip.rotation.x, x);
      leg.hip.rotation.y = L(leg.hip.rotation.y, y);
      leg.hip.rotation.z = L(leg.hip.rotation.z, z);
      leg.knee.rotation.x = L(leg.knee.rotation.x, kx);
      leg.knee.rotation.z = L(leg.knee.rotation.z, kz);
      leg.ankle.rotation.x = L(leg.ankle.rotation.x, ax);
    };
    setLeg(r.legs.L, p.legLX, p.legLY, p.legLZ, p.kneeLX, p.kneeLZ, p.ankLX);
    setLeg(r.legs.R, p.legRX, p.legRY, p.legRZ, p.kneeRX, p.kneeRZ, p.ankRX);
  }

  /* ------------------------------------------------------------ *
   * 眨眼
   * ------------------------------------------------------------ */

  updateBlink(dt) {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.4 + Math.random() * 3.4;
      this.blinkPhase = 0;
    }
    let b = 0;
    if (this.blinkPhase < 0.16) {
      this.blinkPhase += dt;
      b = Math.sin((this.blinkPhase / 0.16) * Math.PI);
    }
    const scale = 1 - b * 0.92;
    this.rig.eyes.forEach((e) => {
      e.scale.y = scale;
    });
  }
}
