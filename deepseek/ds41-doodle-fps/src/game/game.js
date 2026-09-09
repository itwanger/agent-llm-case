import { Enemy } from './enemies.js';
import { segmentBlocked } from '../core/doodle.js';
import { sfx, resumeAudio } from '../core/audio.js';

/**
 * 游戏流程：菜单 → 玩 → 暂停 → 死亡 → 重开。
 * 负责刷怪、波次、统计、以及给自动化测试用的调试接口。
 */

const SPAWN_INTERVAL = 2.6;
const WAVE_TIME = 28;
const BASE_MAX_ALIVE = 4;

export class Game {
  constructor(ctx) {
    this.scene = ctx.scene;
    this.camera = ctx.camera;
    this.world = ctx.world;
    this.player = ctx.player;
    this.weapons = ctx.weapons;
    this.effects = ctx.effects;
    this.hud = ctx.hud;
    this.input = ctx.input;

    this.state = 'menu';
    this.enemies = [];
    this.kills = 0;
    this.elapsed = 0;
    this.wave = 1;
    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.stats = { shots: 0, hits: 0 };
    this.lockWasActive = false;
    this.spawnIndex = 0;

    this._bindPause();
  }

  _bindPause() {
    this.input.onLockChange = (locked) => {
      if (locked) this.lockWasActive = true;
      else if (this.state === 'playing' && this.lockWasActive) this.pause();
    };
    // 指针锁定失败 / 被 Esc 解锁后，再点一下画面就能重新锁上
    this.input.dom.addEventListener('click', () => {
      if (this.state === 'playing' && !this.input.locked && !this.input.forceLook) {
        this.input.requestLock();
      }
    });
  }

  // ------------------------------------------------------------ 流程

  start() {
    if (this.state === 'playing') return;
    if (this.state === 'dead') {
      this.restart();
      return;
    }
    resumeAudio();
    sfx('ui');
    this.state = 'playing';
    this.hud.show();
    this.hud.hideOverlay();
    this.input.enabled = true;
    this.input.requestLock();
    if (this.enemies.length === 0 && this.kills === 0) {
      for (let i = 0; i < 3; i++) this.spawnEnemy(true);
    }
    this.hud.toast('红色火柴人正在靠近…', 2);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.hud.showPause();
    this.input.exitLock();
  }

  resume() {
    this.start();
  }

  restart() {
    // 清场
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    this.effects.reset();
    this.player.reset();
    this.weapons.reset();
    this.kills = 0;
    this.elapsed = 0;
    this.wave = 1;
    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.stats.shots = 0;
    this.stats.hits = 0;
    this.hud.setKills(0);
    this.hud.setThreat(0);
    this.hud.setHealth(this.player.health, this.player.maxHealth);
    this.hud.setWeapon(this.weapons.def, this.weapons.ammoNow);
    this.hud.setWeaponIndex(this.weapons.index);
    this.state = 'playing';
    this.hud.show();
    this.hud.hideOverlay();
    for (let i = 0; i < 3; i++) this.spawnEnemy(true);
    this.hud.toast('重新画一遍', 1.4);
  }

