import * as THREE from 'three';
import { doodle, rayBox, INK, PAPER } from '../core/doodle.js';
import { sfx } from '../core/audio.js';

/**
 * 三把武器，手感刻意拉开：
 *  1. 圆珠笔步枪 —— 连发、精准、每发一颗子弹，后坐力小，弹道线细
 *  2. 马克笔霰弹枪 —— 一次 9 颗弹丸、扩散大、后坐力猛、屏幕抖、换弹慢
 *  3. 红笔武士刀 —— 无弹药、挥砍范围扇形、一刀 62 伤害、移速加成、命中「唰」的一声
 */

const UP = new THREE.Vector3(0, 1, 0);

export const WEAPON_DEFS = [
  {
    id: 'rifle',
    name: '圆珠笔步枪',
    short: '步枪',
    hint: '左键连射 · R 换弹 · 精准',
    magSize: 30,
    reserve: 150,
    maxReserve: 150,
    fireRate: 0.105,
    reloadTime: 1.55,
    damage: 26,
    pellets: 1,
    spread: 0.0055,
    range: 95,
    recoil: { pitch: 0.012, yaw: 0.005, shake: 0.13, kick: 1 },
    auto: true,
    moveMult: 1,
    tracer: 0x2f4f9e,
  },
  {
    id: 'shotgun',
    name: '马克笔霰弹枪',
    short: '霰弹',
    hint: '左键轰击 · R 换弹 · 近距离一击',
    magSize: 6,
    reserve: 42,
    maxReserve: 42,
    fireRate: 0.82,
    reloadTime: 2.6,
    damage: 8.5,
    pellets: 9,
    spread: 0.115,
    range: 26,
    recoil: { pitch: 0.062, yaw: 0.012, shake: 0.85, kick: 2.1 },
    auto: false,
    moveMult: 0.94,
    tracer: 0x24408e,
  },
  {
    id: 'katana',
    name: '红笔武士刀',
    short: '武士刀',
    hint: '左键挥砍 · 无弹药 · 范围大伤害高',
    magSize: 0,
    reserve: 0,
    maxReserve: 0,
    fireRate: 0.44,
    reloadTime: 0,
    damage: 62,
    pellets: 0,
    spread: 0,
    range: 3.1,
    recoil: { pitch: 0.004, yaw: 0, shake: 0.18, kick: 0.6 },
    auto: true,
    moveMult: 1.18,
    tracer: 0,
    melee: true,
    arcCos: Math.cos((72 * Math.PI) / 180),
  },
];

// ------------------------------------------------------------------ 建模

function part(geo, opts = {}) {
  return doodle(geo, {
    fillColor: PAPER,
    fillHatch: 1,
    ink: INK,
    jitter: 0.006,
    doubleStroke: true,
    ...opts,
  });
}

/** 圆珠笔步枪：细长笔身 + 笔夹 + 锥形笔尖，一眼能认出是支笔 */
function buildRifle() {
  const g = new THREE.Group();
  // 笔身（圆柱，细长）
  const barrel = part(new THREE.CylinderGeometry(0.017, 0.017, 0.42, 10), { fillColor: 0xf8f4e8, threshold: 30 });
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.006, -0.32);
  g.add(barrel);
  // 笔尖
  const tip = part(new THREE.CylinderGeometry(0.007, 0.02, 0.09, 10), { fillColor: 0xe6dcc4, threshold: 30 });
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0, 0.006, -0.575);
  g.add(tip);
  // 笔尖上的一点墨
  const nib = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0045, 0.0045, 0.025, 8),
    new THREE.MeshBasicMaterial({ color: 0x24408e }),
  );
  nib.rotation.x = Math.PI / 2;
  nib.position.set(0, 0.006, -0.632);
  g.add(nib);
  // 握笔的粗杆
  const body = part(new THREE.BoxGeometry(0.062, 0.078, 0.3), { fillColor: 0xf2ecdc });
  body.position.set(0, 0, -0.02);
  g.add(body);
  // 笔夹（很显眼的识别特征）
  const clip = part(new THREE.BoxGeometry(0.013, 0.019, 0.14), { fillColor: 0xe8eef8 });
  clip.position.set(0.038, 0.056, -0.06);
  g.add(clip);
  // 弹匣（用偏深的纸色，避免看起来像一根悬空的蓝棒）
  const mag = part(new THREE.BoxGeometry(0.045, 0.17, 0.078), { fillColor: 0xe6dcc4 });
  mag.position.set(0, -0.13, -0.05);
  mag.rotation.x = -0.1;
  g.add(mag);
  // 握把
  const grip = part(new THREE.BoxGeometry(0.048, 0.14, 0.062), { fillColor: 0xf2ecdc });
  grip.position.set(0, -0.095, 0.06);
  grip.rotation.x = 0.28;
  g.add(grip);
  // 手
  const hand = part(new THREE.BoxGeometry(0.095, 0.085, 0.12), { fillColor: 0xf7ead9 });
  hand.position.set(0, -0.062, 0.075);
  g.add(hand);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.006, -0.66);
  g.add(muzzle);
  return { group: g, muzzle };
}

