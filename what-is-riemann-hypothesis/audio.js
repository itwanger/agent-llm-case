/**
 * Gentle, lazily initialized Web Audio marimba synthesizer.
 * Starts muted (soundEnabled = false) and never creates an AudioContext until
 * the user explicitly enables sound. Safe in non-browser environments.
 */

let soundEnabled = false;
let audioCtx = null;
let lastZeroToneMs = 0;
let lastUiToneMs = 0;

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function getAudioContext() {
  if (typeof globalThis === 'undefined') return null;
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!audioCtx) {
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      const maybePromise = audioCtx.resume();
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {});
      }
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Returns whether audio feedback is currently enabled (starts false).
 */
export function isSoundEnabled() {
  return soundEnabled;
}

/**
 * Toggles sound on or off. Lazily creates/resumes AudioContext only when enabled === true.
 */
export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  if (soundEnabled) {
    getAudioContext();
  }
  return soundEnabled;
}

/**
 * Plays a soft marimba tone mapped from a Riemann zeta zero imaginary part gamma.
 * Main sine + 0.2 triangle 2nd harmonic, 0.015s fade-in, 0.26s exponential decay,
 * peak combined gain <= 0.09, 60ms throttle.
 */
export function playZeroTone(gamma) {
  if (!soundEnabled) return;
  if (!Number.isFinite(gamma) || gamma <= 0) return;

  const tMs = nowMs();
  if (tMs - lastZeroToneMs < 60) return;
  lastZeroToneMs = tMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const rawFreq = 220 * Math.pow(gamma / 14.134725, 0.62);
    const freq = Math.max(110, Math.min(1400, rawFreq));

    const masterGain = ctx.createGain();
    // Main sine (1.0) + 2nd harmonic triangle (0.2) = 1.2x; 0.072 * 1.2 = 0.0864 <= 0.09
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.072, now + 0.015);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015 + 0.26);
    masterGain.connect(ctx.destination);

    const oscMain = ctx.createOscillator();
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(freq, now);
    oscMain.connect(masterGain);

    const oscHarm = ctx.createOscillator();
    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(freq * 2, now);

    const harmGain = ctx.createGain();
    harmGain.gain.setValueAtTime(0.2, now);
    oscHarm.connect(harmGain);
    harmGain.connect(masterGain);

    const stopTime = now + 0.30;
    oscMain.start(now);
    oscHarm.start(now);
    oscMain.stop(stopTime);
    oscHarm.stop(stopTime);

    oscMain.onended = () => {
      try {
        oscMain.disconnect();
        oscHarm.disconnect();
        harmGain.disconnect();
        masterGain.disconnect();
      } catch {
        // Ignore teardown errors
      }
    };
  } catch {
    // Ignore Web Audio scheduling errors
  }
}

function scheduleNote(ctx, { freq, type = 'sine', startOffset = 0, attack = 0.012, decay = 0.14, peak = 0.055 }) {
  const start = ctx.currentTime + startOffset;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.connect(gain);

  osc.start(start);
  osc.stop(start + attack + decay + 0.02);
  osc.onended = () => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      // Ignore teardown errors
    }
  };
}

/**
 * Plays a gentle subtle UI feedback blip when sound is enabled.
 * Supported kinds: 'prime' | 'composite' | 'stamp' | 'alert' | 'reset'.
 */
export function playUiFeedback(kind) {
  if (!soundEnabled) return;

  const tMs = nowMs();
  if (tMs - lastUiToneMs < 40) return;
  lastUiToneMs = tMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    switch (kind) {
      case 'prime':
        scheduleNote(ctx, { freq: 523.25, type: 'sine', startOffset: 0, decay: 0.14, peak: 0.055 });
        scheduleNote(ctx, { freq: 659.25, type: 'sine', startOffset: 0.06, decay: 0.18, peak: 0.06 });
        break;
      case 'composite':
        scheduleNote(ctx, { freq: 329.63, type: 'triangle', startOffset: 0, decay: 0.12, peak: 0.05 });
        break;
      case 'stamp':
        scheduleNote(ctx, { freq: 523.25, type: 'sine', startOffset: 0, decay: 0.14, peak: 0.05 });
        scheduleNote(ctx, { freq: 659.25, type: 'sine', startOffset: 0.055, decay: 0.15, peak: 0.055 });
        scheduleNote(ctx, { freq: 783.99, type: 'sine', startOffset: 0.11, decay: 0.22, peak: 0.06 });
        break;
      case 'alert':
        scheduleNote(ctx, { freq: 233.08, type: 'triangle', startOffset: 0, decay: 0.13, peak: 0.055 });
        scheduleNote(ctx, { freq: 196.0, type: 'triangle', startOffset: 0.08, decay: 0.16, peak: 0.055 });
        break;
      case 'reset':
        scheduleNote(ctx, { freq: 440.0, type: 'sine', startOffset: 0, decay: 0.11, peak: 0.045 });
        scheduleNote(ctx, { freq: 329.63, type: 'sine', startOffset: 0.055, decay: 0.14, peak: 0.045 });
        break;
      default:
        scheduleNote(ctx, { freq: 392.0, type: 'sine', startOffset: 0, decay: 0.1, peak: 0.045 });
        break;
    }
  } catch {
    // Ignore Web Audio scheduling errors
  }
}
