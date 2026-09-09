"use client";

import { RefObject, useEffect, useRef } from "react";
import type { Artifact } from "@/data/artifacts";

type Node = {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  restX: number;
  restY: number;
  char: string;
  color: string;
};

type Chain = {
  nodes: Node[];
  spacing: number;
  phase: number;
};

type Glyph = { x: number; y: number; size: number };

type PointerState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  previousX: number;
  previousY: number;
  segmentStartX: number;
  segmentStartY: number;
  previousTime: number;
  active: boolean;
  serial: number;
};

type Props = {
  artifact: Artifact;
  imageRef: RefObject<HTMLImageElement | null>;
  imageSelector: string;
  layoutVersion: number;
  reducedMotion: boolean;
  onGesture: (speed: number, pan: number, compact: boolean) => void;
};

const ATLAS_SIZE = 2048;
const GLYPH_CELL = 46;

class GlyphAtlas {
  readonly canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private glyphs = new Map<string, Glyph>();
  private slot = 0;

  constructor(chars: string, colors: readonly string[]) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = ATLAS_SIZE;
    this.canvas.height = ATLAS_SIZE;
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.context = context;
    [...new Set(chars)].forEach((char) => colors.forEach((color) => this.add(char, color)));
  }

  get(char: string, color: string) {
    return this.glyphs.get(`${char}|${color}`) ?? this.add(char, color);
  }

  private add(char: string, color: string) {
    const key = `${char}|${color}`;
    const columns = Math.floor(ATLAS_SIZE / GLYPH_CELL);
    const x = (this.slot % columns) * GLYPH_CELL;
    const y = Math.floor(this.slot / columns) * GLYPH_CELL;
    this.slot += 1;
    this.context.save();
    this.context.font = '500 24px "Songti SC", "STSong", "Noto Serif CJK SC", serif';
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillStyle = color;
    this.context.shadowColor = color;
    this.context.shadowBlur = 7;
    this.context.globalAlpha = 0.42;
    this.context.fillText(char, x + GLYPH_CELL / 2, y + GLYPH_CELL / 2 + 1);
    this.context.shadowBlur = 0;
    this.context.globalAlpha = 1;
    this.context.fillText(char, x + GLYPH_CELL / 2, y + GLYPH_CELL / 2 + 1);
    this.context.restore();
    const glyph = { x, y, size: GLYPH_CELL };
    this.glyphs.set(key, glyph);
    return glyph;
  }
}

