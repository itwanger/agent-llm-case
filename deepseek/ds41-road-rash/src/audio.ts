/* ============================================================
 * audio.ts — 100% procedural WebAudio sound effects
 * (no audio files: engine drone, punches, club whoosh, impacts,
 *  crashes and the retro countdown blips are all synthesised)
 * ============================================================ */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf!: AudioBuffer;
  private started = false;

  /* engine nodes */
  private engOscA!: OscillatorNode;
  private engOscB!: OscillatorNode;
  private engSub!: OscillatorNode;
  private engFilter!: BiquadFilterNode;
  private engGain!: GainNode;
  private engNoise!: AudioBufferSourceNode;
  private engNoiseFilter!: BiquadFilterNode;
  private engNoiseGain!: GainNode;

  private enabled = true;

  /** Must be called from a user gesture (click / keydown). */
  unlock(): void {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext =
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.started = true;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    // reusable noise buffer (2 s of white noise)
    const len = Math.floor(this.ctx.sampleRate * 2);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.buildEngine();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.55 : 0;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private buildEngine(): void {
    const ctx = this.ctx!;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;

    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 520;
    this.engFilter.Q.value = 5.5;

    this.engOscA = ctx.createOscillator();
    this.engOscA.type = 'sawtooth';
    this.engOscA.frequency.value = 60;

    this.engOscB = ctx.createOscillator();
    this.engOscB.type = 'square';
    this.engOscB.frequency.value = 90;
    this.engOscB.detune.value = 14;

    this.engSub = ctx.createOscillator();
    this.engSub.type = 'sine';
    this.engSub.frequency.value = 32;

    const bGain = ctx.createGain();
    bGain.gain.value = 0.35;

    this.engOscA.connect(this.engFilter);
    this.engOscB.connect(bGain).connect(this.engFilter);
    this.engSub.connect(this.engFilter);
    this.engFilter.connect(this.engGain).connect(this.master);

    // exhaust rasp
    this.engNoise = ctx.createBufferSource();
    this.engNoise.buffer = this.noiseBuf;
    this.engNoise.loop = true;
    this.engNoiseFilter = ctx.createBiquadFilter();
    this.engNoiseFilter.type = 'bandpass';
    this.engNoiseFilter.frequency.value = 320;
    this.engNoiseFilter.Q.value = 1.4;
    this.engNoiseGain = ctx.createGain();
    this.engNoiseGain.gain.value = 0;
    this.engNoise.connect(this.engNoiseFilter).connect(this.engNoiseGain).connect(this.master);

    this.engOscA.start();
    this.engOscB.start();
    this.engSub.start();
    this.engNoise.start();
  }

  /** speed01: 0..1, load: 0..1, active: engine audible at all */
  updateEngine(speed01: number, load: number, active: boolean): void {
    if (!this.started || !this.enabled) return;
    const t = this.ctx!.currentTime;
    const gear = (speed01 * 5) % 1; // fake gearbox saw
    const rpm = 0.34 + 0.66 * (0.45 * speed01 + 0.55 * gear);
    const base = 46 + rpm * 132;

    this.engOscA.frequency.setTargetAtTime(base, t, 0.045);
    this.engOscB.frequency.setTargetAtTime(base * 1.51, t, 0.045);
    this.engSub.frequency.setTargetAtTime(base * 0.5, t, 0.05);
    this.engFilter.frequency.setTargetAtTime(360 + speed01 * 1750 + load * 620, t, 0.06);
    this.engNoiseFilter.frequency.setTargetAtTime(220 + speed01 * 900, t, 0.06);

    const target = active ? 0.1 + 0.2 * speed01 + 0.09 * load : 0;
    this.engGain.gain.setTargetAtTime(target, t, 0.09);
    this.engNoiseGain.gain.setTargetAtTime(active ? 0.028 + 0.05 * load : 0, t, 0.09);
  }

  private noiseBurst(
    dur: number,
    filterType: BiquadFilterType,
    freq: number,
    endFreq: number,
    gain: number,
    q = 1,
    delay = 0,
  ): void {
    if (!this.started || !this.enabled) return;
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.012, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    gain: number,
    delay = 0,
  ): void {
    if (!this.started || !this.enabled) return;
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  /** Fist connects with a rider. */
  punch(): void {
    this.noiseBurst(0.11, 'bandpass', 1500, 320, 0.42, 1.1);
    this.tone('sine', 150, 48, 0.16, 0.42);
  }

  /** Club swing (whiff) — a short airy sweep. */
  whoosh(): void {
    this.noiseBurst(0.22, 'bandpass', 380, 2400, 0.2, 0.7);
  }

  /** Club connects — meaty crack plus metal ring. */
  clubHit(): void {
    this.noiseBurst(0.18, 'lowpass', 2600, 200, 0.5, 0.9);
    this.tone('triangle', 320, 70, 0.24, 0.4);
    this.tone('square', 1180, 640, 0.2, 0.13, 0.01);
  }

  /** Player takes a hit. */
  hurt(): void {
    this.noiseBurst(0.2, 'lowpass', 900, 130, 0.46, 0.8);
    this.tone('sawtooth', 210, 62, 0.26, 0.26);
  }

  /** Bike / rider impact with traffic or scenery. */
  crash(): void {
    this.noiseBurst(0.72, 'lowpass', 3200, 110, 0.72, 0.6);
    this.noiseBurst(0.5, 'bandpass', 900, 220, 0.5, 0.9, 0.02);
    this.tone('sine', 96, 30, 0.7, 0.6);
    this.tone('square', 620, 180, 0.32, 0.16, 0.03);
    this.tone('square', 880, 240, 0.28, 0.12, 0.09);
  }

  /** Ragdoll scraping on asphalt. */
  scrape(): void {
    this.noiseBurst(0.34, 'bandpass', 1900, 700, 0.24, 0.8);
  }

  /** Countdown / UI blip. */
  blip(freq: number, dur = 0.16, type: OscillatorType = 'square'): void {
    this.tone(type, freq, freq, dur, 0.24);
  }

  countdownBeep(step: number): void {
    // 3,2,1 -> low, GO -> high
    if (step > 0) this.blip(440, 0.16);
    else this.blip(880, 0.42);
  }

  /** End-of-race fanfare. */
  fanfare(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => this.tone('square', n, n, 0.22, 0.2, i * 0.13));
  }
}

export const audio = new AudioEngine();