  die() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    sfx('death');
    this.player.alive = false;
    this.input.exitLock();
    this.hud.showDead({
      kills: this.kills,
      time: this.elapsed,
      accuracy: this.stats.shots ? Math.round((this.stats.hits / this.stats.shots) * 100) : 0,
    });
  }

  onShotResolved(hit) {
    this.stats.shots++;
    if (hit) this.stats.hits++;
  }

  onEnemyKilled(enemy) {
    this.kills++;
    this.hud.setKills(this.kills);
    this.hud.inkFlash();
    // 击杀回一点弹药，鼓励用枪
    for (let i = 0; i < this.weapons.ammo.length; i++) {
      const d = this.weapons.defs[i];
      if (d.melee) continue;
      const a = this.weapons.ammo[i];
      a.reserve = Math.min(d.maxReserve, a.reserve + 4);
    }
    this.hud.setWeapon(this.weapons.def, this.weapons.ammoNow);
    if (this.kills % 5 === 0) this.hud.toast(`${this.kills} 个火柴人被涂掉了`, 1.6);
  }

  lineBlocked(ax, ay, az, bx, by, bz) {
    return segmentBlocked(ax, ay, az, bx, by, bz, this.world.shootables);
  }

  // ------------------------------------------------------------ 刷怪

  spawnEnemy(force = false) {
    const maxAlive = Math.min(9, BASE_MAX_ALIVE + Math.floor((this.wave - 1) * 1.2));
    if (!force && this.enemies.filter((e) => !e.dead).length >= maxAlive) return null;

    const pts = this.world.spawnPoints;
    // 优先选离玩家远、且不在视野正前方的点
    let best = null;
    let bestScore = -Infinity;
    for (let k = 0; k < 5; k++) {
      const p = pts[(this.spawnIndex + k * 3) % pts.length];
      const d = Math.hypot(p.x - this.player.body.x, p.z - this.player.body.z);
      if (d < 12) continue;
      const score = d + Math.random() * 8;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    this.spawnIndex = (this.spawnIndex + 1) % pts.length;
    if (!best) best = pts[this.spawnIndex];

    const e = new Enemy(this.scene, this.world, best, {
      health: 34 + (this.wave - 1) * 4,
      speed: 3.0 + (this.wave - 1) * 0.12,
    });
    this.enemies.push(e);
    sfx('spawn');
    this.hud.setThreat(this.enemies.filter((x) => !x.dead).length);
    return e;
  }

  nextWave() {
    this.wave++;
    this.waveTimer = 0;
    this.weapons.refill();
    this.hud.toast(`第 ${this.wave} 页 · 更多火柴人出现了`, 2);
    this.hud.inkFlash();
  }

  // ------------------------------------------------------------ 主循环

  update(dt) {
    // dt 夹紧，避免切后台回来瞬移
    dt = Math.min(dt, 0.05);

    if (this.state === 'playing') {
      this.elapsed += dt;
      this.waveTimer += dt;
      if (this.waveTimer >= WAVE_TIME) this.nextWave();

      // 刷怪
      this.spawnTimer += dt;
      if (this.spawnTimer >= SPAWN_INTERVAL) {
        this.spawnTimer = 0;
        this.spawnEnemy();
      }
    }

    const look = this.input.consumeMouseDelta();

    if (this.state === 'playing' || this.state === 'dead') {
      // 鼠标瞄准（玩家和武器动画共用同一份增量）
      if (this.state === 'playing') this.player.addLook(look.x, look.y);
      this.player.update(dt, this.input);

      if (this.state === 'playing') {
        this.weapons.update(dt, this.input, this.player, this, look);

        // 敌人 AI
        for (let i = 0; i < this.enemies.length; i++) {
          this.enemies[i].update(dt, this.player, this.effects, this.enemies);
        }

        // 清理
        let dirty = false;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.remove) {
            e.dispose();
            this.enemies.splice(i, 1);
            dirty = true;
          }
        }
        if (dirty) this.hud.setThreat(this.enemies.filter((x) => !x.dead).length);

        if (!this.player.alive) this.die();

        this.hud.setHealth(this.player.health, this.player.maxHealth);
        if (this.player.hurtFlash > 0.7) this.hud.damageFlash();
        if (this.input.consumePress('KeyP')) this.pause();
      } else {
        // 死亡后仍让尸体动画和特效跑完
        for (let i = 0; i < this.enemies.length; i++) {
          this.enemies[i].update(dt, this.player, this.effects, this.enemies);
        }
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          if (this.enemies[i].remove) {
            this.enemies[i].dispose();
            this.enemies.splice(i, 1);
          }
        }
        if (this.input.consumePress('Enter') || this.input.consumePress('NumpadEnter')) {
          this.restart();
        }
      }
    } else {
      // 菜单 / 暂停：相机保持不动，但特效继续
      this.player.updateCamera();
      if (this.state === 'menu' && this.input.consumePress('Enter')) this.start();
    }

    this.effects.update(dt);
    this.hud.update(dt);
    this.input.endFrame();
  }
}
