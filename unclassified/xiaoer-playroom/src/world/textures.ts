import * as THREE from 'three';
import { canvasTexture } from './primitives';
// Seeded textures stay stable across hot reloads; no remote assets are required.
export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function woodTexture() {
  return canvasTexture((c, s) => {
    const rng = random(18);
    c.fillStyle = '#dfbc91';
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 450; i++) {
      const y = rng() * s;
      c.strokeStyle = `rgba(112,76,42,${rng() * 0.11})`;
      c.lineWidth = rng() * 1.2 + 0.3;
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(s * 0.3, y + rng() * 10, s * 0.65, y - rng() * 12, s, y + 3);
      c.stroke();
    }
    c.strokeStyle = 'rgba(126,89,57,.2)';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(0, i * 128);
      c.lineTo(s, i * 128);
      c.stroke();
      const x = i % 2 ? 380 : 130;
      c.beginPath();
      c.moveTo(x, i * 128);
      c.lineTo(x, (i + 1) * 128);
      c.stroke();
    }
  });
}
const fabricCache = new Map<string, THREE.MeshStandardMaterial>();
let weave: THREE.CanvasTexture | undefined;
export function fabricMaterial(color: string) {
  if (fabricCache.has(color)) return fabricCache.get(color)!;
  const map =
    weave ??
    canvasTexture((c, s) => {
      const rng = random(20);
      c.fillStyle = '#bbb';
      c.fillRect(0, 0, s, s);
      for (let i = 0; i < 14000; i++) {
        c.fillStyle = rng() > 0.5 ? '#999' : '#ddd';
        c.fillRect(rng() * s, rng() * s, 1, 2);
      }
    }, 128);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(5, 5);
  weave = map;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    bumpMap: map,
    bumpScale: 0.018,
  });
  fabricCache.set(color, material);
  return material;
}
export function artTexture(kind: 'rabbit' | 'rainbow' | 'garden' | 'book') {
  return canvasTexture((c, s) => {
    c.fillStyle = '#fff9e9';
    c.fillRect(0, 0, s, s);
    if (kind === 'rainbow') {
      ['#cf9b7a', '#e3bd83', '#b4bd95', '#87a18d'].forEach((col, i) => {
        c.strokeStyle = col;
        c.lineWidth = 29;
        c.beginPath();
        c.arc(256, 325, 160 - i * 36, Math.PI, 0);
        c.stroke();
      });
      c.fillStyle = '#796a54';
      c.font = '25px Georgia';
      c.textAlign = 'center';
      c.fillText('little things, big joy', 256, 417);
    } else if (kind === 'rabbit') {
      c.fillStyle = '#dcc4a5';
      c.beginPath();
      c.ellipse(256, 293, 125, 131, 0, 0, Math.PI * 2);
      c.fill();
      [204, 310].forEach((x, i) => {
        c.beginPath();
        c.ellipse(x, 133, 37, 102, i ? 0.14 : -0.14, 0, Math.PI * 2);
        c.fill();
      });
      c.fillStyle = '#665749';
      [212, 296].forEach((x) => {
        c.beginPath();
        c.arc(x, 277, 8, 0, Math.PI * 2);
        c.fill();
      });
      c.fillStyle = '#ba8978';
      c.beginPath();
      c.ellipse(256, 310, 12, 9, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#796a54';
      c.font = '26px Georgia';
      c.textAlign = 'center';
      c.fillText('hello, little one', 256, 462);
    } else {
      c.fillStyle = '#edcf70';
      c.beginPath();
      c.arc(355, 138, 48, 0, 7);
      c.fill();
      ['#c9d1ae', '#a2b394', '#849f83'].forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath();
        c.ellipse(120 + i * 155, 490, 220, 190 + i * 35, 0, 0, 7);
        c.fill();
      });
      c.fillStyle = '#fff8dc';
      c.font = 'bold 55px Georgia';
      c.textAlign = 'center';
      c.fillText(kind === 'book' ? 'A little' : 'GROW', 256, 230);
      c.font = '40px Georgia';
      c.fillText(kind === 'book' ? 'adventure' : 'with love', 256, 285);
    }
  });
}
