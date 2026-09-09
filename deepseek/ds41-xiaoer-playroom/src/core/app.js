import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom } from '../world/room.js';
import { buildToys } from '../world/toys.js';
import { buildXiaoer } from '../character/character.js';
import { Animator } from '../character/animator.js';
import { Brain } from '../ai/brain.js';
import { buildObstacles, TOY_INFO, LAYOUT, CASTLE } from './layout.js';
import { PALETTE } from './materials.js';
import { clamp } from './tween.js';

const VIEWS = {
  default: { pos: [3.7, 2.35, 4.6], target: [0.1, 0.82, 0.45] },
  front: { pos: [0.2, 1.7, 5.4], target: [0, 0.85, 0.1] },
  top: { pos: [0.1, 6.6, 2.4], target: [0, 0.4, 0.2] },
  castle: { pos: [4.6, 2.1, 1.4], target: [2.15, 0.85, -1.4] },
};

export function createApp() {
  const canvas = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(0xf4e3cb, 16, 34);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(...VIEWS.default.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...VIEWS.default.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.85;
  controls.panSpeed = 0.7;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.85;
  controls.maxDistance = 13;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.47;
  controls.update();

  /* ---------------- 灯光 ---------------- */
  const hemi = new THREE.HemisphereLight(0xfff4e4, 0xe3cdb0, 1.45);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xfff1dd, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d6, 2.5);
  sun.position.set(-5.5, 8.5, 5.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 26;
  sun.shadow.camera.left = -4.3;
  sun.shadow.camera.right = 4.3;
  sun.shadow.camera.top = 4.3;
  sun.shadow.camera.bottom = -4.3;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 8;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0xdcecff, 0.5);
  fill.position.set(5, 4, -4);
  scene.add(fill);

  /* ---------------- 场景 ---------------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshBasicMaterial({ color: 0xf0dfc6, fog: true }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.14;
  ground.receiveShadow = true;
  scene.add(ground);

  buildRoom(scene);
  const toys = buildToys(scene);

  /* ---------------- 小二 ---------------- */
  const rig = buildXiaoer();
  scene.add(rig.root);
  const animator = new Animator(rig);

  /* ---------------- 点击标记 ---------------- */
  const marker = makeMarker();
  scene.add(marker.group);

  /* ---------------- 大脑 ---------------- */
  const hud = {
    text: document.getElementById('state-text'),
    dot: document.getElementById('state-dot'),
  };
  const brain = new Brain({
    rig,
    animator,
    targets: toys.targets,
    obstacles: buildObstacles(),
    scene,
    onState: (text, busy) => {
      hud.text.textContent = text;
      hud.dot.classList.toggle('busy', !!busy);
    },
  });

  // 出生时面向默认相机，这样第一眼就能看到小二的五官
  brain.yaw = Math.atan2(VIEWS.default.pos[0] - brain.pos.x, VIEWS.default.pos[2] - brain.pos.z);
  rig.root.rotation.y = brain.yaw;

  /* ---------------- 交互：悬停高亮 + 点击引导 ---------------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clickables = Object.values(toys.targets).map((t) => t.group);
  let hovered = null;
  let hoverScale = 1;
  const emissiveBackup = new Map();

  function setPointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pick(e) {
    setPointer(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(clickables, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o && !o.userData.toyId) o = o.parent;
    return o ? o.userData.toyId : null;
  }

  function highlight(group, on) {
    if (!group) return;
    group.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m.emissive) return;
        if (on) {
          if (!emissiveBackup.has(m)) emissiveBackup.set(m, m.emissive.getHex());
          m.emissive.setHex(0x4a3410);
        } else if (emissiveBackup.has(m)) {
          m.emissive.setHex(emissiveBackup.get(m));
        }
      });
    });
    if (!on) emissiveBackup.clear();
  }

  const evt = { down: 0, move: 0, up: 0, picked: 0, guided: 0 };
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => {
    evt.down++;
    downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointermove', (e) => {
    evt.move++;
    evt.last = [Math.round(e.clientX), Math.round(e.clientY)];
    if (downAt) return;
    const id = pick(e);
    if (id !== hovered) {
      highlight(hovered ? toys.targets[hovered].group : null, false);
      hovered = id;
      highlight(hovered ? toys.targets[hovered].group : null, true);
      canvas.style.cursor = id ? 'pointer' : 'grab';
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const dt = performance.now() - downAt.t;
    downAt = null;
    evt.up++;
    if (moved > 8 || dt > 1500) return; // 拖动视角 → 不算点击
    const id = pick(e);
    if (!id) return;
    evt.picked++;
    guide(id);
  });
  canvas.addEventListener('pointerleave', () => {
    if (hovered) highlight(toys.targets[hovered].group, false);
    hovered = null;
  });

  /* ---------------- 引导 ---------------- */
  function guide(id) {
    if (!toys.targets[id]) return;
    evt.guided++;
    brain.request(id);
    marker.show(toys.targets[id].spot);
    document.querySelectorAll('.toy-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.toy === id);
    });
  }

  // HUD 按钮
  const btnBox = document.getElementById('toy-buttons');
  Object.entries(TOY_INFO).forEach(([id, info]) => {
    const b = document.createElement('button');
    b.className = 'toy-btn';
    b.dataset.toy = id;
    b.textContent = `${info.emoji} ${info.label}`;
    b.title = `让小二去${info.action}`;
    b.addEventListener('click', () => guide(id));
    btnBox.appendChild(b);
  });

  /* ---------------- 视角预设 ---------------- */
  let camTarget = new THREE.Vector3().fromArray(VIEWS.default.target);
  let camGoal = new THREE.Vector3().fromArray(VIEWS.default.target);
  let camPosGoal = null;
  let camPosT = 0;

  function setView(name) {
    // “特写”视角是动态的：站在小二正前方看他的脸
    if (name === 'face') {
      const fx = Math.sin(brain.yaw);
      const fz = Math.cos(brain.yaw);
      const y = rig.root.position.y;
      camPosGoal = new THREE.Vector3(
        brain.pos.x + fx * 1.15 + 0.12,
        y + 0.86,
        brain.pos.z + fz * 1.15 + 0.12,
      );
      camGoal.set(brain.pos.x, y + 0.72, brain.pos.z);
      camPosT = 0;
      follow = false;
      return;
    }
    const v = VIEWS[name];
    if (!v) return;
    camPosGoal = new THREE.Vector3().fromArray(v.pos);
    camGoal.fromArray(v.target);
    camPosT = 0;
    follow = false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === '1') setView('default');
    if (e.key === '2') setView('front');
    if (e.key === '3') setView('top');
    if (e.key === '4') setView('castle');
    if (e.key === '5') setView('face');
    if (e.key === 'r' || e.key === 'R') setView('default');
  });

  /* ---------------- 主循环 ---------------- */
  let lastTime = performance.now();
  let follow = true;
  let frozen = false;
  controls.addEventListener('start', () => {
    follow = false;
  });

  function tick() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!frozen) brain.update(dt);

    // 视角：轻微跟随小二，同时保持房间中心可见
    if (follow) {
      const bx = brain.pos.x;
      const bz = brain.pos.z;
      const tx = clamp(bx * 0.42, -1.6, 1.6);
      const tz = clamp(bz * 0.42, -1.6, 1.6);
      camGoal.set(tx, 0.75, tz);
    }
    if (camPosGoal) {
      camPosT = Math.min(1, camPosT + dt * 1.6);
      const k = camPosT * camPosT * (3 - 2 * camPosT);
      camera.position.lerp(camPosGoal, 1 - Math.exp(-6 * dt));
      if (camPosT >= 1) camPosGoal = null;
      camTarget.lerp(camGoal, 1 - Math.exp(-6 * dt));
      controls.target.copy(camTarget);
      controls.update();
    } else {
      camTarget.lerp(camGoal, 1 - Math.exp(-3.2 * dt));
      controls.target.copy(camTarget);
      controls.update();
    }

    marker.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  /* ---------------- 尺寸 ---------------- */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------- 调试接口 ---------------- */
  const debug = {
    brain,
    scene,
    camera,
    controls,
    toys,
    rig,
    views: [...Object.keys(VIEWS), 'face'],
    events: evt,
    get hoveredId() {
      return hovered;
    },
    setView,
    guide,
    snapshot() {
      return {
        ...brain.debug(),
        camera: {
          pos: camera.position.toArray().map((n) => +n.toFixed(2)),
          target: controls.target.toArray().map((n) => +n.toFixed(2)),
        },
        render: {
          frame: renderer.info.render.frame,
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        },
      };
    },
    /** 调试 / 截图用：冻结模拟，画面停在这一帧 */
    freeze(v) {
      frozen = v !== false;
      return frozen;
    },
    /** 调试 / 截图用：直接设定相机，不参与跟随 */
    setCamera(pos, target) {
      follow = false;
      camera.position.set(pos[0], pos[1], pos[2]);
      camGoal.set(target[0], target[1], target[2]);
      camTarget.set(target[0], target[1], target[2]);
      controls.target.set(target[0], target[1], target[2]);
      camPosGoal = null;
      // 暂时关掉阻尼，让相机立刻落到指定位置
      const damp = controls.enableDamping;
      controls.enableDamping = false;
      camera.updateMatrixWorld(true);
      controls.update();
      controls.enableDamping = damp;
    },
    /** 调试用：把世界坐标投影到屏幕像素 */
    project(x, y, z) {
      camera.updateMatrixWorld(true);
      const v = new THREE.Vector3(x, y, z).project(camera);
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
      };
    },
    /** 调试用：某个屏幕像素打到了哪些玩具 */
    pickAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster
        .intersectObjects(clickables, true)
        .slice(0, 3)
        .map((h) => ({ id: h.object.userData.toyId || null, dist: +h.distance.toFixed(2) }));
    },
    /** 测试用：以固定步长确定性推进模拟（不依赖 rAF） */
    advance(seconds, step = 1 / 60) {
      const n = Math.min(20000, Math.round(seconds / step));
      for (let i = 0; i < n; i++) brain.update(step);
      return debug.snapshot();
    },
    /** 把所有玩具的位置和障碍物信息导出来，方便核对 */
    layout() {
      return {
        spots: Object.fromEntries(
          Object.entries(toys.targets).map(([k, t]) => [k, { x: +t.spot.x.toFixed(2), z: +t.spot.z.toFixed(2) }]),
        ),
        castle: CASTLE,
        ball: LAYOUT.ball,
      };
    },
  };
  window.__playroom = debug;

  tick();

  // 场景就绪 → 收起加载层
  requestAnimationFrame(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  });

  return debug;
}

/* ================================================================== *
 * 小工具
 * ================================================================== */

function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#fffaf2');
  g.addColorStop(0.45, '#fdf0dd');
  g.addColorStop(1, '#eed8b8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMarker() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: PALETTE.yellow, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.022, 8, 32), mat);
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 24),
    new THREE.MeshBasicMaterial({ color: PALETTE.yellowSoft, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  inner.rotation.x = -Math.PI / 2;
  g.add(inner);
  g.visible = false;
  g.renderOrder = 3;

  let life = 0;
  return {
    group: g,
    show(pos) {
      g.position.set(pos.x, 0.02, pos.z);
      g.visible = true;
      life = 1.4;
    },
    update(dt) {
      if (!g.visible) return;
      life -= dt;
      const k = clamp(life / 1.4, 0, 1);
      const pulse = 1 + Math.sin((1 - life) * 9) * 0.08;
      g.scale.setScalar(pulse);
      ring.material.opacity = 0.9 * k;
      inner.material.opacity = 0.35 * k;
      if (life <= 0) g.visible = false;
    },
  };
}