/** 马克笔霰弹枪：又短又粗，笔帽当枪口，体积感明显大于步枪 */
function buildShotgun() {
  const g = new THREE.Group();
  const body = part(new THREE.BoxGeometry(0.115, 0.135, 0.26), { fillColor: 0xe8eef8 });
  body.position.set(0, 0, -0.02);
  g.add(body);
  // 粗笔身
  const barrel = part(new THREE.CylinderGeometry(0.037, 0.037, 0.34, 12), { fillColor: 0xf8f4e8, threshold: 30 });
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.022, -0.3);
  g.add(barrel);
  // 笔帽（粗一圈，最显眼）
  const cap = part(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 12), { fillColor: 0xd8e2f2, threshold: 30 });
  cap.rotation.x = Math.PI / 2;
  cap.position.set(0, 0.022, -0.51);
  g.add(cap);
  // 泵柄
  const pump = part(new THREE.BoxGeometry(0.145, 0.11, 0.16), { fillColor: 0xe0d6bd });
  pump.position.set(0, -0.072, -0.23);
  g.add(pump);
  // 枪托
  const stock = part(new THREE.BoxGeometry(0.088, 0.145, 0.24), { fillColor: 0xf2ecdc });
  stock.position.set(0, -0.03, 0.2);
  stock.rotation.x = 0.1;
  g.add(stock);
  const grip = part(new THREE.BoxGeometry(0.058, 0.14, 0.08), { fillColor: 0xf2ecdc });
  grip.position.set(0, -0.115, 0.04);
  grip.rotation.x = 0.22;
  g.add(grip);
  // 扶在泵柄上的手
  const hand = part(new THREE.BoxGeometry(0.15, 0.115, 0.145), { fillColor: 0xf7ead9 });
  hand.position.set(0, -0.05, -0.23);
  g.add(hand);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.022, -0.58);
  g.add(muzzle);
  return { group: g, pump, muzzle };
}

/** 红笔武士刀：红笔杆 + 长刀身，斜握在画面里 */
function buildKatana() {
  const g = new THREE.Group();
  // 刀身
  const blade = part(new THREE.BoxGeometry(0.04, 0.014, 0.82), {
    fillColor: 0xeef3fa,
    ink: INK,
    jitter: 0.005,
  });
  blade.position.set(0, 0, -0.5);
  g.add(blade);
  // 刀尖
  const tip = part(new THREE.ConeGeometry(0.024, 0.12, 4), { fillColor: 0xeef3fa, threshold: 25 });
  tip.rotation.x = -Math.PI / 2;
  tip.rotation.z = Math.PI / 4;
  tip.position.set(0, 0, -0.96);
  g.add(tip);
  // 护手（红色，强调这是「红笔」）
  const guard = part(new THREE.BoxGeometry(0.165, 0.028, 0.05), { fillColor: 0xe9b8ae });
  guard.position.set(0, 0, -0.08);
  g.add(guard);
  // 红笔杆
  const handle = part(new THREE.BoxGeometry(0.055, 0.055, 0.28), { fillColor: 0xf3cbc3 });
  handle.position.set(0, 0, 0.07);
  g.add(handle);
  // 缠绳
  for (let i = 0; i < 4; i++) {
    const wrap = part(new THREE.BoxGeometry(0.064, 0.064, 0.019), { fillColor: 0xe0a89e, jitter: 0.004 });
    wrap.position.set(0, 0, -0.01 + i * 0.055);
    wrap.rotation.z = i % 2 ? 0.32 : -0.32;
    g.add(wrap);
  }
  // 握刀的手
  const hand = part(new THREE.BoxGeometry(0.105, 0.105, 0.13), { fillColor: 0xf7ead9 });
  hand.position.set(0, 0, 0.14);
  g.add(hand);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -0.9);
  g.add(muzzle);
  return { group: g, muzzle };
}

