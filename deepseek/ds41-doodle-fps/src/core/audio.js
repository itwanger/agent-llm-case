/**
 * 全部音效都是 WebAudio 现场合成的，没有任何音频文件。
 * 音色也按「纸上涂鸦」来设计：干、脆、短，像笔尖划过纸面。
 */

let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = true;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    enabled = false;
    return null;
  }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  // 预生成 2 秒白噪声
  const len = Math.floor(ctx.sampleRate * 2);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

export function resumeAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setVolume(v) {
  if (master) master.gain.value = v;
}

export function isAudioReady() {
  return !!ctx && ctx.state === 'running';
}

function now() {
  return ctx.currentTime;
}

function noise(dur, { type = 'bandpass', freq = 1200, q = 1, gain = 0.5, sweep = null, curve = 2 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  if (sweep) {
    f.frequency.setValueAtTime(sweep[0], now());
    f.frequency.exponentialRampToValueAtTime(Math.max(30, sweep[1]), now() + dur);
  }
  const g = ctx.createGain();
  const t = now();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur * curve);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
  return g;
}

function tone(f0, f1, dur, { type = 'sine', gain = 0.3, delay = 0 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  const g = ctx.createGain();
  const t = now() + delay;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function click(dur = 0.03, gain = 0.25, freq = 2400) {
  noise(dur, { type: 'bandpass', freq, q: 3, gain, curve: 3 });
}

const SFX = {
  rifle() {
    if (!ensure()) return;
    noise(0.09, { type: 'bandpass', freq: 1500, q: 0.8, gain: 0.5, sweep: [2400, 420], curve: 2.4 });
    tone(180, 70, 0.1, { type: 'square', gain: 0.16 });
    click(0.02, 0.18, 3200);
  },
  shotgun() {
    if (!ensure()) return;
    noise(0.34, { type: 'lowpass', freq: 1600, q: 0.6, gain: 0.72, sweep: [2200, 180], curve: 2.2 });
    tone(120, 44, 0.28, { type: 'sawtooth', gain: 0.24 });
    tone(90, 38, 0.36, { type: 'sine', gain: 0.2 });
  },
  katanaSwing() {
    if (!ensure()) return;
    noise(0.2, { type: 'bandpass', freq: 500, q: 1.6, gain: 0.4, sweep: [520, 2600], curve: 2.8 });
  },
  katanaHit() {
    if (!ensure()) return;
    noise(0.13, { type: 'highpass', freq: 1800, q: 1, gain: 0.42, sweep: [2600, 900], curve: 2.6 });
    tone(880, 320, 0.12, { type: 'triangle', gain: 0.16 });
  },
  hit() {
    if (!ensure()) return;
    tone(760, 480, 0.06, { type: 'square', gain: 0.14 });
    click(0.03, 0.2, 2600);
  },
  kill() {
    if (!ensure()) return;
    noise(0.22, { type: 'bandpass', freq: 900, q: 0.9, gain: 0.4, sweep: [1400, 240], curve: 2.2 });
    tone(420, 90, 0.22, { type: 'sawtooth', gain: 0.13 });
  },
  reload() {
    if (!ensure()) return;
    click(0.035, 0.26, 1800);
    click(0.04, 0.22, 1200);
    setTimeout(() => ctx && click(0.05, 0.3, 2200), 120);
    setTimeout(() => ctx && click(0.06, 0.28, 900), 300);
  },
  dry() {
    if (!ensure()) return;
    click(0.025, 0.22, 1500);
  },
  hurt() {
    if (!ensure()) return;
    tone(150, 52, 0.3, { type: 'sine', gain: 0.4 });
    noise(0.16, { type: 'lowpass', freq: 700, gain: 0.3 });
  },
  step(alt) {
    if (!ensure()) return;
    noise(0.05, { type: 'bandpass', freq: alt ? 1150 : 880, q: 2.2, gain: 0.1, curve: 3.4 });
  },
  jump() {
    if (!ensure()) return;
    tone(300, 520, 0.1, { type: 'triangle', gain: 0.12 });
  },
  land() {
    if (!ensure()) return;
    noise(0.09, { type: 'lowpass', freq: 500, gain: 0.22, curve: 3 });
  },
  spawn() {
    if (!ensure()) return;
    noise(0.3, { type: 'bandpass', freq: 700, q: 1.2, gain: 0.2, sweep: [300, 1500], curve: 2.6 });
  },
  death() {
    if (!ensure()) return;
    tone(220, 40, 0.9, { type: 'sawtooth', gain: 0.32 });
    noise(0.7, { type: 'lowpass', freq: 900, gain: 0.34, sweep: [900, 120], curve: 1.6 });
    tone(110, 30, 1.1, { type: 'sine', gain: 0.26 });
  },
  ui() {
    if (!ensure()) return;
    click(0.03, 0.18, 2800);
    tone(520, 700, 0.06, { type: 'triangle', gain: 0.1 });
  },
};

export function sfx(name, arg) {
  if (!enabled) return;
  const fn = SFX[name];
  if (!fn) return;
  try {
    fn(arg);
  } catch (e) {
    /* 音频失败不影响游戏 */
  }
}

export function initAudioOnGesture() {
  resumeAudio();
}
