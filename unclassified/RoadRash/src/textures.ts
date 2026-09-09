import * as THREE from 'three';

function canvasTex(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function asphaltTexture(): THREE.CanvasTexture {
  return canvasTex((ctx, s) => {
    ctx.fillStyle = '#e2e2e2';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const g = 150 + Math.floor(Math.random() * 95);
      ctx.fillStyle = `rgba(${g},${g},${g + 6},0.5)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.fillStyle = 'rgba(120,120,126,0.16)';
    ctx.fillRect(0, s * 0.16, s, s * 0.18);
    ctx.fillRect(0, s * 0.66, s, s * 0.18);
  });
}

export function grassTexture(): THREE.CanvasTexture {
  return canvasTex((ctx, s) => {
    ctx.fillStyle = '#dcdcd2';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 800; i++) {
      const g = 140 + Math.floor(Math.random() * 100);
      ctx.fillStyle = `rgba(${g - 20},${g},${g - 45},0.32)`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 2200; i++) {
      const g = 150 + Math.floor(Math.random() * 90);
      ctx.fillStyle = `rgba(${g - 10},${g},${g - 30},0.5)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
  });
}
