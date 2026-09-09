import * as THREE from 'three';

/**
 * 颜色 / 材质 / 程序化贴图
 * ------------------------------------------------------------
 * 整体风格：Animal-Crossing 式圆润卡通 + 奶油色 & 原木色。
 * 所有贴图都用 Canvas 现场绘制，项目零外部资源依赖。
 */

export const PALETTE = {
  cream: 0xfff6e6,
  creamDeep: 0xffeacb,
  wall: 0xfdf1e0,
  wallShade: 0xf3e0c6,

  wood: 0xd9a86c,
  woodLight: 0xe8c89b,
  woodMid: 0xc78f52,
  woodDark: 0xa9743f,
  woodDeep: 0x8a5a2c,

  pink: 0xff9fb1,
  pinkSoft: 0xffc4cd,
  mint: 0x8fd9bd,
  mintSoft: 0xb9e8d6,
  sky: 0x9fd4f0,
  skySoft: 0xc4e6f8,
  yellow: 0xffd982,
  yellowSoft: 0xffe9b5,
  lavender: 0xc4b0ee,
  coral: 0xff9f76,
  tomato: 0xf4735f,
  leaf: 0x7fc08a,

  skin: 0xf6c9a2,
  skinShade: 0xe6ab7f,
  hair: 0x2a2119,
  hairHi: 0x4a3a2a,
  denim: 0x7fa9d8,
  denimDark: 0x5f88b8,
  shoe: 0xfffaf0,
  blush: 0xff9d9d,
  eye: 0x2b2118,
  mouth: 0x8f4b3f,
};

/* ------------------------------------------------------------------ *
 * 光照分级贴图（Toon 卡通渲染的“色阶”）
 * ------------------------------------------------------------------ */

let _gradient = null;
export function toonGradient() {
  if (_gradient) return _gradient;
  const steps = 4;
  const data = new Uint8Array(steps);
  // 亮度阶梯：暗部不至于死黑，保持奶油色的温柔感
  const levels = [0.62, 0.78, 0.92, 1.0];
  for (let i = 0; i < steps; i++) data[i] = Math.round(255 * levels[i]);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _gradient = tex;
  return tex;
}

/** 卡通材质（每个调用返回独立实例，方便单独做高亮） */
export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: toonGradient(),
    ...opts,
  });
}

/** 稍微带一点高光的软材质，用于玻璃 / 塑料玩具 */
export function glossy(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.38,
    metalness: 0.04,
    ...opts,
  });
}

/* ------------------------------------------------------------------ *
 * Canvas 工具
 * ------------------------------------------------------------------ */

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  return { c, ctx };
}

