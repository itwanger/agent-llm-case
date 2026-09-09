import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createIcons,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Expand,
  Heart,
  House,
  Leaf,
  Maximize2,
  Moon,
  Move,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scan,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide';
import './style.css';
import { createRoom } from './world/room';
import { createToys } from './toys/registry';
import { Xiaoer } from './character/Xiaoer';
import { Director } from './systems/director';
import { RoomAudio } from './systems/audio';
import type { Toy } from './toys/types';

const icon = (name: string, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
const avatar = `<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="40" fill="#e9e9d6"/><path d="M15 80v-5c0-18 50-18 50 0v5" fill="#8ea17f"/><ellipse cx="40" cy="42" rx="24" ry="25" fill="#edc39c"/><ellipse cx="16" cy="43" rx="5" ry="7" fill="#edc39c"/><ellipse cx="64" cy="43" rx="5" ry="7" fill="#edc39c"/><path d="M15 36c-2-25 42-34 49-7l1 10-9-8-7 3-8-8-9 7-6-4-11 7" fill="#42362e"/><circle cx="32" cy="42" r="2.8" fill="#42362e"/><circle cx="49" cy="42" r="2.8" fill="#42362e"/><circle cx="25" cy="50" r="4" fill="#dfa78c"/><circle cx="55" cy="50" r="4" fill="#dfa78c"/><path d="M36 53q5 5 10 0" stroke="#ac735b" stroke-width="2" stroke-linecap="round"/><path d="M26 70v10M54 70v10" stroke="#f3e9cb" stroke-width="4"/></svg>`;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
 <header class="header">
  <a class="brand" href="./" aria-label="小二的游乐时光，首页"><span class="brand-mark">${icon('sun')}</span><span class="brand-name">小二的游乐时光<span>LITTLE DAYS · BIG WONDERS</span></span></a>
  <nav class="top-nav" aria-label="房间导航"><button class="nav-item selected" id="room-tab">${icon('house')}<span>游乐空间</span></button><button class="nav-item" id="journal-open">${icon('book-open')}<span>成长小记</span><span class="new-dot"></span></button></nav>
  <div class="header-actions"><span class="live-label"><span></span>让好奇心自由生长</span><button class="icon-button sound-button" id="sound" aria-label="开启环境声音" title="开启环境声音">${icon('volume-x')}</button><button class="icon-button" id="help" aria-label="操作说明" title="操作说明">${icon('circle-help')}</button></div>
 </header>
 <main>
  <section class="world" aria-label="可旋转缩放的小二三维玩具房">
   <div id="scene"></div>
   <div class="introduction"><div class="eyebrow"><span></span>小二的第 730 天</div><h1>小小世界，<br/>大大<span class="serif-accent">好奇</span><span class="heading-flower">✳</span></h1><p>阳光刚刚好，玩耍慢慢来。<br/>今天，也有好多新发现。</p><div class="room-note">${icon('leaf')} 60 m² 的自在小天地</div></div>
   <div class="ambience"><span class="ambience-caption">此刻的房间</span><div class="segmented" aria-label="房间光照"><button id="day" class="active" aria-pressed="true">${icon('sun')} 暖暖午后</button><button id="night" aria-pressed="false">${icon('moon')} 静谧傍晚</button></div></div>
   <aside class="status-card"><div class="status-top"><div class="avatar">${avatar}<span class="online-dot"></span></div><div><div class="character-name">小二 <span>2 岁</span></div><div class="mood">今天也是好奇宝宝 ${icon('sparkles')}</div></div><span class="tiny-dots">···</span></div><div class="status-divider"></div><div class="activity-line"><span class="activity-pulse"></span><span id="activity">正在发现新乐趣</span><span id="activity-emoji">✧</span></div><div class="progress-track"><div id="activity-progress"></div></div><p class="activity-note" id="activity-note">不用着急，让小二自己探索吧。</p><div class="status-bottom"><span>自主探索</span><button class="switch on" id="auto" role="switch" aria-checked="true" aria-label="自主探索"><span></span></button></div></aside>
   <div class="character-bubble" id="bubble"><span>你好呀，我是小二！</span><span class="bubble-spark">✦</span></div>
   <div class="scene-bottom"><div class="scene-badge"><span class="badge-sun">${icon('sun')}</span><span><b id="weather-title">日光慢慢，快乐长长</b><small id="weather-subtitle">一个不赶时间的午后</small></span></div><div class="camera-controls"><button id="follow" class="camera-pill" aria-pressed="false">${icon('scan')}<span>跟随小二</span></button><div class="control-group"><button id="zoom-in" class="icon-button" aria-label="放大" title="放大">${icon('plus')}</button><span></span><button id="zoom-out" class="icon-button" aria-label="缩小" title="缩小">${icon('zoom-out')}</button><span></span><button id="reset-view" class="icon-button" aria-label="重置视角" title="重置视角">${icon('rotate-ccw')}</button></div><button id="capture" class="icon-button capture-button" aria-label="保存房间截图" title="保存房间截图">${icon('arrow-down-to-line')}</button></div></div>
   <div class="loading" id="loading"><span class="loading-sun">✳</span><p>把阳光装进小二的房间…</p></div>
  </section>
  <section class="toy-dock" aria-label="选择玩具"><div class="dock-heading"><div><span class="section-kicker">PLAY & DISCOVER</span><h2>今天，玩点什么<span>？</span></h2></div><p>选一个玩具，看看小二的新发现</p><button class="shuffle-button" id="surprise">${icon('sparkles')} 给小二一个惊喜 ${icon('arrow-right')}</button></div><div class="toy-list" id="toy-list"></div></section>
 </main>
 <footer><span><span class="footer-dot"></span> 每一次玩耍，都是一次小小的成长。</span><div><span>${icon('move')} 拖动旋转</span><span>${icon('zoom-in')} 滚轮缩放</span><button id="pause">${icon('pause')} 暂停时光</button></div><span class="footer-brand">MADE FOR LITTLE WONDERS</span></footer>
 <div class="toast" id="toast" role="status"></div>
 <dialog id="modal"><button class="modal-close icon-button" id="modal-close" aria-label="关闭">${icon('x')}</button><div id="modal-content"></div></dialog>
`;
const icons = {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Expand,
  Heart,
  House,
  Leaf,
  Maximize2,
  Moon,
  Move,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scan,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
};
const refreshIcons = () => createIcons({ icons, attrs: { 'stroke-width': 1.6 } });
refreshIcons();
const container = document.querySelector<HTMLDivElement>('#scene')!;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
container.appendChild(renderer.domElement);
renderer.domElement.setAttribute(
  'aria-label',
  '小二在温暖的玩具房里玩耍。拖动旋转，滚轮缩放，点击玩具邀请小二。',
);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
const homePosition = new THREE.Vector3(10.8, 8.85, 12.7),
  homeTarget = new THREE.Vector3(-0.05, 0.7, 0);
camera.position.copy(homePosition);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(homeTarget);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 5;
controls.maxDistance = 29;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minPolarAngle = 0.2;
controls.enablePan = true;
controls.panSpeed = 0.6;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.8;
const ambient = new THREE.HemisphereLight('#fffcdf', '#b7b599', 1.9);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#fff0c7', 3.15);
sun.position.set(-3, 9, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9;
sun.shadow.camera.bottom = -9;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 30;
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.0003;
sun.shadow.radius = 4;
scene.add(sun);
const fill = new THREE.DirectionalLight('#e8f0df', 1.35);
fill.position.set(5, 5, -2);
scene.add(fill);
const warm = new THREE.PointLight('#ffc777', 0, 13, 2);
warm.position.set(-2.2, 2.7, -2.7);
scene.add(warm);
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ color: '#7f8069', opacity: 0.14 }),
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -0.395;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);
createRoom(scene);
const toys = createToys();
toys.forEach((toy) => {
  toy.root.position.set(...toy.position);
  toy.root.userData.toyId = toy.id;
  scene.add(toy.root);
});
const actor = new Xiaoer();
scene.add(actor.root);
const director = new Director(actor, toys),
  audio = new RoomAudio();
let night = false,
  following = false,
  toastTimer: ReturnType<typeof setTimeout>,
  lastUI = 0;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
function toast(message: string) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
}
function resize() {
  const w = container.clientWidth,
    h = container.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = w < 760 ? 58 : 36;
  camera.setViewOffset(w, h, 0, w < 760 ? -h * 0.1 : 0, w, h);
  camera.updateProjectionMatrix();
  if (w < 760) {
    camera.position.copy(homeTarget).add(homePosition.clone().sub(homeTarget).multiplyScalar(1.12));
  }
  sun.shadow.mapSize.set(w < 760 ? 1024 : 2048, w < 760 ? 1024 : 2048);
}
new ResizeObserver(resize).observe(container);
resize();

// Generate honest thumbnails from the same toy models used by the room.
function thumbnails() {
  const thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  thumbRenderer.setSize(160, 130);
  thumbRenderer.setPixelRatio(1.5);
  thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
  thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  thumbRenderer.toneMappingExposure = 1.25;
  const thumbs = new Map<string, string>();
  toys.forEach((toy) => {
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight('#fff4df', '#bbc0a6', 3));
    const light = new THREE.DirectionalLight('#fff8e2', 3);
    light.position.set(-3, 5, 4);
    s.add(light);
    const model = toy.build().root;
    s.add(model);
    const bounds = new THREE.Box3().setFromObject(model),
      center = bounds.getCenter(new THREE.Vector3()),
      size = bounds.getSize(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z) * 0.8;
    const cam = new THREE.OrthographicCamera(
      -extent * 1.23,
      extent * 1.23,
      extent,
      -extent,
      0.01,
      50,
    );
    cam.position.copy(center).add(new THREE.Vector3(3, 2.5, 4));
    cam.lookAt(center);
    thumbRenderer.render(s, cam);
    thumbs.set(toy.id, thumbRenderer.domElement.toDataURL());
  });
  thumbRenderer.dispose();
  return thumbs;
}
const thumbs = thumbnails();
$('toy-list').innerHTML = toys
  .map(
    (toy, i) =>
      `<button class="toy-card" data-toy="${toy.id}" aria-label="邀请小二玩${toy.name}" aria-pressed="false"><span class="toy-index">0${i + 1}</span><span class="toy-art" style="--toy-color:${toy.color}"><img src="${thumbs.get(toy.id)}" alt="${toy.name}的三维模型"/></span><span class="toy-name">${toy.name}</span><span class="toy-description">${toy.subtitle}</span><span class="toy-check">${icon('check')}</span></button>`,
  )
  .join('');
refreshIcons();
function choose(toy: Toy) {
  if (director.choose(toy)) {
    toast(
      director.current?.id === toy.id
        ? `小二要去玩${toy.name}啦`
        : '等小二安全下来，就去玩下一个玩具',
    );
  } else toast('这边暂时过不去，试试另一个玩具吧。');
}
document
  .querySelectorAll<HTMLButtonElement>('[data-toy]')
  .forEach(
    (button) => (button.onclick = () => choose(toys.find((t) => t.id === button.dataset.toy)!)),
  );
const actionLabels: Record<string, string> = {
  stack: '正在认真搭积木',
  read: '正在翻看小绘本',
  music: '正在敲出小旋律',
  hug: '正在抱抱好朋友',
  ball: '正在和皮球做游戏',
  climb: '正在探索小城堡',
  ride: '正在摇呀摇木马',
};
const thoughts: Record<string, string> = {
  stack: '再放一块，就更高啦！',
  read: '小兔子后来去哪儿了？',
  music: '叮叮咚咚，听我弹琴～',
  hug: '小熊，最喜欢你啦。',
  ball: '小皮球，等等我！',
  climb: '我可以自己爬上去！',
  ride: '驾！我们去冒险～',
};
function updateUI() {
  const toy = director.current;
  const state = director.state;
  $('activity').textContent = director.paused
    ? '时光暂停，休息一下'
    : toy
      ? state === 'walking'
        ? `正在走向${toy.name}`
        : state === 'playing'
          ? actionLabels[toy.action]
          : '刚刚又有了一个新发现'
      : '正在发现新乐趣';
  $('activity-note').textContent = toy ? toy.subtitle : '不用着急，让小二自己探索吧。';
  $('bubble').querySelector('span')!.textContent = director.paused
    ? '休息一下，等会儿再玩～'
    : toy
      ? state === 'walking'
        ? '去那边看看！'
        : thoughts[toy.action]
      : '你好呀，我是小二！';
  document.querySelectorAll<HTMLButtonElement>('[data-toy]').forEach((el) => {
    const active = el.dataset.toy === toy?.id;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  });
  $('pause').innerHTML =
    icon(director.paused ? 'play' : 'pause') + (director.paused ? '继续时光' : '暂停时光');
  $('auto').classList.toggle('on', director.auto);
  $('auto').setAttribute('aria-checked', String(director.auto));
  refreshIcons();
}
director.onChange = updateUI;
interface MemoryEntry {
  name: string;
  description: string;
  time: string;
}
const entries: MemoryEntry[] = [];
director.onComplete = (toy) => {
  entries.unshift({
    name: toy.name,
    description: thoughts[toy.action],
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  });
  if (entries.length > 50) entries.pop();
};
$('surprise').onclick = () => {
  director.random();
  toast('让好奇心来选，下一个快乐出发！');
};
$('pause').onclick = () => director.togglePause();
$('auto').onclick = () => {
  director.auto = !director.auto;
  updateUI();
  toast(director.auto ? '小二会自己挑选下一个玩具' : '自主探索已关闭，可以手动挑选玩具');
};
$('sound').onclick = async () => {
  try {
    const enabled = await audio.toggle();
    $('sound').innerHTML = icon(enabled ? 'volume-2' : 'volume-x');
    $('sound').setAttribute('aria-label', enabled ? '关闭环境声音' : '开启环境声音');
    $('sound').title = enabled ? '关闭环境声音' : '开启环境声音';
    $('sound').classList.toggle('enabled', enabled);
    refreshIcons();
    toast(enabled ? '轻轻的音乐，让房间更温暖' : '环境声音已关闭');
  } catch {
    toast('当前浏览器暂时无法播放声音');
  }
};
function setNight(value: boolean) {
  night = value;
  document.body.classList.toggle('evening', night);
  $('day').classList.toggle('active', !night);
  $('night').classList.toggle('active', night);
  $('day').setAttribute('aria-pressed', String(!night));
  $('night').setAttribute('aria-pressed', String(night));
  $('weather-title').textContent = night ? '暮色轻轻，小梦甜甜' : '日光慢慢，快乐长长';
  $('weather-subtitle').textContent = night ? '把今天的快乐，慢慢收藏' : '一个不赶时间的午后';
}
$('day').onclick = () => setNight(false);
$('night').onclick = () => setNight(true);
function zoom(factor: number) {
  const offset = camera.position.clone().sub(controls.target);
  const length = THREE.MathUtils.clamp(
    offset.length() * factor,
    controls.minDistance,
    controls.maxDistance,
  );
  camera.position.copy(controls.target).add(offset.setLength(length));
  controls.update();
}
$('zoom-in').onclick = () => zoom(0.84);
$('zoom-out').onclick = () => zoom(1.18);
function setFollow(value: boolean) {
  following = value;
  $('follow').classList.toggle('active', following);
  $('follow').setAttribute('aria-pressed', String(following));
}
$('follow').onclick = () => {
  setFollow(!following);
  if (following) toast('镜头会轻轻跟着小二移动');
};
function resetView() {
  setFollow(false);
  controls.target.copy(homeTarget);
  camera.position.copy(homeTarget).add(
    homePosition
      .clone()
      .sub(homeTarget)
      .multiplyScalar(container.clientWidth < 760 ? 1.12 : 1),
  );
  controls.update();
}
$('reset-view').onclick = resetView;
$('room-tab').onclick = resetView;
controls.addEventListener('start', () => {
  setFollow(false);
});
$('capture').onclick = () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.download = `小二的游乐时光-${Date.now()}.png`;
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
  toast('这一刻的快乐，已经保存啦');
};
const modal = $<HTMLDialogElement>('modal');
function showModal(content: string) {
  $('modal-content').innerHTML = content;
  modal.showModal();
  refreshIcons();
}
$('modal-close').onclick = () => modal.close();
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      modal.close();
  }
});
$('help').onclick = () =>
  showModal(
    `<span class="modal-eyebrow">A LITTLE GUIDE</span><h2>欢迎来到小二的世界</h2><p>不用安排，也不用赶时间。陪小二一起发现平凡日子里的小小快乐。</p><div class="help-grid"><div>${icon('move')}<b>转一转</b><span>按住鼠标左键拖动<br/>触屏用单指拖动</span></div><div>${icon('zoom-in')}<b>靠近一点</b><span>滚动鼠标滚轮<br/>触屏用双指缩放</span></div><div>${icon('heart')}<b>一起玩吧</b><span>点击场景中的玩具<br/>或下方的玩具卡片</span></div><div>${icon('scan')}<b>跟着小二</b><span>开启跟随视角<br/>捕捉每一个小发现</span></div></div><p class="modal-footnote">空格：暂停 / 继续　·　H：回到初始视角<br/>关闭自主探索后，小二会完成当前活动，然后等你选择。</p>`,
  );
$('journal-open').onclick = () =>
  showModal(
    `<span class="modal-eyebrow">LITTLE MOMENTS</span><h2>成长，藏在小事里。</h2><p>今天已经探索了 <b>${director.completed.size}</b> 种玩具，<br/>在这个小世界里度过了 <b>${Math.floor(director.totalTime / 60)}</b> 分钟。</p><div class="journal-list">${entries.length ? entries.map((e) => `<div><span class="journal-dot"></span><section><b>${e.name}</b><p>${e.description}</p></section><time>${e.time}</time></div>`).join('') : `<div class="journal-empty">${icon('leaf')}<p>第一段玩耍结束后，<br/>小二的新发现就会记在这里。</p></div>`}</div><p class="modal-footnote">这里记录本次打开房间的小小发现。</p>`,
  );
window.addEventListener('keydown', (e) => {
  if (modal.open || e.target instanceof HTMLButtonElement) return;
  if (e.code === 'Space') {
    e.preventDefault();
    director.togglePause();
  }
  if (e.key.toLowerCase() === 'h') resetView();
});
const raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
let down = { x: 0, y: 0 };
renderer.domElement.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY };
});
function hitToy(e: PointerEvent) {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(
    toys.map((t) => t.root),
    true,
  );
  if (!hits.length) return;
  let obj: THREE.Object3D | null = hits[0].object;
  while (obj && !obj.userData.toyId) obj = obj.parent;
  return toys.find((t) => t.id === obj?.userData.toyId);
}
renderer.domElement.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  const toy = hitToy(e);
  if (toy) choose(toy);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  renderer.domElement.style.cursor = e.buttons ? 'grabbing' : hitToy(e) ? 'pointer' : 'grab';
});
const clock = new THREE.Clock(),
  projected = new THREE.Vector3();
let running = true;
function animate() {
  if (!running) return;
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!document.hidden) director.update(dt);
  if (following) {
    const target = actor.root.position.clone().add(new THREE.Vector3(0, 0.55, 0));
    const change = target.sub(controls.target).multiplyScalar(1 - Math.exp(-dt * 2));
    controls.target.add(change);
    camera.position.add(change);
  }
  controls.update();
  const blend = 1 - Math.exp(-dt * 2);
  sun.intensity = THREE.MathUtils.lerp(sun.intensity, night ? 1.25 : 3.15, blend);
  ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, night ? 1.1 : 1.9, blend);
  fill.intensity = THREE.MathUtils.lerp(fill.intensity, night ? 0.65 : 1.35, blend);
  warm.intensity = THREE.MathUtils.lerp(warm.intensity, night ? 8 : 0, blend);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(
    renderer.toneMappingExposure,
    night ? 0.91 : 1.04,
    blend,
  );
  renderer.render(scene, camera);
  projected
    .copy(actor.root.position)
    .add(new THREE.Vector3(0, 1.8, 0))
    .project(camera);
  const x = (projected.x * 0.5 + 0.5) * container.clientWidth,
    y = (-projected.y * 0.5 + 0.5) * container.clientHeight;
  $('bubble').style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
  $('bubble').style.opacity =
    projected.z > 1 || x < 20 || x > container.clientWidth - 20 || y < 50 ? '0' : '1';
  if (director.totalTime - lastUI > 0.15) {
    $('activity-progress').style.width =
      `${director.state === 'playing' ? Math.min(100, (director.elapsed / (director.current?.duration ?? 1)) * 100) : director.state === 'walking' ? 20 : 0}%`;
    lastUI = director.totalTime;
  }
  audio.update(
    director.totalTime,
    director.state === 'playing' && director.current?.action === 'music',
  );
}
updateUI();
animate();
$('loading').classList.add('loaded');
director.choose(toys[0]);
renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  toast('画面暂时休息了，请刷新页面重新进入房间。');
});
// Local inspection hook used by acceptance checks.
Object.defineProperty(window, '__playroom', {
  value: { director, toys, camera, controls, renderer, actor },
  configurable: true,
});
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    running = false;
    controls.dispose();
    renderer.dispose();
    audio.dispose();
  });
