import * as THREE from 'three';
import {
  makePaperTexture,
  makeHatchTexture,
  makeCrossHatchTexture,
  makeShadowTexture,
  makeSplatTexture,
  makeInkDotTexture,
  makeMuzzleTexture,
  makeSlashTexture,
  PAPER_COLOR,
} from './core/textures.js';
import { initDoodle, updateBoil, boilCount } from './core/doodle.js';
import { Input } from './core/input.js';
import { resumeAudio } from './core/audio.js';
import { buildWorld } from './game/world.js';
import { Player } from './game/player.js';
import { Effects } from './game/effects.js';
import { Weapons } from './game/weapons.js';
import { Hud } from './game/hud.js';
import { Game } from './game/game.js';

// ------------------------------------------------------------ 渲染器
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(PAPER_COLOR, 1);

// ------------------------------------------------------------ 场景
const scene = new THREE.Scene();
scene.background = PAPER_COLOR.clone();
scene.fog = new THREE.Fog(PAPER_COLOR.clone(), 26, 78);

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.04, 220);
camera.rotation.order = 'YXZ';
scene.add(camera);

// 光照只作用于 Lambert 材质（场景实体），涂鸦线条和 UI 不受影响
const hemi = new THREE.HemisphereLight(0xfffaf0, 0xcfc4a8, 2.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(8, 16, 6);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
fill.position.set(-10, 8, -8);
scene.add(fill);

// ------------------------------------------------------------ 贴图
const textures = {
  paper: makePaperTexture(2048, 64),
  hatch: makeHatchTexture(128, -42, 9, 2.1, 0.3),
  crossHatch: makeCrossHatchTexture(128),
  shadow: makeShadowTexture(256),
  dot: makeInkDotTexture(64),
  muzzle: makeMuzzleTexture(256),
  slash: makeSlashTexture(256),
  splatInk: makeSplatTexture('#1f3d8c', 256, 11),
  splatRed: makeSplatTexture('#d8402f', 256, 7),
  splatInk2: makeSplatTexture('#3b2f6b', 256, 23),
};
scene.userData.paperTexture = textures.paper;
scene.userData.shadowTexture = textures.shadow;
initDoodle(textures.hatch, textures.crossHatch);

// ------------------------------------------------------------ 世界与角色
const world = buildWorld(scene);
const player = new Player(world, camera);
const effects = new Effects(scene, textures);
const hud = new Hud();
const input = new Input(canvas);
const weapons = new Weapons(camera, textures, effects, hud);
const game = new Game({ scene, camera, world, player, weapons, effects, hud, input });

// 按钮 / 背景点击
hud.onStart(() => game.start());
hud.el.overlay.addEventListener('click', () => game.start());

// 首次点击解锁音频
window.addEventListener('pointerdown', () => resumeAudio(), { once: false });

// ------------------------------------------------------------ 自适应
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------ 主循环
let last = performance.now();
let frames = 0;
let autoUpdate = true;
let fpsEMA = 60;
let frameMsEMA = 16.7;

function frame(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;

  if (raw > 0) {
    fpsEMA += (1 / raw - fpsEMA) * 0.05;
    frameMsEMA += (raw * 1000 - frameMsEMA) * 0.05;
  }

  if (autoUpdate) game.update(dt);
  updateBoil(dt);
  renderer.render(scene, camera);
  frames++;

  requestAnimationFrame(frame);
}

// 先渲染一帧，再撤掉 loading
hud.setHealth(player.health, player.maxHealth);
hud.setWeapon(weapons.def, weapons.ammoNow);
hud.setWeaponIndex(weapons.index);
hud.setKills(0);
hud.setThreat(0);
renderer.render(scene, camera);
requestAnimationFrame(frame);
setTimeout(() => hud.hideLoading(), 260);

// ------------------------------------------------------------ 调试 / 测试接口
const v3 = (o) => ({ x: +o.x.toFixed(3), y: +o.y.toFixed(3), z: +o.z.toFixed(3) });

window.__GAME__ = {
  version: '1.0.0',
  get state() {
    return game.state;
  },
  start() {
    input.forceLook = true; // 无头环境拿不到指针锁定也能转视角
    game.start();
  },
  restart() {
    input.forceLook = true;
    game.restart();
  },
  pause() {
    game.pause();
  },
  step(dt = 1 / 60, n = 1) {
    for (let i = 0; i < n; i++) {
      game.update(dt);
      updateBoil(dt);
    }
  },
  render() {
    renderer.render(scene, camera);
  },
  /** 关掉自动步进，测试里用 step() 精确控制时间 */
  setAutoUpdate(v) {
    autoUpdate = !!v;
  },
  /** 渲染开销 / 帧率，用来判断性能 */
  perf() {
    return {
      fps: +fpsEMA.toFixed(1),
      frameMs: +frameMsEMA.toFixed(2),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      boilTargets: boilCount(),
      frame: frames,
    };
  },
  key(code, down = true) {
    input.setKey(code, down);
  },
  tap(code) {
    input.setKey(code, true);
    game.update(1 / 60);
    input.setKey(code, false);
  },
  look(dx, dy) {
    input.addLook(dx, dy);
  },
  aimAt(x, y, z) {
    const p = player;
    const ex = p.body.x;
    const ey = p.visualY + p.eye;
    const ez = p.body.z;
    const dx = x - ex;
    const dy = y - ey;
    const dz = z - ez;
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    p.recoilPitch = 0;
    p.recoilYaw = 0;
    p.updateCamera();
  },
  teleport(x, y, z) {
    player.body.x = x;
    player.body.y = y ?? player.body.y;
    player.body.z = z;
    player.body.vy = 0;
    player.visualY = player.body.y;
    player.updateCamera();
  },
  fire() {
    input.mouseDown = true;
    input.mousePressed = true;
  },
  release() {
    input.mouseDown = false;
  },
  selectWeapon(i) {
    weapons.select(i);
  },
  reload() {
    weapons.startReload();
  },
  refill() {
    weapons.refill();
  },
  setAmmo(i, mag, reserve) {
    if (!weapons.ammo[i]) return;
    if (mag !== undefined) weapons.ammo[i].mag = mag;
    if (reserve !== undefined) weapons.ammo[i].reserve = reserve;
    weapons.hud && weapons.hud.setWeapon(weapons.def, weapons.ammoNow);
  },
  damage(n) {
    player.hurt(n);
  },
  killPlayer() {
    player.hurtCooldown = 0;
    player.hurt(9999);
    game.update(1 / 60);
  },
  spawnEnemy(x, z) {
    const e = game.spawnEnemy(true);
    if (e && x !== undefined) {
      e.body.x = x;
      e.body.z = z;
      e.body.y = 0;
      e.group.position.set(x, 0, z);
      e.updateHitbox();
    }
    return e ? e.id : null;
  },
  clearEnemies() {
    for (const e of game.enemies) e.dispose();
    game.enemies.length = 0;
  },
  /** 一次性快照，方便断言 */
  snapshot() {
    return {
      state: game.state,
      kills: game.kills,
      wave: game.wave,
      elapsed: +game.elapsed.toFixed(2),
      accuracy: game.stats.shots ? game.stats.hits / game.stats.shots : 0,
      shots: game.stats.shots,
      hits: game.stats.hits,
      player: {
        ...v3(player.body),
        hp: +player.health.toFixed(2),
        alive: player.alive,
        onGround: player.body.onGround,
        yaw: +player.yaw.toFixed(4),
        pitch: +player.pitch.toFixed(4),
      },
      weapon: {
        index: weapons.index,
        id: weapons.def.id,
        name: weapons.def.name,
        mag: weapons.ammoNow.mag,
        reserve: weapons.ammoNow.reserve,
        reloading: weapons.reloading,
      },
      enemies: game.enemies.map((e) => ({
        id: e.id,
        ...v3(e.body),
        hp: +e.health.toFixed(1),
        dead: e.dead,
        state: e.state,
      })),
      decals: effects.decals.filter((d) => d.life > 0).length,
      particles: effects.particles.filter((p) => p.life > 0).length,
      colliders: world.colliders.length,
      frame: frames,
    };
  },
  /** 检查某个点是否被墙挡住（射线） */
  rayBlocked(ax, ay, az, bx, by, bz) {
    return game.lineBlocked(ax, ay, az, bx, by, bz);
  },
  /** 检查一个坐标是否在某个碰撞体内部（用于碰撞验证） */
  insideSolid(x, y, z) {
    for (const b of world.colliders) {
      if (b.tag === 'ground') continue;
      if (
        x > b.min.x && x < b.max.x &&
        y > b.min.y && y < b.max.y &&
        z > b.min.z && z < b.max.z
      ) return b.tag;
    }
    return null;
  },
  groundHeight(x, z) {
    let top = 0;
    for (const b of world.colliders) {
      if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z) {
        if (b.max.y > top && b.max.y < 40) top = b.max.y;
      }
    }
    return top;
  },
};

window.__READY__ = true;
console.log('[ds41-doodle-fps] ready', game.state);