// ------------------------------------------------------------------ 系统

const REST = {
  // 步枪细长、位置偏右
  rifle: { pos: new THREE.Vector3(0.235, -0.215, -0.36), rot: new THREE.Euler(0.03, -0.05, 0) },
  // 霰弹枪更靠中间一点、更沉
  shotgun: { pos: new THREE.Vector3(0.25, -0.23, -0.34), rot: new THREE.Euler(0.04, -0.06, 0) },
  // 武士刀斜着横过画面，刀尖指向左上方，整把刀都在画面内
  katana: { pos: new THREE.Vector3(0.26, -0.2, -0.42), rot: new THREE.Euler(0.02, 0.5, -0.62) },
};

export class Weapons {
  constructor(camera, textures, effects, hud) {
    this.camera = camera;
    this.effects = effects;
    this.hud = hud;
    this.defs = WEAPON_DEFS;
    this.index = 0;
    this.ammo = WEAPON_DEFS.map((d) => ({ mag: d.magSize, reserve: d.reserve }));

    this.cool = 0;
    this.reloadT = 0;
    this.reloading = false;
    this.recoil = 0;
    this.recoilPitch = 0;
    this.sway = new THREE.Vector2();
    this.bob = new THREE.Vector2();
    this.bobT = 0;
    this.switchT = 0;
    this.slashT = 0;
    this.slashSide = 1;
    this.triggerHeld = false;
    this.shotsFired = 0;

    // 枪口火光（挂到当前武器的枪口上，跟随模型动画）
    this.flashMat = new THREE.MeshBasicMaterial({
      map: textures.muzzle,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), this.flashMat);
    this.flash.renderOrder = 5;
    this.flash.visible = false;
    this.flashT = 0;

    // 斩击笔触
    this.slashMat = new THREE.MeshBasicMaterial({
      map: textures.slash,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });
    this.slash = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), this.slashMat);
    this.slash.position.set(0.1, -0.14, -1.0);
    this.slash.renderOrder = 6;
    this.slash.visible = false;
    camera.add(this.slash);

    // 三把武器的模型
    this.rigs = [];
    const built = [buildRifle(), buildShotgun(), buildKatana()];
    for (const b of built) {
      b.group.visible = false;
      camera.add(b.group);
      this.rigs.push(b);
    }
    this.select(0, true);
  }

  get def() {
    return this.defs[this.index];
  }

  get ammoNow() {
    return this.ammo[this.index];
  }

  select(i, silent = false) {
    if (i < 0 || i >= this.defs.length) return;
    if (i === this.index && !silent) return;
    this.rigs.forEach((r, k) => (r.group.visible = k === i));
    this.index = i;
    // 枪口火光跟着当前武器走
    this.rigs[i].muzzle.add(this.flash);
    this.flash.position.set(0, 0, 0);
    this.flash.rotation.set(0, 0, 0);
    this.reloading = false;
    this.reloadT = 0;
    this.switchT = 0.32;
    this.cool = Math.max(this.cool, 0.2);
    if (!silent) sfx('reload');
    this.hud && this.hud.setWeapon(this.def, this.ammoNow);
    this.hud && this.hud.setWeaponIndex(i);
  }

  cycle(dir) {
    const n = this.defs.length;
    this.select((this.index + dir + n) % n);
  }

  /** 开始换弹 */
  startReload() {
    const d = this.def;
    const a = this.ammoNow;
    if (d.melee || this.reloading || a.mag >= d.magSize || a.reserve <= 0) {
      if (a.mag <= 0 && a.reserve <= 0) sfx('dry');
      return;
    }
    this.reloading = true;
    this.reloadT = d.reloadTime;
    sfx('reload');
    this.hud && this.hud.toast('换弹中…');
  }

  finishReload() {
    const d = this.def;
    const a = this.ammoNow;
    const need = d.magSize - a.mag;
    const take = Math.min(need, a.reserve);
    a.mag += take;
    a.reserve -= take;
    this.reloading = false;
    this.hud && this.hud.setWeapon(d, a);
    this.hud && this.hud.toast('装填完成');
  }

  /** 补给：换波次时补充备弹 */
  refill() {
    for (let i = 0; i < this.defs.length; i++) {
      const d = this.defs[i];
      if (d.melee) continue;
      this.ammo[i].reserve = d.maxReserve;
      this.ammo[i].mag = d.magSize;
    }
    this.hud && this.hud.setWeapon(this.def, this.ammoNow);
  }

  reset() {
    for (let i = 0; i < this.defs.length; i++) {
      this.ammo[i].mag = this.defs[i].magSize;
      this.ammo[i].reserve = this.defs[i].reserve;
    }
    this.reloading = false;
    this.reloadT = 0;
    this.cool = 0;
    this.recoil = 0;
    this.slashT = 0;
    this.select(0, true);
    this.hud && this.hud.setWeapon(this.def, this.ammoNow);
  }

  update(dt, input, player, game, lookDelta) {
    if (this.cool > 0) this.cool -= dt;
    if (this.switchT > 0) this.switchT -= dt;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) {
        this.flash.visible = false;
        this.flashMat.opacity = 0;
      } else {
        this.flashMat.opacity = Math.min(1, this.flashT / 0.05);
      }
    }
    if (this.slashT > 0) {
      this.slashT -= dt;
      const t = 1 - Math.max(0, this.slashT / 0.22);
      this.slashMat.opacity = Math.max(0, 1 - t) * 1;
      this.slash.scale.setScalar(0.78 + t * 0.55);
      this.slash.rotation.z = this.slashSide * (0.95 - t * 1.8);
      if (this.slashT <= 0) this.slash.visible = false;
    }
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }

    // ---- 切枪 / 换弹 ----
    if (input.consumePress('Digit1')) this.select(0);
    if (input.consumePress('Digit2')) this.select(1);
    if (input.consumePress('Digit3')) this.select(2);
    const wheel = input.consumeWheel();
    if (wheel !== 0) this.cycle(wheel);
    if (input.consumePress('KeyR')) this.startReload();

    // ---- 开火 ----
    const pressed = input.consumeMouse();
    const held = input.mouseDown;
    const wantFire = this.def.auto ? held : pressed;
    if (wantFire && this.cool <= 0 && !this.reloading && this.switchT <= 0 && player.alive) {
      this.fire(player, game);
    }
    this.triggerHeld = held;

    this.updateRig(dt, lookDelta || { x: 0, y: 0 }, player);
  }

  fire(player, game) {
    const d = this.def;
    const a = this.ammoNow;

    if (!d.melee && a.mag <= 0) {
      sfx('dry');
      this.cool = 0.25;
      this.hud && this.hud.toast('弹匣空了 — 按 R 换弹');
      if (a.reserve > 0) this.startReload();
      return;
    }

    this.cool = d.fireRate;
    this.recoil = 1;
    this.recoilPitch = d.recoil.pitch;
    player.addRecoil(d.recoil.pitch, (Math.random() - 0.5) * d.recoil.yaw, d.recoil.shake);
    this.shotsFired++;

    if (d.melee) {
      this.doMelee(player, game);
      return;
    }

    a.mag--;
    this.hud && this.hud.setWeapon(d, a);
    this.hud && this.hud.shotKick();

    const rig = this.rigs[this.index];
    const muzzleWorld = rig.muzzle.getWorldPosition(new THREE.Vector3());
    const { origin, dir } = player.aimRay();

    // 枪口火光
    this.flash.visible = true;
    this.flashT = 0.05;
    this.flash.position.set(0, 0, 0);
    this.flash.lookAt(this.camera.position);
    this.flash.rotateZ(Math.random() * Math.PI * 2);
    const fs = d.id === 'shotgun' ? 1.3 : 0.95;
    this.flash.scale.setScalar(fs * (0.85 + Math.random() * 0.35));

    sfx(d.id === 'shotgun' ? 'shotgun' : 'rifle');

    // 每颗弹丸单独算弹道
    const pellets = d.pellets;
    const tmpDir = new THREE.Vector3();
    let anyEnemyHit = false; // 命中率只统计打到敌人的次数
    for (let p = 0; p < pellets; p++) {
      tmpDir.copy(dir);
      if (d.spread > 0) {
        // 在垂直于视线的平面上随机偏移
        const right = new THREE.Vector3().crossVectors(dir, UP).normalize();
        const up = new THREE.Vector3().crossVectors(right, dir).normalize();
        const r = Math.sqrt(Math.random()) * d.spread;
        const th = Math.random() * Math.PI * 2;
        tmpDir
          .addScaledVector(right, Math.cos(th) * r)
          .addScaledVector(up, Math.sin(th) * r)
          .normalize();
      }
      const hit = this.castShot(origin, tmpDir, d.range, game);
      if (hit) {
        if (hit.enemy) {
          anyEnemyHit = true;
          const killed = hit.enemy.hit(
            d.damage, tmpDir.x, tmpDir.z, hit.px, hit.py, hit.pz, this.effects,
          );
          this.hud && this.hud.hitmark(killed);
          if (!killed) sfx('hit');
          if (killed) game.onEnemyKilled(hit.enemy);
        } else {
          // 打在墙上：蓝墨点
          this.effects.burst(hit.px, hit.py, hit.pz, hit.nx, hit.ny, hit.nz, 7, 0x24408e, 2.6, 0.9, 0.1, 0.4);
          this.effects.splat(hit.px, hit.py, hit.pz, hit.nx, hit.ny, hit.nz, 0.3, 0, 14);
        }
      }
      // 霰弹只画前几颗的弹道，不然满屏都是线
      if (pellets === 1 || p < 3) {
        this.effects.tracer(
          muzzleWorld.x, muzzleWorld.y, muzzleWorld.z,
          hit ? hit.px : origin.x + tmpDir.x * d.range,
          hit ? hit.py : origin.y + tmpDir.y * d.range,
          hit ? hit.pz : origin.z + tmpDir.z * d.range,
          d.tracer,
        );
      }
    }
    if (a.mag === 0 && a.reserve > 0) {
      this.hud && this.hud.toast('弹匣空了 — 按 R 换弹');
    }
    game.onShotResolved(anyEnemyHit);
  }

  /** 单条射线：墙和敌人取最近命中 */
  castShot(origin, dir, range, game) {
    let best = null;
    let bestT = range;

    const world = game.world.shootables;
    for (let i = 0; i < world.length; i++) {
      const h = rayBox(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, world[i]);
      if (h && h.t < bestT) {
        bestT = h.t;
        best = { px: h.px, py: h.py, pz: h.pz, nx: h.n.x, ny: h.n.y, nz: h.n.z, enemy: null };
      }
    }

    const enemies = game.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const h = rayBox(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, e.updateHitbox());
      if (h && h.t < bestT) {
        bestT = h.t;
        best = { px: h.px, py: h.py, pz: h.pz, nx: h.n.x, ny: h.n.y, nz: h.n.z, enemy: e };
      }
    }
    return best;
  }

  /** 武士刀：扇形范围 + 视线判定，可以一次扫到好几个 */
  doMelee(player, game) {
    this.slashT = 0.22;
    this.slashSide *= -1;
    this.slash.visible = true;
    this.slashMat.opacity = 0.9;
    sfx('katanaSwing');

    const { origin, dir } = player.aimRay();
    const d = this.def;
    const hitEnemies = [];
    const range = d.range;

    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (e.dead) continue;
      const dx = e.body.x - origin.x;
      const dz = e.body.z - origin.z;
      const dy = e.body.y + 0.95 - origin.y;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > range + e.radius) continue;
      const nd = 1 / (dist || 1);
      const dot = (dx * nd) * dir.x + (dy * nd) * dir.y + (dz * nd) * dir.z;
      if (dot < d.arcCos) continue;
      // 中间不能隔着墙
      const blocked = game.lineBlocked(
        origin.x, origin.y, origin.z,
        e.body.x, e.body.y + 1.0, e.body.z,
      );
      if (blocked) continue;
      hitEnemies.push({ e, dx, dz });
    }

    if (hitEnemies.length === 0) {
      // 空挥也留一道笔锋
      const fx = origin.x + dir.x * range * 0.8;
      const fy = origin.y + dir.y * range * 0.8;
      const fz = origin.z + dir.z * range * 0.8;
      this.effects.burst(fx, fy, fz, 0, 0.4, 0, 4, 0x24408e, 1.6, 1.2, 0.08, 0.25);
      game.onShotResolved(false);
      return;
    }

    sfx('katanaHit');
    for (const { e, dx, dz } of hitEnemies) {
      const n = Math.hypot(dx, dz) || 1;
      const hx = e.body.x - (dx / n) * 0.3;
      const hz = e.body.z - (dz / n) * 0.3;
      const killed = e.hit(d.damage, dx / n, dz / n, hx, e.body.y + 1.05, hz, this.effects);
      this.hud && this.hud.hitmark(killed);
      if (killed) game.onEnemyKilled(e);
      // 刀光
      this.effects.tracer(
        origin.x + dir.x * 0.4, origin.y - 0.15, origin.z + dir.z * 0.4,
        e.body.x, e.body.y + 1.0, e.body.z,
        0x24408e,
      );
    }
    if (hitEnemies.length > 1) this.hud && this.hud.toast(`一刀 ${hitEnemies.length} 个！`);
    game.onShotResolved(true);
  }

  /** 枪械模型的动画 */
  updateRig(dt, md, player) {
    const d = this.def;
    const rig = this.rigs[this.index];
    if (!rig) return;

    // 后坐力衰减
    this.recoil = Math.max(0, this.recoil - dt * (d.id === 'shotgun' ? 6.5 : 11));

    // 鼠标摆动：武器稍微滞后于视角
    this.sway.x += (-md.x * 0.00042 - this.sway.x) * Math.min(1, dt * 12);
    this.sway.y += (-md.y * 0.00042 - this.sway.y) * Math.min(1, dt * 12);
    this.sway.x = Math.max(-0.05, Math.min(0.05, this.sway.x));
    this.sway.y = Math.max(-0.05, Math.min(0.05, this.sway.y));

    // 走路起伏
    const speedRatio = Math.min(1, Math.hypot(player.velX, player.velZ) / 8.4);
    this.bobT += dt * (6 + speedRatio * 6);
    const bobAmt = speedRatio * (player.body.onGround ? 1 : 0.3);
    this.bob.x = Math.cos(this.bobT) * 0.016 * bobAmt;
    this.bob.y = Math.abs(Math.sin(this.bobT)) * 0.02 * bobAmt;

    const rest = REST[d.id];
    const g = rig.group;

    let px = rest.pos.x + this.bob.x + this.sway.x;
    let py = rest.pos.y + this.bob.y + this.sway.y;
    let pz = rest.pos.z;
    let rx = rest.rot.x;
    let ry = rest.rot.y;
    let rz = rest.rot.z;

    // 开火后坐
    const kick = this.recoil * (d.id === 'shotgun' ? 0.12 : 0.07);
    pz += kick * 1.5;
    py += kick * 0.35;
    rx -= this.recoil * (d.id === 'shotgun' ? 0.42 : 0.2);
    rz += this.recoil * (d.id === 'shotgun' ? 0.16 : 0.06) * (Math.random() - 0.5) * 2;

    // 换弹动作
    if (this.reloading) {
      const t = 1 - this.reloadT / d.reloadTime;
      const k = Math.sin(Math.min(1, t * 1.6) * Math.PI);
      py -= 0.13 * k;
      rx += 0.75 * k;
      rz += 0.5 * k;
      pz += 0.05 * k;
    }

    // 切枪动作：从下面抬起来
    if (this.switchT > 0) {
      const t = 1 - this.switchT / 0.32;
      const k = 1 - t;
      py -= 0.42 * k;
      rx += 0.9 * k;
    }

    // 武士刀挥砍
    if (d.melee && this.slashT > 0) {
      const t = 1 - this.slashT / 0.22;
      const e = 1 - Math.pow(1 - t, 3);
      rz += this.slashSide * (1.5 - e * 2.9);
      rx += -0.5 + e * 1.0;
      px += -0.12 + e * 0.3;
      py += e * 0.06;
    }

    g.position.set(px, py, pz);
    g.rotation.set(rx, ry, rz);

    // 霰弹枪的泵动
    if (rig.pump) {
      const pumpT = this.recoil;
      rig.pump.position.z = -0.26 + pumpT * 0.09;
    }

    // 武士刀闲置时的轻微晃动
    if (d.melee) {
      g.rotation.z += Math.sin(this.bobT * 0.7) * 0.03;
    }
  }
}
