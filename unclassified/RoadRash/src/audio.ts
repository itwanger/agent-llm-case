export class AudioMan {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private scrapeGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 1;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 700;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 70;
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 35;
    this.engineOsc.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    this.engineOsc2.start();

    const scrapeSrc = ctx.createBufferSource();
    scrapeSrc.buffer = this.noiseBuf;
    scrapeSrc.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    this.scrapeGain = ctx.createGain();
    this.scrapeGain.gain.value = 0;
    scrapeSrc.connect(bp);
    bp.connect(this.scrapeGain);
    this.scrapeGain.connect(this.master);
    scrapeSrc.start();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEngine(speedRatio: number, throttle: number, running: boolean) {
    if (!this.ctx || !this.engineGain || !this.engineOsc || !this.engineOsc2 || !this.engineFilter) return;
    const t = this.ctx.currentTime;
    const f = 55 + speedRatio * 160 + throttle * 25;
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(400 + speedRatio * 1400, t, 0.1);
    this.engineGain.gain.setTargetAtTime(running ? 0.05 + speedRatio * 0.07 + throttle * 0.02 : 0, t, 0.12);
  }

  setScrape(level: number) {
    if (!this.ctx || !this.scrapeGain) return;
    this.scrapeGain.gain.setTargetAtTime(level * 0.12, this.ctx.currentTime, 0.05);
  }

  private burst(dur: number, freq: number, type: BiquadFilterType, gain: number, sweepTo?: number) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweepTo) flt.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    src.start();
    src.stop(ctx.currentTime + dur + 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  swing(club: boolean) {
    this.burst(club ? 0.22 : 0.14, club ? 500 : 900, 'bandpass', 0.25, club ? 1800 : 2600);
  }

  hit() {
    this.tone(160, 0.16, 'square', 0.35, 60);
    this.burst(0.1, 1200, 'highpass', 0.3);
  }

  crash() {
    this.burst(0.6, 400, 'lowpass', 0.6, 120);
    this.tone(90, 0.5, 'sawtooth', 0.4, 30);
  }

  scrapeHit() {
    this.burst(0.25, 1500, 'bandpass', 0.3, 600);
  }

  beep(high: boolean) {
    this.tone(high ? 880 : 440, high ? 0.4 : 0.18, 'square', 0.25);
  }

  ui() {
    this.tone(660, 0.08, 'square', 0.2);
  }

  finish() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.25, 'square', 0.25), i * 140));
  }
}
