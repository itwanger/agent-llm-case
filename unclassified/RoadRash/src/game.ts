import * as THREE from 'three';
import { CONFIG, RACER_COLORS, RACER_NAMES, CAR_COLORS } from './config';
import { Road, scratchFrame, type RoadFrame } from './road';
import { createBike, createCar } from './models';
import { Racer, TrafficCar, type AttackType } from './entities';
import { Input } from './input';
import { AudioMan } from './audio';
import { Particles } from './particles';
import { HUD, type FloaterData } from './hud';
import { countAggro, updateAI } from './ai';
import { attackSpec, startAttack, updateAttack } from './combat';
import { collideBikesWithWorld, newEvents } from './collision';

type GameState = 'menu' | 'countdown' | 'racing' | 'paused' | 'finished';

const _m = new THREE.Matrix4();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _col = new THREE.Color();

function setOrientation(obj: THREE.Object3D, fwd: THREE.Vector3, up: THREE.Vector3, roll: number) {
  const fwdC = _v4.copy(fwd);
  const right0 = _v3.crossVectors(fwdC, up).normalize();
  const upR = _v1.copy(up).multiplyScalar(Math.cos(roll)).addScaledVector(right0, Math.sin(roll));
  const rightR = _v2.crossVectors(fwdC, upR).normalize();
  // (right, up, forward) is a left-handed triple, so feeding it to makeBasis yields a
  // reflection; setFromRotationMatrix then collapses it to a half-scale identity-ish
  // quaternion (bikes never turned with the road and faced backwards on -Z straights).
  // The model's local +X therefore maps to the geometric LEFT; asymmetric bike parts
  // are built at negated x in models.ts to compensate.
  _m.makeBasis(_v3.copy(rightR).negate(), upR, fwdC);
  obj.quaternion.setFromRotationMatrix(_m);
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly road: Road;
  readonly racers: Racer[] = [];
  readonly player: Racer;
  readonly cars: TrafficCar[] = [];
  readonly particles: Particles;
  readonly audio = new AudioMan();
  readonly hud: HUD;
  readonly input = new Input();
  private sky: THREE.Mesh;
  private sun: THREE.DirectionalLight;
  private clouds: THREE.Group;

  state: GameState = 'menu';
  private prevState: GameState = 'racing';
  raceTime = 0;
  private countdownT = 0;
  private goTimer = 0;
  private lastCount = -1;
  private shake = 0;
  private acc = 0;
  private last = 0;
  fps = 60;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private frame: RoadFrame = {
    pos: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    theta: 0,
    pitch: 0,
    kappa: 0,
  };
  private scrapeTimer = 0;
  private raf = 0;

  constructor(container: HTMLElement, hudRoot: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.Fog(0xcfe6f6, 150, 780);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(860, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color(0x5ea7e0) },
          bottom: { value: new THREE.Color(0xe8f4fc) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vP;
          void main() {
            vP = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 top;
          uniform vec3 bottom;
          varying vec3 vP;
          void main() {
            float h = clamp(normalize(vP).y * 0.5 + 0.5, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    );
    sky.frustumCulled = false;
    this.sky = sky;
    this.scene.add(sky);

    const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x5a7040, 1.25);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe8c0, 2.4);
    sun.position.set(60, 110, -50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 320;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);

    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fovBase, window.innerWidth / window.innerHeight, 0.3, 900);

    this.road = new Road();
    this.scene.add(this.road.buildMeshes());

    for (let i = 0; i <= CONFIG.ai.count; i++) {
      const r = new Racer(i, RACER_NAMES[i], i === 0, RACER_COLORS[i]);
      r.view = createBike(RACER_COLORS[i]);
      r.cruiseV = CONFIG.bike.vmax * (0.84 + 0.026 * i + Math.random() * 0.02);
      this.scene.add(r.view.group);
      this.racers.push(r);
    }
    this.player = this.racers[0];

    for (let i = 0; i < CONFIG.traffic.maxCars; i++) {
      const c = new TrafficCar();
      c.view = createCar(CAR_COLORS[i % CAR_COLORS.length]);
      c.view.group.visible = false;
      this.scene.add(c.view.group);
      this.cars.push(c);
    }

    for (const r of this.racers) r.view!.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    for (const c of this.cars) c.view!.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });

    this.clouds = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    for (let i = 0; i < 10; i++) {
      const s = 200 + (i / 10) * (this.road.length - 400) + Math.random() * 200;
      const side = Math.random() < 0.5 ? -1 : 1;
      const off = side * (60 + Math.random() * 120);
      const puffs = 3 + Math.floor(Math.random() * 3);
      const cg = new THREE.Group();
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(6 + Math.random() * 6, 1), cloudMat);
        puff.position.set((p - puffs / 2) * 7 + Math.random() * 3, Math.random() * 2.5, Math.random() * 5 - 2.5);
        puff.scale.y = 0.55;
        cg.add(puff);
      }
      this.road.positionAt(s, off, cg.position);
      cg.position.y = 55 + Math.random() * 30;
      this.clouds.add(cg);
    }
    this.scene.add(this.clouds);

    this.particles = new Particles(this.scene);
    this.hud = new HUD(
      hudRoot,
      () => this.toggleMute(),
      () => this.startRace(),
      () => this.restart(),
    );

    this.input.attach();
    window.addEventListener('keydown', this.onUiKey);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onBlur);
    window.addEventListener('resize', this.onResize);

    this.placeGrid();
    this.snapCamera();
    this.exposeDebug();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ---------- lifecycle ----------

  private onUiKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      if (this.state === 'racing' || this.state === 'countdown') this.pause();
      else if (this.state === 'paused') this.resume();
    } else if (e.code === 'KeyM') {
      this.toggleMute();
    } else if (e.code === 'KeyR') {
      if (this.state === 'finished') this.restart();
    } else if (e.code === 'Enter') {
      if (this.state === 'menu') this.startRace();
      else if (this.state === 'finished') this.restart();
    }
  };

  private onBlur = () => {
    this.input.clear();
    if (document.hidden || window.document.hasFocus() === false) {
      if (this.state === 'racing' || this.state === 'countdown') this.pause();
    }
  };

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  toggleMute() {
    this.audio.setMuted(!this.audio.muted);
    this.hud.setMuteLabel(this.audio.muted);
  }

  startRace() {
    this.audio.init();
    this.audio.ui();
    this.reset();
  }

  restart() {
    this.audio.init();
    this.audio.ui();
    this.reset();
  }

  pause() {
    this.prevState = this.state;
    this.state = 'paused';
    this.input.clear();
    this.hud.show('pause');
    this.audio.suspend();
  }

  resume() {
    this.state = this.prevState;
    this.hud.show(this.state === 'countdown' ? 'countdown' : null);
    this.audio.resume();
    this.last = performance.now();
    this.acc = 0;
  }

  private placeGrid() {
    // road mesh starts at s=0, so the grid must sit on it, not before it
    this.player.reset(10, 3.6, 0);
    for (let i = 1; i < this.racers.length; i++) {
      const r = this.racers[i];
      r.reset(25 - (i - 1) * 3.5, i % 2 === 1 ? 2.0 : 5.2, 0);
      r.laneT = r.t;
    }
  }

  reset() {
    this.placeGrid();
    for (const r of this.racers) {
      if (r.view && r.view.riderGroup.parent !== r.view.group) {
        r.view.group.add(r.view.riderGroup);
        r.view.riderGroup.position.set(0, 0.92, -0.28);
        r.view.riderGroup.rotation.set(0, 0, 0);
      }
      if (r.view) r.view.group.visible = true;
    }
    this.input.consumePressed();
    for (const c of this.cars) {
      c.active = false;
      if (c.view) c.view.group.visible = false;
    }
    let s = 260;
    for (let k = 0; k < 6; k++) {
      s += 160 + Math.random() * 140;
      this.spawnCar(s);
    }
    this.particles.clear();
    this.shake = 0;
    this.raceTime = 0;
    this.countdownT = CONFIG.race.countdown;
    this.lastCount = -1;
    this.state = 'countdown';
    this.hud.show('countdown');
    this.acc = 0;
    this.snapCamera();
  }

  // ---------- traffic ----------

  private spawnCar(s: number, forcedT?: number) {
    const c = this.cars.find((x) => !x.active);
    if (!c) return;
    const lane = forcedT !== undefined ? forcedT : CONFIG.traffic.laneOffsets[Math.floor(Math.random() * 2)];
    for (const o of this.cars) {
      if (o.active && Math.abs(o.s - s) < 45 && Math.abs(o.t - lane) < 3) return;
    }
    c.active = true;
    c.s = s;
    c.t = lane;
    c.v = CONFIG.traffic.speedMin + Math.random() * (CONFIG.traffic.speedMax - CONFIG.traffic.speedMin);
    if (c.view) c.view.group.visible = true;
  }

  private updateTraffic(dt: number) {
    let ahead = 0;
    for (const c of this.cars) {
      if (!c.active) continue;
      if (c.s < this.player.s - CONFIG.traffic.despawnBehind) {
        c.active = false;
        if (c.view) c.view.group.visible = false;
        continue;
      }
      if (c.s > this.player.s) ahead++;
    }
    if (ahead < CONFIG.traffic.maxCars - 2 && Math.random() < dt * 1.5) {
      this.spawnCar(this.player.s + CONFIG.traffic.spawnMin + Math.random() * (CONFIG.traffic.spawnMax - CONFIG.traffic.spawnMin));
    }
  }

  // ---------- simulation ----------

  private step(dt: number) {
    if (this.state === 'countdown') {
      this.countdownT -= dt;
      const n = Math.ceil(this.countdownT);
      if (n !== this.lastCount) {
        this.lastCount = n;
        if (n > 0) {
          this.hud.setCountdown(String(n));
          this.audio.beep(false);
        }
      }
      if (this.countdownT <= 0) {
        this.state = 'racing';
        this.hud.setCountdown('GO!');
        this.goTimer = 0.8;
        this.input.consumePressed();
        this.audio.beep(true);
      }
      return;
    }
    if (this.state !== 'racing' && this.state !== 'finished') return;
    if (this.goTimer > 0) {
      this.goTimer -= dt;
      if (this.goTimer <= 0) this.hud.show(null);
    }
    if (this.state === 'racing') this.raceTime += dt;

    const pressed = this.input.consumePressed();
    const p = this.player;
    const racing = this.state === 'racing';
    if (p.state === 'race' && racing) {
      p.throttle = this.input.isDown('throttle') ? 1 : 0;
      p.brake = this.input.isDown('brake') ? 1 : 0;
      p.steerInput = p.hitStun > 0 ? 0 : (this.input.isDown('right') ? 1 : 0) - (this.input.isDown('left') ? 1 : 0);
      if (pressed.has('punchL')) startAttack(p, 'punchL');
      if (pressed.has('punchR')) startAttack(p, 'punchR');
      if (pressed.has('club')) startAttack(p, 'club');
    } else {
      p.throttle = 0;
      p.brake = 0;
      p.steerInput = 0;
    }

    const aggroCount = countAggro(this.racers);
    for (const r of this.racers) {
      if (!r.isPlayer) updateAI(r, { road: this.road, racers: this.racers, cars: this.cars, player: p, aggroCount, raceTime: this.raceTime }, dt);
      r.punchCd = Math.max(0, r.punchCd - dt);
      r.clubCd = Math.max(0, r.clubCd - dt);
      r.invuln = Math.max(0, r.invuln - dt);
      r.hitStun = Math.max(0, r.hitStun - dt);
      r.flash = Math.max(0, r.flash - dt);
      updateAttack(r, dt, this.racers, this.onHit, (sw, type) => this.audio.swing(type === 'club'));
    }

    const ev = newEvents();
    const sdt = dt / CONFIG.substeps;
    for (let k = 0; k < CONFIG.substeps; k++) {
      for (const r of this.racers) {
        if (r.state === 'race') this.integrateRace(r, sdt);
        else if (r.state === 'crashed') this.integrateCrash(r, sdt);
        else this.integrateFinished(r, sdt);
      }
      for (const c of this.cars) {
        if (c.active) c.s -= c.v * sdt;
      }
      collideBikesWithWorld(this.racers, this.cars, this.road, ev, (r) => this.crashRacer(r), (r, d) => this.damage(r, d));
    }
    for (const e of ev.scrape) {
      this.particles.spawn(e.pos, _col.set(0xffd76a), 6, 4);
      this.audio.scrapeHit();
      if (e.racer.isPlayer) this.addShake(0.18);
      this.scrapeTimer = 0.25;
    }
    for (const e of ev.spark) {
      this.particles.spawn(e.pos, _col.set(0xffb347), 5, 3);
    }
    for (const r of ev.crash) {
      void r;
    }

    this.updateTraffic(dt);

    // finish detection
    const finishS = this.road.length - CONFIG.track.finishOffset;
    for (const r of this.racers) {
      if (r.state === 'race' && r.s >= finishS) {
        r.state = 'finished';
        r.finishTime = this.raceTime;
        r.throttle = 0;
        if (r.isPlayer) this.endRace();
      }
    }
    this.particles.update(dt);
    this.scrapeTimer = Math.max(0, this.scrapeTimer - dt);
  }

  private integrateRace(r: Racer, dt: number) {
    const B = CONFIG.bike;
    const vmax = B.vmax * (r.isPlayer ? 1 : r.skill);
    if (r.throttle > 0) r.v += B.accel * dt * Math.max(0.25, 1 - r.v / B.vmax);
    else r.v -= B.drag * dt;
    if (r.brake > 0) r.v -= B.brake * dt;
    if (Math.abs(r.t) > CONFIG.track.roadHalf) {
      r.v -= B.offroadDrag * dt * Math.min(1, r.v / 12);
      if (r.isPlayer && r.v > 8) this.scrapeTimer = 0.1;
    }
    r.v = THREE.MathUtils.clamp(r.v, 0, vmax);
    r.steer += (r.steerInput - r.steer) * Math.min(1, B.steerSmooth * dt);
    const sf = Math.min(1, r.v / 15);
    const kappa = this.road.kappaAt(r.s);
    const drift = -kappa * r.v * r.v * B.driftCoef;
    r.tVel *= Math.exp(-6 * dt);
    r.t += (r.steer * B.steerSpeed * sf + drift) * dt + r.tVel * dt;
    r.s += r.v * dt;
  }

  private integrateFinished(r: Racer, dt: number) {
    r.v = Math.max(0, r.v - CONFIG.bike.drag * dt);
    r.s += r.v * dt;
    r.steer *= Math.exp(-3 * dt);
  }

  private integrateCrash(r: Racer, dt: number) {
    r.downTimer -= dt;
    r.bikeVS = Math.max(0, r.bikeVS - 13 * dt);
    r.s += r.bikeVS * dt;
    r.t += r.bikeVT * dt;
    r.bikeVT *= Math.exp(-2.5 * dt);
    r.tumble += dt * 5;
    r.riderVY -= 22 * dt;
    r.riderS += r.riderVS * dt;
    r.riderT += r.riderVT * dt;
    r.riderY += r.riderVY * dt;
    r.riderVS = Math.max(0, r.riderVS - 5 * dt);
    if (r.riderY <= 0) {
      r.riderY = 0;
      if (!r.riderBounced && Math.abs(r.riderVY) > 5) {
        r.riderBounced = true;
        r.riderVY = 3.2;
      } else {
        r.riderVY = 0;
        r.riderVS *= Math.max(0, 1 - 3.5 * dt);
        r.riderVT *= Math.max(0, 1 - 3.5 * dt);
        if (r.riderVS > 6 && Math.random() < 0.5) {
          this.road.positionAt(r.riderS, r.riderT, _v1);
          _v1.y += 0.3;
          this.particles.spawn(_v1, _col.set(0xffc46b), 2, 2, 1.5);
        }
      }
    }
    if (r.bikeVS > 7 && Math.random() < 0.6) {
      this.road.positionAt(r.s, r.t, _v1);
      _v1.y += 0.3;
      this.particles.spawn(_v1, _col.set(0xffb347), 2, 2, 1.5);
    }
    if (r.downTimer <= 0) this.respawn(r);
  }

  // ---------- combat / crash ----------

  private onHit = (attacker: Racer, target: Racer, type: AttackType) => {
    const spec = attackSpec(type);
    const dir = Math.sign(target.t - attacker.t) || (type === 'punchL' ? -1 : 1);
    target.tVel += dir * CONFIG.combat.knockT;
    target.v *= CONFIG.combat.knockV;
    target.hitStun = CONFIG.combat.hitStun;
    target.flash = 0.18;
    this.damage(target, spec.dmg);
    target.invuln = CONFIG.combat.hitInvuln;
    this.road.positionAt(target.s, target.t, _v1);
    _v1.y += 1.2;
    this.particles.spawn(_v1, _col.set(0xffffff), 8, 5);
    this.audio.hit();
    if (attacker.isPlayer || target.isPlayer) this.addShake(0.22);
  };

  private damage(r: Racer, dmg: number) {
    if (r.invuln > 0 || r.state !== 'race') return;
    r.hp -= dmg;
    if (r.hp <= 0) {
      r.hp = 0;
      this.crashRacer(r);
    }
  }

  private crashRacer(r: Racer) {
    if (r.state !== 'race' || !r.view) return;
    r.state = 'crashed';
    r.downTimer = r.isPlayer ? CONFIG.crash.playerDown : CONFIG.crash.aiDown;
    r.attack = null;
    r.pendingAttack = undefined;
    r.aggro = 'none';
    r.bikeVS = r.v * 0.55;
    r.bikeVT = (Math.random() - 0.5) * 3;
    r.tumble = 0;
    r.tumbleDir = Math.random() < 0.5 ? -1 : 1;
    r.riderS = r.s;
    r.riderT = r.t;
    r.riderY = 0.9;
    r.riderVS = r.v * 0.72;
    r.riderVT = (Math.random() - 0.5) * 4;
    r.riderVY = 6.5;
    r.riderBounced = false;
    this.scene.attach(r.view.riderGroup);
    this.road.positionAt(r.s, r.t, _v1);
    _v1.y += 1;
    this.particles.spawn(_v1, _col.set(0xff7043), 16, 6, 4);
    this.audio.crash();
    if (r.isPlayer) this.addShake(0.5);
  }

  private respawn(r: Racer) {
    if (!r.view) return;
    r.state = 'race';
    r.hp = CONFIG.crash.respawnHp;
    r.v = CONFIG.crash.respawnV;
    r.t = THREE.MathUtils.clamp(r.t, -CONFIG.bike.tClamp, CONFIG.bike.tClamp);
    if (r.t < 0.5) r.t = 3.6;
    r.tVel = 0;
    r.invuln = CONFIG.crash.respawnInvuln;
    r.laneT = r.t;
    r.aggro = 'none';
    r.attackCd = 2;
    r.view.group.add(r.view.riderGroup);
    r.view.riderGroup.position.set(0, 0.92, -0.28);
    r.view.riderGroup.rotation.set(0, 0, 0);
    r.view.group.visible = true;
  }

  private addShake(x: number) {
    this.shake = Math.min(0.6, this.shake + x);
  }

  // ---------- race end ----------

  private metric(r: Racer) {
    return r.state === 'finished' ? this.road.length * 2 - r.finishTime : r.s;
  }

  rankOf(r: Racer): number {
    const m = this.metric(r);
    let n = 1;
    for (const o of this.racers) if (o !== r && this.metric(o) > m) n++;
    return n;
  }

  private endRace() {
    this.state = 'finished';
    const sorted = [...this.racers].sort((a, b) => this.metric(b) - this.metric(a));
    const rows = sorted.map((r, i) => ({
      pos: i + 1,
      name: r.name,
      time: r.finishTime >= 0 ? this.fmt(r.finishTime) : `${Math.round((r.s / this.road.length) * 100)}%`,
      me: r.isPlayer,
    }));
    const myPos = sorted.indexOf(this.player) + 1;
    this.hud.showResults(rows, this.player.finishTime, myPos);
    this.hud.show('finish');
    this.audio.finish();
  }

  private fmt(t: number) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const d = Math.floor((t * 10) % 10);
    return `${m}:${s.toString().padStart(2, '0')}.${d}`;
  }

  // ---------- loop ----------

  private loop = (ts: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.last) this.last = ts;
    let dt = (ts - this.last) / 1000;
    this.last = ts;
    dt = Math.min(dt, 0.1);
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    if (this.state !== 'paused') {
      this.acc += dt;
      let iter = 0;
      while (this.acc >= CONFIG.step && iter < 5) {
        this.step(CONFIG.step);
        this.acc -= CONFIG.step;
        iter++;
      }
      if (iter === 5) this.acc = 0;
    }
    this.updateVisuals(dt);
    this.updateCamera(dt);
    this.updateHud();
    this.renderer.render(this.scene, this.camera);
  };

  private snapCamera() {
    const f = this.road.frameAt(this.player.s, this.frame);
    _v1.copy(f.pos).addScaledVector(f.right, this.player.t);
    this.camera.position.copy(_v1).addScaledVector(f.forward, -CONFIG.camera.dist);
    this.camera.position.y += CONFIG.camera.height;
    this.camera.lookAt(_v2.copy(_v1).addScaledVector(f.forward, CONFIG.camera.lookAhead));
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const f = this.road.frameAt(p.state === 'crashed' ? p.riderS : p.s, this.frame);
    const lat = p.state === 'crashed' ? p.riderT : p.t;
    const speedRatio = p.v / CONFIG.bike.vmax;
    _v1.copy(f.pos).addScaledVector(f.right, lat);
    if (p.state === 'crashed') {
      _v1.y += p.riderY + 0.6;
      _v2.copy(_v1).addScaledVector(f.forward, -6.5);
      _v2.y += 2.4;
    } else {
      _v2.copy(_v1).addScaledVector(f.forward, -(CONFIG.camera.dist + speedRatio * 3));
      _v2.y += CONFIG.camera.height + speedRatio * 0.5;
    }
    const k = 1 - Math.exp(-7 * dt);
    this.camera.position.lerp(_v2, k);
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.exp(-CONFIG.camera.shakeDecay * dt);
    }
    _v3.copy(_v1);
    if (p.state === 'crashed') _v3.y += 0.8;
    else _v3.addScaledVector(f.forward, CONFIG.camera.lookAhead).y += 1.3;
    this.camera.lookAt(_v3);
    const fov = CONFIG.camera.fovBase + CONFIG.camera.fovSpeed * speedRatio;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.sky.position.copy(this.camera.position);
    this.sun.position.copy(_v1).add(_v4.set(60, 110, -50));
    this.sun.target.position.copy(_v1);
    this.sun.target.updateMatrixWorld();
  }

  private updateVisuals(dt: number) {
    for (const r of this.racers) {
      const view = r.view;
      if (!view) continue;
      if (r.state === 'crashed') {
        const f = this.road.frameAt(r.s, scratchFrame);
        this.road.positionAt(r.s, r.t, _v1);
        view.group.position.copy(_v1);
        setOrientation(view.group, f.forward, f.up, r.tumbleDir * 1.45);
        view.group.rotateY(r.tumble * 0.6 * r.tumbleDir);
        const rf = this.road.frameAt(r.riderS, scratchFrame);
        this.road.positionAt(r.riderS, r.riderT, _v1);
        _v1.y += r.riderY + 0.35;
        view.riderGroup.position.copy(_v1);
        view.riderGroup.rotation.set(r.tumble * 1.4, r.tumble * 0.8, r.tumble * 0.5);
        void rf;
        this.setFlash(r, view);
        continue;
      }
      const f = this.road.frameAt(r.s, scratchFrame);
      this.road.positionAt(r.s, r.t, _v1);
      view.group.position.copy(_v1);
      const sf = Math.min(1, r.v / 35);
      const rollT = THREE.MathUtils.clamp(
        r.steer * 0.35 * sf + f.kappa * r.v * r.v * 0.014,
        -CONFIG.bike.rollMax,
        CONFIG.bike.rollMax,
      );
      r.roll += (rollT - r.roll) * Math.min(1, 6 * dt);
      const yaw = r.steer * 0.28;
      _q.setFromAxisAngle(f.up, -yaw);
      _v2.copy(f.forward).applyQuaternion(_q);
      setOrientation(view.group, _v2, f.up, r.roll);
      view.wheelF.rotation.x += (r.v * dt) / 0.36;
      view.wheelR.rotation.x += (r.v * dt) / 0.36;
      this.animateArms(r, dt);
      this.setFlash(r, view);
      view.group.visible = r.invuln > 0 ? Math.floor(performance.now() / 120) % 2 === 0 : true;
    }
    for (const c of this.cars) {
      if (!c.view) continue;
      if (!c.active) continue;
      const f = this.road.frameAt(c.s, scratchFrame);
      this.road.positionAt(c.s, c.t + Math.sin(this.raceTime * 0.7 + c.wobble) * 0.25, _v1);
      c.view.group.position.copy(_v1);
      _v2.copy(f.forward).multiplyScalar(-1);
      setOrientation(c.view.group, _v2, f.up, 0);
      const spin = (c.v * dt) / 0.38;
      for (const w of c.view.wheelF) w.rotation.x += spin;
      for (const w of c.view.wheelR) w.rotation.x += spin;
    }
  }

  private setFlash(r: Racer, view: { mats: THREE.MeshStandardMaterial[] }) {
    const e = r.flash > 0 ? 0.9 : 0;
    for (const m of view.mats) m.emissive.setScalar(e);
  }

  private animateArms(r: Racer, dt: number) {
    const view = r.view!;
    const idle = { x: 0.35, y: 0 };
    let l = { ...idle, y: -0.25 };
    let rr = { ...idle, y: 0.25 };
    const a = r.attack;
    if (a) {
      const spec = attackSpec(a.type);
      const t = a.t;
      let phase: number;
      if (t < spec.windup) phase = -0.6 * (t / spec.windup);
      else if (t < spec.windup + spec.active) phase = 1;
      else phase = 1 - (t - spec.windup - spec.active) / spec.recover;
      if (a.type === 'punchL') l = { x: 0.1 - phase * 0.35, y: -0.25 + phase * 0.7 };
      else if (a.type === 'punchR') rr = { x: 0.1 - phase * 0.35, y: 0.25 - phase * 0.7 };
      else rr = { x: 0.2, y: 0.25 - phase * 2.2 };
    }
    const k = Math.min(1, 18 * dt);
    view.armL.rotation.x += (l.x - view.armL.rotation.x) * k;
    view.armL.rotation.y += (l.y - view.armL.rotation.y) * k;
    view.armR.rotation.x += (rr.x - view.armR.rotation.x) * k;
    view.armR.rotation.y += (rr.y - view.armR.rotation.y) * k;
  }

  private floaters: FloaterData[] = [
    { x: 0, y: 0, name: '', hp01: 1, warn: false, visible: false },
    { x: 0, y: 0, name: '', hp01: 1, warn: false, visible: false },
    { x: 0, y: 0, name: '', hp01: 1, warn: false, visible: false },
    { x: 0, y: 0, name: '', hp01: 1, warn: false, visible: false },
    { x: 0, y: 0, name: '', hp01: 1, warn: false, visible: false },
  ];

  private updateHud() {
    const p = this.player;
    this.hud.update({
      speedKmh: p.v * 3.6,
      hp01: p.hp / CONFIG.combat.hp,
      rank: this.rankOf(p),
      total: this.racers.length,
      progress01: p.s / this.road.length,
      time: this.raceTime,
      punchCd01: 1 - p.punchCd / (attackSpec('punchL').windup + attackSpec('punchL').active + attackSpec('punchL').recover + CONFIG.combat.punch.cooldown),
      clubCd01: 1 - p.clubCd / (attackSpec('club').windup + attackSpec('club').active + attackSpec('club').recover + CONFIG.combat.club.cooldown),
    });
    let i = 0;
    for (const r of this.racers) {
      if (r.isPlayer) continue;
      const fl = this.floaters[i];
      i++;
      const dist = Math.abs(r.s - p.s);
      if (r.state === 'crashed' || dist > 45 || this.state === 'menu') {
        fl.visible = false;
        continue;
      }
      const f = this.road.frameAt(r.s, scratchFrame);
      this.road.positionAt(r.s, r.t, _v1);
      _v1.y += 2.2;
      _v1.project(this.camera);
      if (_v1.z > 1) {
        fl.visible = false;
        continue;
      }
      fl.visible = true;
      fl.x = ((_v1.x + 1) / 2) * window.innerWidth;
      fl.y = ((1 - _v1.y) / 2) * window.innerHeight;
      fl.name = r.name;
      fl.hp01 = r.hp / CONFIG.combat.hp;
      fl.warn = r.aggro === 'taunt' || r.aggro === 'attack' || !!r.attack;
      void f;
    }
    this.hud.setFloaters(this.floaters);
    const running = this.state === 'racing' || this.state === 'countdown';
    this.audio.setEngine(p.v / CONFIG.bike.vmax, p.throttle, running && p.state === 'race');
    this.audio.setScrape(this.scrapeTimer > 0 ? 1 : 0);
  }

  // ---------- debug ----------

  private exposeDebug() {
    const self = this;
    (window as unknown as Record<string, unknown>).__rr = {
      get state() {
        return self.state;
      },
      get fps() {
        return self.fps;
      },
      get raceTime() {
        return self.raceTime;
      },
      player: this.player,
      racers: this.racers,
      activeCars: () => this.cars.filter((c) => c.active).length,
      placeAIBeside: (side: number = -1) => {
        const a = this.racers[1];
        a.state = 'race';
        a.hold = true;
        a.s = this.player.s;
        a.t = this.player.t + side * 1.8;
        a.v = 0;
        a.aggro = 'none';
        a.hp = CONFIG.combat.hp;
      },
      aiAttack: () => {
        const a = this.racers[1];
        a.s = this.player.s;
        a.t = this.player.t - 1.6;
        a.v = this.player.v;
        a.aggro = 'taunt';
        a.aggroTimer = 0.3;
      },
      spawnCarAhead: () => {
        this.spawnCar(this.player.s + 130, THREE.MathUtils.clamp(this.player.t, -6, 6));
      },
      setS: (v: number) => {
        this.player.s = v;
      },
      hp: (i: number) => this.racers[i].hp,
      start: () => this.startRace(),
      road: this.road,
      camera: this.camera,
      scene: this.scene,
    };
  }
}