function finish(c, { repeat = 1, srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  return tex;
}

function hex(n) {
  return '#' + new THREE.Color(n).getHexString();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ------------------------------------------------------------------ *
 * 木地板
 * ------------------------------------------------------------------ */

export function woodFloorTexture(repeat = 3) {
  const { c, ctx } = canvas2d(1024, 1024);
  const planks = 8;
  const ph = c.height / planks;
  // 相邻板之间的色差刻意做得很小，避免看起来像条纹地毯
  const tones = [0xe0b884, 0xd9a86c, 0xddb078, 0xd5a267, 0xdcae76, 0xd8a76b, 0xe1b986, 0xd6a469];

  for (let i = 0; i < planks; i++) {
    const base = tones[i % tones.length];
    ctx.fillStyle = hex(base);
    ctx.fillRect(0, i * ph, c.width, ph);

    // 木纹
    const lines = 22;
    for (let k = 0; k < lines; k++) {
      const y = i * ph + (k / lines) * ph + Math.random() * 4;
      ctx.strokeStyle = `rgba(140, 96, 52, ${0.05 + Math.random() * 0.09})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= c.width; x += 64) {
        ctx.lineTo(x, y + Math.sin((x + i * 90) * 0.012) * 3 + (Math.random() - 0.5) * 2);
      }
      ctx.stroke();
    }

    // 板缝
    ctx.fillStyle = 'rgba(122, 80, 42, 0.2)';
    ctx.fillRect(0, i * ph, c.width, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, i * ph + 2, c.width, 1.5);

    // 随机短接缝
    const seams = 2;
    for (let s = 0; s < seams; s++) {
      const x = Math.random() * c.width;
      ctx.fillStyle = 'rgba(122, 80, 42, 0.3)';
      ctx.fillRect(x, i * ph, 3, ph);
    }
  }
  return finish(c, { repeat });
}

/* ------------------------------------------------------------------ *
 * 墙面（奶油色 + 极细的竖向肌理）
 * ------------------------------------------------------------------ */

export function wallTexture(repeat = 2) {
  const { c, ctx } = canvas2d(512, 512);
  ctx.fillStyle = hex(PALETTE.wall);
  ctx.fillRect(0, 0, c.width, c.height);
  for (let x = 0; x < c.width; x += 6) {
    ctx.fillStyle = `rgba(210, 180, 145, ${0.05 + Math.random() * 0.06})`;
    ctx.fillRect(x, 0, 1.6, c.height);
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.16})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
  }
  return finish(c, { repeat });
}

/* ------------------------------------------------------------------ *
 * 拼图爬爬垫
 * ------------------------------------------------------------------ */

export function puzzleMatTexture(size = 4) {
  const px = 256;
  const { c, ctx } = canvas2d(px * size, px * size);
  const colors = [
    PALETTE.pinkSoft,
    PALETTE.yellowSoft,
    PALETTE.mintSoft,
    PALETTE.skySoft,
    PALETTE.pinkSoft,
    PALETTE.lavender,
    PALETTE.yellowSoft,
    PALETTE.mintSoft,
  ];
  const at = (i, j) => ({ x: i * px, y: j * px });
  const colorAt = (i, j) => colors[(i + j * 3) % colors.length];

  // 1. 底色（缝隙）
  ctx.fillStyle = hex(PALETTE.creamDeep);
  ctx.fillRect(0, 0, c.width, c.height);

  // 2. 每块拼图的主体
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const { x, y } = at(i, j);
      ctx.fillStyle = hex(colorAt(i, j));
      roundRect(ctx, x + 3, y + 3, px - 6, px - 6, 26);
      ctx.fill();
    }
  }

  const tabR = 40;
  const socketR = 46;

  // 3. 插口（画成底色的圆洞）
  ctx.fillStyle = hex(PALETTE.creamDeep);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const { x, y } = at(i, j);
      if (i > 0) {
        ctx.beginPath();
        ctx.arc(x, y + px / 2, socketR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 6, y + px / 2 - socketR * 0.55, 14, socketR * 1.1);
      }
      if (j > 0) {
        ctx.beginPath();
        ctx.arc(x + px / 2, y, socketR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + px / 2 - socketR * 0.55, y - 6, socketR * 1.1, 14);
      }
    }
  }

  // 4. 凸起（相邻块的插头）
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const { x, y } = at(i, j);
      const col = hex(colorAt(i, j));
      if (i < size - 1) {
        ctx.fillStyle = col;
        ctx.fillRect(x + px - 8, y + px / 2 - tabR * 0.5, 20, tabR);
        ctx.beginPath();
        ctx.arc(x + px, y + px / 2, tabR, 0, Math.PI * 2);
        ctx.fill();
      }
      if (j < size - 1) {
        ctx.fillStyle = col;
        ctx.fillRect(x + px / 2 - tabR * 0.5, y + px - 8, tabR, 20);
        ctx.beginPath();
        ctx.arc(x + px / 2, y + px, tabR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 5. 泡棉质感：内侧高光 + 外侧压暗
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const { x, y } = at(i, j);
      ctx.save();
      roundRect(ctx, x + 3, y + 3, px - 6, px - 6, 26);
      ctx.clip();
      const g = ctx.createLinearGradient(x, y, x, y + px);
      g.addColorStop(0, 'rgba(255,255,255,0.34)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.05)');
      g.addColorStop(1, 'rgba(120,86,50,0.13)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, px, px);
      ctx.restore();
    }
  }

  // 6. 细颗粒
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
  }

  const tex = finish(c, { repeat: 1 });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/* ------------------------------------------------------------------ *
 * 皮球（沙滩球式竖向色条）
 * ------------------------------------------------------------------ */

export function ballTexture() {
  const { c, ctx } = canvas2d(1024, 512);
  const stripes = [PALETTE.cream, PALETTE.pink, PALETTE.cream, PALETTE.mint, PALETTE.cream, PALETTE.sky, PALETTE.cream, PALETTE.yellow];
  const w = c.width / stripes.length;
  stripes.forEach((col, i) => {
    ctx.fillStyle = hex(col);
    ctx.fillRect(i * w, 0, w + 1, c.height);
  });
  // 柔化条纹边缘
  ctx.globalAlpha = 0.25;
  for (let i = 1; i < stripes.length; i++) {
    const g = ctx.createLinearGradient(i * w - 14, 0, i * w + 14, 0);
    g.addColorStop(0, hex(stripes[i - 1]));
    g.addColorStop(1, hex(stripes[i]));
    ctx.fillStyle = g;
    ctx.fillRect(i * w - 14, 0, 28, c.height);
  }
  ctx.globalAlpha = 1;
  // 上下压暗一点，让球更立体
  const vg = ctx.createLinearGradient(0, 0, 0, c.height);
  vg.addColorStop(0, 'rgba(120,90,60,0.22)');
  vg.addColorStop(0.2, 'rgba(255,255,255,0.12)');
  vg.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  vg.addColorStop(0.85, 'rgba(255,255,255,0.16)');
  vg.addColorStop(1, 'rgba(120,90,60,0.26)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, c.width, c.height);
  return finish(c, { repeat: 1 });
}

/* ------------------------------------------------------------------ *
 * 圆形柔和阴影（贴地的接触阴影）
 * ------------------------------------------------------------------ */

export function softShadowTexture() {
  const { c, ctx } = canvas2d(256, 256);
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  g.addColorStop(0, 'rgba(90, 62, 34, 0.55)');
  g.addColorStop(0.5, 'rgba(90, 62, 34, 0.24)');
  g.addColorStop(1, 'rgba(90, 62, 34, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ *
 * 绘本封面（竖条 + 圆点 + 小星星，抽象童书风格）
 * ------------------------------------------------------------------ */

export function bookCoverTexture(seed = 0) {
  const { c, ctx } = canvas2d(256, 320);
  const bg = [PALETTE.yellowSoft, PALETTE.pinkSoft, PALETTE.mintSoft, PALETTE.skySoft, PALETTE.creamDeep][seed % 5];
  ctx.fillStyle = hex(bg);
  ctx.fillRect(0, 0, c.width, c.height);

  const rnd = (n) => {
    const x = Math.sin((seed + 1) * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // 抽象图案
  const shape = seed % 4;
  ctx.globalAlpha = 0.9;
  if (shape === 0) {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = hex([PALETTE.pink, PALETTE.mint, PALETTE.sky, PALETTE.coral, PALETTE.lavender][i % 5]);
      ctx.beginPath();
      ctx.arc(50 + i * 40, 150 + Math.sin(i) * 40, 26 + rnd(i) * 14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shape === 1) {
    ctx.fillStyle = hex(PALETTE.leaf);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(128, 190, 18, 70, (i * Math.PI) / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = hex(PALETTE.yellow);
    ctx.beginPath();
    ctx.arc(128, 180, 34, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 2) {
    ctx.fillStyle = hex(PALETTE.sky);
    ctx.beginPath();
    ctx.arc(128, 150, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hex(PALETTE.cream);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(105 + i * 24, 140 + (i % 2) * 20, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = hex([PALETTE.tomato, PALETTE.mint, PALETTE.yellow, PALETTE.sky, PALETTE.pink, PALETTE.lavender][i]);
      ctx.beginPath();
      const x = 40 + (i % 3) * 90;
      const y = 90 + Math.floor(i / 3) * 100;
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // 底部色带（书脊装饰）
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(0, 244, c.width, 76);
  ctx.fillStyle = hex(PALETTE.woodDark);
  for (let i = 0; i < 4; i++) ctx.fillRect(34 + i * 52, 262, 30, 10);

  return finish(c, { repeat: 1 });
}

/* ------------------------------------------------------------------ *
 * 地毯 / 墙面装饰用的小圆点图案
 * ------------------------------------------------------------------ */

export function dotTexture(base = PALETTE.cream, dot = PALETTE.pinkSoft, repeat = 6) {
  const { c, ctx } = canvas2d(128, 128);
  ctx.fillStyle = hex(base);
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = hex(dot);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(16 + i * 32 + (j % 2) * 16, 16 + j * 32, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finish(c, { repeat });
}
