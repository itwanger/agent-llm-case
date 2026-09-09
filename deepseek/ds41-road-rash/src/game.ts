/* ============================================================
 * game.ts — scene, race director, combat resolution, camera
 * ============================================================ */

import * as THREE from 'three';
import { CONFIG } from './config';
import { Track } from './track';
import { Scenery } from './scenery';
import { Traffic } from './traffic';
import { Racer } from './entities';
import { updateAI, AIWorld } from './ai';
import { ParticleSystem } from './particles';
import { HUD, ResultRow } from './hud';
import { Input } from './input';
import { audio } from './audio';
import { skyTexture } from './textures';
import { clamp, damp, formatTime } from './utils';

type Phase = 'countdown' | 'racing' | 'finished' | 'results';

const RIVAL_NAMES = ['VIPER', 'RAZOR', 'BUZZ', 'HAVOC', 'SLEDGE'];
const START_SOUNDS = ['THREE', 'TWO', 'ONE'];

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly track: Track;
  readonly scenery: Scenery;
  readonly traffic: Traffic;
  readonly hud: HUD;
  readonly input: Input;
  readonly racers: Racer[] = [];
  readonly player: Racer;

  private sun!: THREE.DirectionalLight;
  private sparks: ParticleSystem;
  private dust: ParticleSystem;
  private smoke: ParticleSystem;

  private phase: Phase = 'countdown';
  private countdown = CONFIG.race.countdown;
  private countdownStep = -1;
  private raceTime = 0;
  private finishTimer = 0;
  private bestTime: number | null = null;

  private shake = 0;
  private slowmo = 0;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private fov: number = CONFIG.camera.fovBase;

  private colliderBuf: Array<{ s: number; x: number; radius: number }> = [];
  private aiWorld: AIWorld;

  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();
  private tmpC = new THREE.Vector3();
  private tmpQ = new THREE.Quaternion();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fovBase,
      window.innerWidth / window.innerHeight,
      0.4,
      1400,
    );
    this.camera.position.set(0, 8, -14);

    /* ---- world ---- */
    this.scene.fog = new THREE.Fog(0xcaa27e, CONFIG.render.fogNear, CONFIG.render.fogFar);
    this.buildSky();
    this.buildLights();

    this.track = new Track();
    this.scene.add(this.track.group);

    this.scenery = new Scenery(this.track);
    this.scene.add(this.scenery.group);

    this.traffic = new Traffic(this.track);
    this.scene.add(this.traffic.group);

    /* ---- racers ---- */
    for (let i = 0; i < CONFIG.race.racers; i++) {
      const isPlayer = i === 0;
      const r = new Racer(
        this.track,
        i,
        isPlayer,
        isPlayer ? 'YOU' : RIVAL_NAMES[i - 1] ?? `CPU${i}`,
        i,
        1000 + i * 137,
      );
      // classic Road Rash start: the player lines up at the BACK of the grid
      r.placeOnGrid(isPlayer ? CONFIG.race.racers - 1 : i - 1);
      this.racers.push(r);
      this.scene.add(r.root);
    }
    this.player = this.racers[0];

    /* ---- fx ---- */
    this.sparks = new ParticleSystem(700, THREE.AdditiveBlending);
    this.dust = new ParticleSystem(700, THREE.NormalBlending);
    this.smoke = new ParticleSystem(500, THREE.NormalBlending);
    this.scene.add(this.sparks.points, this.dust.points, this.smoke.points);

    this.hud = new HUD();
    this.input = new Input();

    this.aiWorld = {
      track: this.track,
      racers: this.racers,
      traffic: this.traffic,
      player: this.player,
      time: 0,
    };

    this.resetRace();
    window.addEventListener('resize', this.onResize);
    this.hud.setBest(this.bestTime);

    this.input.onAnyKey(() => audio.unlock());
    canvas.addEventListener('pointerdown', () => audio.unlock());
  }

  /* ---------------------------------------------------------------
   * scene setup
   * ------------------------------------------------------------- */
  private buildSky(): void {
    const geo = new THREE.SphereGeometry(900, 32, 20);
    const tex = skyTexture(CONFIG.render.skyTop, CONFIG.render.skyBottom);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    mesh.renderOrder = -1;
    this.scene.add(mesh);

    // a big low sun disc for that 90s sunset look
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(58, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false, transparent: true, opacity: 0.9 }),
    );
    const dir = new THREE.Vector3(...CONFIG.render.sunDir).normalize();
    sun.position.copy(dir).multiplyScalar(760);
    sun.lookAt(0, 0, 0);
    this.scene.add(sun);
  }

  private buildLights(): void {
    const hemi = new THREE.HemisphereLight(0x9fc4ff, 0x6b4a2a, 1.15);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(0xfff0cf, 2.35);
    const d = new THREE.Vector3(...CONFIG.render.sunDir).normalize();
    this.sun.position.copy(d).multiplyScalar(120);
    this.sun.castShadow = true;
    const S = CONFIG.render.shadowRange;
    this.sun.shadow.camera.left = -S;
    this.sun.shadow.camera.right = S;
    this.sun.shadow.camera.top = S;
    this.sun.shadow.camera.bottom = -S;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 320;
    this.sun.shadow.mapSize.set(CONFIG.render.shadowSize, CONFIG.render.shadowSize);
    this.sun.shadow.bias = -0.0009;
    this.sun.shadow.normalBias = 0.045;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.28));
  }

  /* ---------------------------------------------------------------
   * race lifecycle
   * ------------------------------------------------------------- */
  private get raceDistance(): number {
    return CONFIG.race.laps * this.track.length;
  }

  resetRace(): void {
    this.phase = 'countdown';
    this.countdown = CONFIG.race.countdown;
    this.countdownStep = -1;
    this.raceTime = 0;
    this.finishTimer = 0;
    this.shake = 0;
    this.slowmo = 0;
    this.sparks.clear();
    this.dust.clear();
    this.smoke.clear();
    this.racers.forEach((r, i) => r.placeOnGrid(r.isPlayer ? CONFIG.race.racers - 1 : i - 1));
    this.traffic.reset(this.player.totalS);
    this.hud.hideResults();
    this.hud.setBest(this.bestTime);
    this.hud.setCombo(0);
    this.hud.setHealth(1);
    this.hud.setRank(this.player.rank, this.racers.length);
    this.hud.setLap(1, CONFIG.race.laps);
    this.hud.setTime(0);
    this.updateRanking();
    this.placeCameraImmediate();
  }

  private updateRanking(): void {
    const order = [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    order.forEach((r, i) => (r.rank = i + 1));
  }

  private placeCameraImmediate(): void {
    const p = this.player;
    const sm = this.track.sample(p.s);
    // the bike's world transform is only written by updateVisual(), so
    // derive its position from the track coordinates instead of the mesh
    const anchor = this.tmpA.copy(sm.pos).addScaledVector(sm.right, p.x);
    this.camPos
      .copy(anchor)
      .addScaledVector(sm.fwd, -CONFIG.camera.distance)
      .addScaledVector(sm.up, CONFIG.camera.height);
    this.camLook
      .copy(anchor)
      .addScaledVector(sm.fwd, CONFIG.camera.lookAhead)
      .addScaledVector(sm.up, CONFIG.camera.lookHeight);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  /* ---------------------------------------------------------------
   * adaptive quality — keeps the frame rate playable on weak GPUs
   * ------------------------------------------------------------- */
  private frameAvg = 16;
  private quality = 0;
  private qualityCooldown = 3;

  private updateQuality(rawDt: number): void {
    this.frameAvg = this.frameAvg * 0.94 + Math.min(rawDt * 1000, 120) * 0.06;
    this.qualityCooldown = Math.max(0, this.qualityCooldown - rawDt);
    if (this.qualityCooldown > 0) return;
    if (this.frameAvg > 30 && this.quality < 2) this.setQuality(this.quality + 1);
    else if (this.frameAvg < 13.5 && this.quality > 0) this.setQuality(this.quality - 1);
  }

  private setQuality(q: number): void {
    this.quality = q;
    this.qualityCooldown = 3.5;
    const dpr = window.devicePixelRatio || 1;
    // NOTE: shadows stay enabled at every level — toggling
    // renderer.shadowMap.enabled at runtime leaves already-compiled
    // materials sampling a depth texture that is no longer bound.
    if (q === 0) {
      this.renderer.setPixelRatio(Math.min(2, dpr));
      this.sun.shadow.mapSize.set(2048, 2048);
    } else if (q === 1) {
      this.renderer.setPixelRatio(Math.min(1.25, dpr));
      this.sun.shadow.mapSize.set(1024, 1024);
    } else {
      this.renderer.setPixelRatio(1);
      this.sun.shadow.mapSize.set(512, 512);
    }
    if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.shadow.needsUpdate = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /* ---------------------------------------------------------------
   * main loop
   * ------------------------------------------------------------- */
  private lastT = performance.now();

  start(): void {
    this.lastT = performance.now();
    requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    requestAnimationFrame(this.frame);
    const rawDt = (now - this.lastT) / 1000;
    this.lastT = now;
    const dt = clamp(rawDt, 0, 1 / 20);
    this.updateQuality(rawDt);

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  };

  private update(dt: number): void {
    const simDt = dt * (this.slowmo > 0 ? 0.45 : 1);
    this.slowmo = Math.max(0, this.slowmo - dt);
    this.aiWorld.time += dt;

    if (this.phase === 'countdown') {
      this.updateCountdown(dt);
    } else if (this.phase === 'racing' || this.phase === 'finished') {
      if (this.phase === 'racing') this.raceTime += dt;
      this.updateRacers(simDt, true);
      this.traffic.update(simDt, this.player.s);
      this.resolveCombat(simDt);
      this.resolveCollisions(simDt);
      this.updateRanking();
      this.checkFinish(dt);
    } else {
      // results: keep the world breathing
      this.updateRacers(simDt, false);
      this.traffic.update(simDt, this.player.s);
    }

    this.sparks.update(dt);
    this.dust.update(dt);
    this.smoke.update(dt);
    this.updateCamera(dt);
    this.updateHud(dt);
    this.hud.update(dt);
  }

  private updateCountdown(dt: number): void {
    this.countdown -= dt;
    const elapsed = CONFIG.race.countdown - this.countdown;
    const step = Math.floor(elapsed);
    if (step !== this.countdownStep && step >= 0 && step < 3) {
      this.countdownStep = step;
      this.hud.message(START_SOUNDS[step], '');
      audio.countdownBeep(1);
      this.hud.flash(0.12);
    }
    if (this.countdown <= 0) {
      this.phase = 'racing';
      this.raceTime = 0;
      this.hud.message('GO!', 'go', 1.0);
      audio.countdownBeep(0);
      this.hud.flash(0.3);
    }
    // keep the pack alive but stationary (and correctly placed on the grid)
    for (const r of this.racers) {
      r.updateTimers(dt);
      r.updateVisual(dt, this.aiWorld.time);
    }
  }

  private updateRacers(dt: number, allowInput: boolean): void {
    const p = this.player;

    /* ---- player ---- */
    if (p.state === 'sliding') {
      p.updateCrash(dt);
    } else if (allowInput && this.phase !== 'finished') {
      p.drive(dt, this.input.throttle, this.input.brake, this.input.steer);
      if (this.input.action('punchLeft')) this.tryAttack(p, 'punchL');
      if (this.input.action('punchRight')) this.tryAttack(p, 'punchR');
      if (this.input.action('club')) this.tryAttack(p, 'club');
      p.updateTimers(dt);
    } else {
      p.drive(dt, false, false, 0);
      p.updateTimers(dt);
    }
    p.updateVisual(dt, this.aiWorld.time);
    this.emitRideFx(p, dt);

    /* ---- AI ---- */
    for (let i = 1; i < this.racers.length; i++) {
      const r = this.racers[i];
      if (this.phase === 'countdown') {
        r.updateVisual(dt, this.aiWorld.time);
        continue;
      }
      updateAI(r, dt, this.aiWorld);
      r.updateVisual(dt, this.aiWorld.time);
      this.emitRideFx(r, dt);
    }
  }

  private tryAttack(r: Racer, kind: 'punchL' | 'punchR' | 'club'): void {
    if (r.startAttack(kind)) {
      if (kind === 'club') audio.whoosh();
      else audio.blip(660, 0.05, 'triangle');
    }
  }

  /* ---------------------------------------------------------------
   * combat
   * ------------------------------------------------------------- */
  private resolveCombat(dt: number): void {
    const C = CONFIG.combat;
    for (const a of this.racers) {
      if (!a.attackActive || a.attackHit) continue;
      const kind = a.attack;
      const range = kind === 'club' ? C.clubRange : C.punchRange;
      const side = kind === 'club' ? C.clubSide : C.punchSide;
      const dirSign = kind === 'punchL' ? -1 : kind === 'punchR' ? 1 : 0;

      for (const t of this.racers) {
        if (t === a || t.state === 'sliding' || t.invulnTimer > 0) continue;
        const ds = this.track.delta(a.s, t.s);
        if (ds < -0.7 || ds > range) continue;
        const dx = t.x - a.x;

        let ok: boolean;
        if (kind === 'club') {
          // two-handed horizontal sweep: covers both sides, but only up close
          ok = Math.abs(dx) <= side && ds >= -0.45;
        } else {
          ok = dirSign < 0 ? dx <= -0.1 && dx >= -side : dx >= 0.1 && dx <= side;
        }
        if (!ok) continue;

        /* --- connect --- */
        a.attackHit = true;
        a.hitsLanded++;
        a.combo++;
        a.comboTimer = 2.4;
        a.speed *= CONFIG.bike.hitSlowdown;

        const dmg = kind === 'club' ? C.clubDamage : C.punchDamage;
        const knockedOut = t.takeHit(dmg, a.x, a.id, this.raceTime);

        // contact point + fx
        const sm = this.track.sample((a.s + t.s) * 0.5);
        const hit = this.tmpA
          .copy(sm.pos)
          .addScaledVector(sm.right, (a.x + t.x) * 0.5)
          .addScaledVector(sm.up, 1.25);
        this.sparks.emit(hit, kind === 'club' ? 26 : 16, {
          speed: [2, 9],
          size: [0.07, 0.2],
          life: [0.18, 0.5],
          color: kind === 'club' ? [0xfff0a0, 0xffb320, 0xffffff] : [0xffd27a, 0xff7a3a],
          gravity: 9,
          drag: 1.4,
        });
        if (kind === 'club') audio.clubHit();
        else audio.punch();

        if (a.isPlayer) {
          this.hud.setCombo(a.combo);
          this.hud.flash(0.16);
          this.shake = Math.max(this.shake, kind === 'club' ? 0.6 : 0.34);
          if (knockedOut) {
            this.hud.message('KNOCKDOWN!', '', 0.9);
            a.knockdowns++;
          }
        }
        if (t.isPlayer) {
          audio.hurt();
          this.hud.flash(0.55);
          this.shake = Math.max(this.shake, 1.15);
          this.slowmo = 0.35;
        }
        break; // one victim per swing
      }
    }
  }

  /* ---------------------------------------------------------------
   * physical collisions
   * ------------------------------------------------------------- */
  private resolveCollisions(dt: number): void {
    const B = CONFIG.bike;

    /* --- rider vs rider --- */
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i];
        const b = this.racers[j];
        if (a.state === 'sliding' && b.state === 'sliding') continue;
        const ds = this.track.delta(a.s, b.s);
        const dx = b.x - a.x;
        const overlapS = 2.15 - Math.abs(ds);
        const overlapX = 1.32 - Math.abs(dx);
        if (overlapS <= 0 || overlapX <= 0) continue;

        // separate laterally
        const push = Math.min(overlapX * 0.5, 0.42) * (dx >= 0 ? -1 : 1);
        if (a.state !== 'sliding') {
          a.x += push;
          a.lateralVel += push * 2.2;
        }
        if (b.state !== 'sliding') {
          b.x -= push;
          b.lateralVel -= push * 2.2;
        }

        // a rear-end only counts when the faster rider is actually behind
        const dsAB = this.track.delta(a.s, b.s); // b - a
        const rel = a.speed - b.speed; // positive => a is faster
        let victim: Racer | null = null;
        let hitter: Racer | null = null;
        if (rel > 0 && dsAB > 0.3) {
          hitter = a;
          victim = b;
        } else if (rel < 0 && dsAB < -0.3) {
          hitter = b;
          victim = a;
        }

        if (victim && hitter && Math.abs(rel) > B.crashSpeedDelta) {
          if (victim.invulnTimer <= 0 && victim.state !== 'sliding') {
            victim.startCrash(this.raceTime, 'T-BONED');
            hitter.speed *= 0.62;
            this.onCrash(victim, hitter.isPlayer);
          }
        } else {
          const avg = (a.speed + b.speed) * 0.5;
          a.speed = avg * 0.985;
          b.speed = avg * 0.985;
        }
      }
    }

    /* --- rider vs traffic --- */
    for (const r of this.racers) {
      if (r.state === 'sliding') continue;
      for (const car of this.traffic.cars) {
        if (!car.alive) continue;
        const ds = this.track.delta(r.s, car.s);
        const dx = car.x - r.x;
        const halfS = car.halfLength + 1.0;
        const halfX = car.halfWidth + 0.55;
        if (Math.abs(ds) > halfS || Math.abs(dx) > halfX) continue;

        const closing = car.dir < 0 ? r.speed + car.speed : Math.abs(r.speed - car.speed);
        // shove the bike away from the car
        const away = Math.sign(r.x - car.x) || 1;
        r.x += away * 0.5;
        r.lateralVel += away * 3.2;

        if (closing > 7 && r.invulnTimer <= 0) {
          r.startCrash(this.raceTime, car.dir < 0 ? 'HEAD-ON' : 'REAR-ENDED');
          this.onCrash(r, r.isPlayer);
          car.hide();
          this.smoke.emit(car.group.position, 26, {
            speed: [1, 5],
            size: [0.5, 1.4],
            life: [0.7, 1.7],
            color: [0x555555, 0x888888, 0xbbbbbb],
            drag: 1.1,
            upBias: 0.7,
          });
        } else {
          r.speed *= 0.45;
          audio.hurt();
          this.shake = Math.max(this.shake, 0.5);
          this.sparks.emit(car.group.position, 10, {
            speed: [1, 5],
            size: [0.06, 0.16],
            life: [0.15, 0.4],
            color: [0xffd27a, 0xffffff],
          });
        }
      }
    }

    /* --- rider vs scenery --- */
    for (const r of this.racers) {
      if (r.state === 'sliding') continue;
      this.scenery.query(r.s, this.colliderBuf);
      for (const c of this.colliderBuf) {
        const ds = this.track.delta(r.s, c.s);
        if (Math.abs(ds) > 2.2 + c.radius) continue;
        const dx = c.x - r.x;
        if (Math.abs(dx) > c.radius + 0.62) continue;
        const dist = Math.hypot(ds, dx);
        if (dist > c.radius + 0.9) continue;

        const away = Math.sign(r.x - c.x) || 1;
        r.x += away * 0.35;
        r.lateralVel += away * 2.5;
        if (r.speed > 11 && r.invulnTimer <= 0) {
          r.startCrash(this.raceTime, 'WIPEOUT');
          this.onCrash(r, r.isPlayer);
        } else {
          r.speed *= 0.4;
          this.shake = Math.max(this.shake, 0.35);
        }
        this.dust.emit(
          this.tmpB.copy(r.bikeGroup.position),
          10,
          { speed: [1, 3], size: [0.2, 0.5], life: [0.3, 0.8], color: [0x9a7a4a] },
        );
        break;
      }
    }
  }

  private onCrash(r: Racer, isPlayer: boolean): void {
    audio.crash();
    if (isPlayer) {
      this.shake = Math.max(this.shake, 1.6);
      this.slowmo = 0.9;
      this.hud.flash(0.8);
      this.hud.message('CRASH!', '', 1.1);
      this.hud.setCombo(0);
    } else {
      this.shake = Math.max(this.shake, 0.5);
      if (this.player.lastAttacker === r.id) this.hud.subMessage(`${r.name} DOWN!`, 1.0);
    }
    const pos = this.tmpC.copy(r.bikeGroup.position);
    this.sparks.emit(pos, 40, {
      speed: [3, 12],
      size: [0.08, 0.24],
      life: [0.25, 0.8],
      color: [0xfff0a0, 0xffb320, 0xff6a2a],
      gravity: 12,
      drag: 1.2,
    });
    this.dust.emit(pos, 24, {
      speed: [1, 5],
      size: [0.4, 1.1],
      life: [0.6, 1.4],
      color: [0x8a6a3f, 0xa8895a],
      upBias: 0.6,
    });
  }

  private emitRideFx(r: Racer, dt: number): void {
    if (r.state === 'sliding') {
      if (Math.random() < dt * 22) {
        const body = r.bikeBody;
        const sm = this.track.sample(body.s);
        this.dust.emit(
          this.tmpB.copy(sm.pos).addScaledVector(sm.right, body.x).addScaledVector(sm.up, 0.15),
          2,
          { speed: [0.5, 2.2], size: [0.3, 0.8], life: [0.4, 1.0], color: [0xa8895a, 0x8a6a3f] },
        );
      }
      return;
    }
    if (r.offroad && Math.abs(r.speed) > 4 && Math.random() < dt * 34) {
      this.dust.emit(this.tmpB.copy(r.bikeGroup.position), 2, {
        speed: [0.4, 2],
        size: [0.25, 0.7],
        life: [0.35, 0.9],
        color: [0x9a7a4a, 0xb09060],
        upBias: 0.5,
      });
    }
    // exhaust puff under hard acceleration
    if (r.speed < r.maxSpeed * 0.35 && Math.random() < dt * 10) {
      this.smoke.emit(
        this.tmpB.copy(r.bikeGroup.position).addScaledVector(this.track.sample(r.s).up, 0.4),
        1,
        { speed: [0.2, 1], size: [0.2, 0.5], life: [0.3, 0.7], color: [0x9a9a9a], upBias: 1 },
      );
    }
  }

  /* ---------------------------------------------------------------
   * finish
   * ------------------------------------------------------------- */
  private checkFinish(dt: number): void {
    const p = this.player;
    for (const r of this.racers) {
      if (!r.finished && r.progress >= this.raceDistance) {
        r.finished = true;
        r.finishTime = this.raceTime;
        r.state = 'finished';
        if (r.isPlayer) {
          this.phase = 'finished';
          this.finishTimer = 0;
          audio.fanfare();
          this.hud.message(formatTime(r.finishTime), 'go', 1.6);
          this.hud.subMessage('FINISH!', 1.6);
        }
      }
    }

    if (this.phase === 'finished') {
      this.finishTimer += dt;
      if (this.finishTimer >= CONFIG.race.finishHold) {
        this.phase = 'results';
        this.showResults();
      }
    }
    void p;
  }

  private showResults(): void {
    const now = this.raceTime;
    const rows: ResultRow[] = [...this.racers]
      .sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.progress - a.progress;
      })
      .map((r) => {
        const remaining = Math.max(0, this.raceDistance - r.progress);
        const time = r.finished
          ? r.finishTime
          : now + remaining / Math.max(8, r.speed > 1 ? r.speed : 22);
        return {
          name: r.name,
          time,
          dnf: false,
          isPlayer: r.isPlayer,
          hits: r.hitsLanded,
        };
      });

    const rank = rows.findIndex((r) => r.isPlayer) + 1;
    const title = rank === 1 ? 'YOU WIN!' : `FINISHED ${rank}${['st', 'nd', 'rd'][rank - 1] ?? 'th'}`;
    this.hud.showResults(title, rows);

    const p = this.player;
    if (this.bestTime === null || p.finishTime < this.bestTime) {
      this.bestTime = p.finishTime;
      this.hud.setBest(this.bestTime);
    }
  }

  /* ---------------------------------------------------------------
   * camera
   * ------------------------------------------------------------- */
  private updateCamera(dt: number): void {
    const p = this.player;
    const cam = CONFIG.camera;
    const crashed = p.state === 'sliding';

    // follow the rider while tumbling, the bike otherwise
    const anchor = crashed ? p.riderGroup.position : p.bikeGroup.position;
    const sm = this.track.sample(crashed ? p.riderBody.s : p.s);

    const back = this.tmpA.set(0, 0, -1).applyQuaternion(p.bikeGroup.quaternion);
    const speedFrac = clamp(Math.abs(p.speed) / CONFIG.bike.maxSpeed, 0, 1);
    const dist = cam.distance + speedFrac * 1.0 + (crashed ? 1.6 : 0);
    const height = cam.height + speedFrac * 0.28 + (crashed ? 0.7 : 0);

    const want = this.tmpB
      .copy(anchor)
      .addScaledVector(back, dist)
      .addScaledVector(sm.up, height);

    // tighten the follow as speed rises so the bike never runs away from the camera
    const lambda = (crashed ? cam.posLerp * 0.8 : cam.posLerp) * (1 + speedFrac * 0.8);
    this.camPos.x = damp(this.camPos.x, want.x, lambda, dt);
    this.camPos.y = damp(this.camPos.y, want.y, lambda, dt);
    this.camPos.z = damp(this.camPos.z, want.z, lambda, dt);

    const lookWant = this.tmpC
      .copy(anchor)
      .addScaledVector(sm.fwd, cam.lookAhead)
      .addScaledVector(sm.up, cam.lookHeight);
    this.camLook.x = damp(this.camLook.x, lookWant.x, cam.lookLerp, dt);
    this.camLook.y = damp(this.camLook.y, lookWant.y, cam.lookLerp, dt);
    this.camLook.z = damp(this.camLook.z, lookWant.z, cam.lookLerp, dt);

    // shake
    this.shake = Math.max(0, this.shake - cam.shakeDecay * dt);
    const s = this.shake * this.shake;
    this.camera.position.copy(this.camPos);
    if (s > 0.0001) {
      this.camera.position.x += (Math.random() - 0.5) * s * 0.9;
      this.camera.position.y += (Math.random() - 0.5) * s * 0.7;
      this.camera.position.z += (Math.random() - 0.5) * s * 0.9;
    }
    this.camera.lookAt(this.camLook);
    this.camera.rotation.z += (Math.random() - 0.5) * s * 0.06 + p.lean * 0.06;

    // speed FOV
    const fovTarget = cam.fovBase + speedFrac * cam.fovSpeedGain + (crashed ? 6 : 0);
    this.fov = damp(this.fov, fovTarget, 4.5, dt);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    // keep the shadow frustum around the player
    const d = this.tmpA.copy(this.track.sample(p.s).pos);
    this.sun.target.position.copy(d);
    this.sun.position
      .copy(d)
      .addScaledVector(this.tmpB.set(...CONFIG.render.sunDir).normalize(), 110);
  }

  /* ---------------------------------------------------------------
   * HUD
   * ------------------------------------------------------------- */
  private updateHud(dt: number): void {
    const p = this.player;
    const kmh = Math.abs(p.speed) * 3.6;
    const gear = clamp(Math.floor(kmh / 42) + 1, 1, 6);
    this.hud.drawSpeedo(kmh, dt, gear, kmh > 205);
    this.hud.setHealth(p.health / CONFIG.combat.maxHealth);
    this.hud.setRank(p.rank, this.racers.length);
    this.hud.setLap(p.lap, CONFIG.race.laps);
    if (this.phase !== 'countdown') this.hud.setTime(this.raceTime);

    audio.updateEngine(
      clamp(Math.abs(p.speed) / CONFIG.bike.maxSpeed, 0, 1),
      this.input.throttle ? 1 : 0,
      this.phase === 'racing' && p.state === 'riding',
    );
  }

  /* ---------------------------------------------------------------
   * misc
   * ------------------------------------------------------------- */
  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  /** Restart triggered by the R key or the results button. */
  requestRestart(): void {
    if (this.phase === 'results' || this.phase === 'finished' || this.phase === 'racing') {
      this.resetRace();
    }
  }

  get currentPhase(): Phase {
    return this.phase;
  }
}