export function TextCurtain({ artifact, imageRef, imageSelector, layoutVersion, reducedMotion, onGesture }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const onGestureRef = useRef(onGesture);

  useEffect(() => {
    onGestureRef.current = onGesture;
  }, [onGesture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const imageElement = imageRef.current ?? document.querySelector<HTMLImageElement>(imageSelector);
    if (!canvas || !host || !imageElement) return;
    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let alive = true;
    let rebuildTimer = 0;
    let chains: Chain[] = [];
    let atlas: GlyphAtlas | null = null;
    let imageData: ImageData | null = null;
    let sourceWidth = 0;
    let sourceHeight = 0;
    let lastFrame = performance.now();
    let lastImpulseSerial = -1;
    const compactQuery = window.matchMedia("(max-width: 720px)");
    const pointer: PointerState = {
      x: -1000,
      y: -1000,
      vx: 0,
      vy: 0,
      speed: 0,
      previousX: -1000,
      previousY: -1000,
      segmentStartX: -1000,
      segmentStartY: -1000,
      previousTime: performance.now(),
      active: false,
      serial: 0,
    };

    const readSource = async () => {
      const image = new Image();
      image.decoding = "async";
      image.src = artifact.image;
      try {
        await image.decode();
      } catch {
        return;
      }
      if (!alive) return;
      sourceWidth = image.naturalWidth;
      sourceHeight = image.naturalHeight;
      const offscreen = document.createElement("canvas");
      offscreen.width = sourceWidth;
      offscreen.height = sourceHeight;
      const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offscreenContext) return;
      offscreenContext.drawImage(image, 0, 0);
      imageData = offscreenContext.getImageData(0, 0, sourceWidth, sourceHeight);
      atlas = new GlyphAtlas(artifact.textPool, artifact.palette);
      buildChains();
    };

    const sampleBottom = (sourceX: number) => {
      if (!imageData) return -1;
      const x = Math.max(0, Math.min(sourceWidth - 1, Math.round(sourceX)));
      for (let y = sourceHeight - 1; y >= 0; y -= 1) {
        if (imageData.data[(y * sourceWidth + x) * 4 + 3] > 42) return y;
      }
      return -1;
    };

    const buildChains = () => {
      if (!imageData || !imageElement.isConnected || width === 0 || height === 0) return;
      const hostRect = host.getBoundingClientRect();
      const imageRect = imageElement.getBoundingClientRect();
      if (imageRect.width < 20 || imageRect.height < 20) return;
      const compact = compactQuery.matches;
      const spacing = compact ? 20 : 19;
      const targetGap = compact ? 18.5 : 17.5;
      const curtainPixelWidth = imageRect.width * artifact.curtainWidth;
      const columnCount = Math.max(24, Math.floor(curtainPixelWidth / targetGap));
      const sourceStart = sourceWidth * (1 - artifact.curtainWidth) * 0.5;
      const sourceSpan = sourceWidth * artifact.curtainWidth;
      const characters = Array.from(artifact.textPool);
      const nextChains: Chain[] = [];

      for (let column = 0; column < columnCount; column += 1) {
        const ratio = columnCount === 1 ? 0.5 : column / (columnCount - 1);
        const sourceX = sourceStart + ratio * sourceSpan;
        const sourceY = sampleBottom(sourceX);
        if (sourceY < 0) continue;
        const anchorX = imageRect.left - hostRect.left + (sourceX / sourceWidth) * imageRect.width;
        const anchorY = imageRect.top - hostRect.top + (sourceY / sourceHeight) * imageRect.height - 1;
        const bottom = height - (compact ? 76 : 46) - (column % 5) * 3;
        const nodeCount = Math.max(4, Math.floor((bottom - anchorY) / spacing));
        if (nodeCount < 4) continue;
        const nodes: Node[] = [];
        const characterOffset = (column * 7) % characters.length;
        for (let row = 0; row < nodeCount; row += 1) {
          const x = anchorX;
          const y = anchorY + row * spacing;
          nodes.push({
            x,
            y,
            previousX: x,
            previousY: y,
            restX: x,
            restY: y,
            char: characters[(characterOffset + row) % characters.length],
            color: artifact.palette[(column + row * 3) % artifact.palette.length],
          });
        }
        nextChains.push({ nodes, spacing, phase: column * 0.53 + Math.random() * 0.2 });
      }
      chains = nextChains;
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      window.clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(buildChains, 60);
    };

    const applyPointerImpulse = () => {
      if (!pointer.active || pointer.serial === lastImpulseSerial || pointer.speed < 18) return;
      lastImpulseSerial = pointer.serial;
      const compact = compactQuery.matches;
      const radius = compact ? 62 : 92;
      const speedRatio = Math.min(1, pointer.speed / 1250);
      const impulse = 2.2 + speedRatio * (compact ? 11 : 18);
      const directionX = pointer.speed > 0 ? pointer.vx / pointer.speed : 0;
      const directionY = pointer.speed > 0 ? pointer.vy / pointer.speed : 0;
      const segmentX = pointer.x - pointer.segmentStartX;
      const segmentY = pointer.y - pointer.segmentStartY;
      const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

      chains.forEach((chain) => {
        for (let index = 1; index < chain.nodes.length; index += 1) {
          const node = chain.nodes[index];
          const projection = segmentLengthSquared
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((node.x - pointer.segmentStartX) * segmentX + (node.y - pointer.segmentStartY) * segmentY) /
                    segmentLengthSquared,
                ),
              )
            : 1;
          const nearestX = pointer.segmentStartX + segmentX * projection;
          const nearestY = pointer.segmentStartY + segmentY * projection;
          const dx = node.x - nearestX;
          const dy = node.y - nearestY;
          const distance = Math.hypot(dx, dy);
          if (distance >= radius) continue;
          const falloff = (1 - distance / radius) ** 2;
          const radialX = distance > 0 ? dx / distance : 0;
          node.x += (directionX * impulse + radialX * impulse * 0.28) * falloff;
          node.y += directionY * impulse * 0.34 * falloff;
        }
      });
      onGestureRef.current(pointer.speed, (pointer.x / Math.max(1, width)) * 2 - 1, compact);
    };

    const solve = (time: number, delta: number) => {
      applyPointerImpulse();
      const damping = reducedMotion ? 0.78 : 0.935;
      const returnForce = reducedMotion ? 0.045 : 0.012;
      const deltaScale = Math.min(1.6, delta / 16.667);

      chains.forEach((chain) => {
        chain.nodes.forEach((node, index) => {
          if (index === 0) {
            node.x = node.restX;
            node.y = node.restY;
            node.previousX = node.restX;
            node.previousY = node.restY;
            return;
          }
          const velocityX = (node.x - node.previousX) * damping;
          const velocityY = (node.y - node.previousY) * damping;
          node.previousX = node.x;
          node.previousY = node.y;
          const sway = reducedMotion ? 0 : Math.sin(time * 0.00072 + chain.phase + index * 0.08) * 0.006;
          node.x += velocityX + (node.restX - node.x) * returnForce * deltaScale + sway;
          node.y += velocityY + (node.restY - node.y) * returnForce * 0.55 * deltaScale;
        });

        for (let iteration = 0; iteration < 3; iteration += 1) {
          for (let index = 1; index < chain.nodes.length; index += 1) {
            const previous = chain.nodes[index - 1];
            const current = chain.nodes[index];
            const dx = current.x - previous.x;
            const dy = current.y - previous.y;
            const distance = Math.max(0.001, Math.hypot(dx, dy));
            const correction = (distance - chain.spacing) / distance;
            if (index === 1) {
              current.x -= dx * correction;
              current.y -= dy * correction;
            } else {
              previous.x += dx * correction * 0.5;
              previous.y += dy * correction * 0.5;
              current.x -= dx * correction * 0.5;
              current.y -= dy * correction * 0.5;
            }
          }
          const anchor = chain.nodes[0];
          anchor.x = anchor.restX;
          anchor.y = anchor.restY;
        }
      });
      pointer.speed *= 0.88;
    };

    const render = () => {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (!atlas) return;
      const glyphAtlas = atlas;
      chains.forEach((chain) => {
        const lastIndex = Math.max(1, chain.nodes.length - 1);
        chain.nodes.forEach((node, index) => {
          const before = chain.nodes[Math.max(0, index - 1)];
          const after = chain.nodes[Math.min(lastIndex, index + 1)];
          const angle = Math.atan2(after.y - before.y, after.x - before.x) - Math.PI / 2;
          const bottomFade = Math.max(0, 1 - (index / lastIndex) ** 2.4);
          const topFade = Math.min(1, 0.58 + index * 0.12);
          const glyph = glyphAtlas.get(node.char, node.color);
          const renderSize = compactQuery.matches ? 34 : 36;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          context.globalAlpha = bottomFade * topFade * 0.82;
          context.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, node.x * dpr, node.y * dpr);
          context.drawImage(
            glyphAtlas.canvas,
            glyph.x,
            glyph.y,
            glyph.size,
            glyph.size,
            -renderSize / 2,
            -renderSize / 2,
            renderSize,
            renderSize,
          );
        });
      });
      context.globalAlpha = 1;
      context.setTransform(1, 0, 0, 1, 0, 0);
    };

    const tick = (time: number) => {
      if (!alive) return;
      const delta = Math.min(32, time - lastFrame || 16.667);
      lastFrame = time;
      solve(time, delta);
      render();
      frame = requestAnimationFrame(tick);
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const now = performance.now();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const deltaTime = Math.max(8, now - pointer.previousTime);
      const vx = ((x - pointer.previousX) / deltaTime) * 1000;
      const vy = ((y - pointer.previousY) / deltaTime) * 1000;
      const rawSpeed = Math.hypot(vx, vy);
      pointer.segmentStartX = pointer.x;
      pointer.segmentStartY = pointer.y;
      pointer.vx = pointer.vx * 0.32 + vx * 0.68;
      pointer.vy = pointer.vy * 0.32 + vy * 0.68;
      pointer.speed = Math.min(1700, pointer.speed * 0.2 + rawSpeed * 0.8);
      pointer.x = x;
      pointer.y = y;
      pointer.previousX = x;
      pointer.previousY = y;
      pointer.previousTime = now;
      pointer.active = true;
      pointer.serial += 1;
    };

    const pointerEnter = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
      pointer.segmentStartX = pointer.x;
      pointer.segmentStartY = pointer.y;
      pointer.previousTime = performance.now();
      pointer.active = true;
    };
    const pointerLeave = () => {
      pointer.active = false;
      pointer.speed = 0;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resizeObserver.observe(imageElement);
    compactQuery.addEventListener("change", resize);
    canvas.addEventListener("pointerenter", pointerEnter);
    canvas.addEventListener("pointermove", updatePointer, { passive: true });
    canvas.addEventListener("pointerleave", pointerLeave);
    resize();
    void readSource();
    frame = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(rebuildTimer);
      resizeObserver.disconnect();
      compactQuery.removeEventListener("change", resize);
      canvas.removeEventListener("pointerenter", pointerEnter);
      canvas.removeEventListener("pointermove", updatePointer);
      canvas.removeEventListener("pointerleave", pointerLeave);
      chains = [];
      atlas = null;
      imageData = null;
    };
  }, [artifact, imageRef, imageSelector, layoutVersion, reducedMotion]);

  return (
    <div ref={hostRef} className="curtain-host">
      <canvas ref={canvasRef} className="curtain-canvas" aria-hidden="true" />
    </div>
  );
}
