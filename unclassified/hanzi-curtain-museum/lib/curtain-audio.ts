type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export class CurtainAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastRustle = 0;
  private lastChime = 0;
  private timers = new Set<number>();
  enabled = true;

  async unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.19;
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.context);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.19 : 0, this.context.currentTime, 0.025);
    }
  }

  gesture(speed: number, pan: number, compact: boolean) {
    if (!this.enabled || !this.context || !this.master || this.context.state !== "running") return;
    const now = performance.now();
    const strength = Math.min(1, Math.max(0, (speed - 45) / 1050));
    if (strength <= 0.015) return;

    const rustleGap = compact ? 120 : 78;
    if (now - this.lastRustle > rustleGap) {
      this.lastRustle = now;
      this.rustle(strength, pan);
    }

    const chimeGap = compact ? 410 : 265;
    if (strength > 0.28 && now - this.lastChime > chimeGap) {
      this.lastChime = now;
      this.chime(strength, pan);
      if (Math.random() > 0.72) {
        const timer = window.setTimeout(() => {
          this.chime(strength * 0.28, Math.max(-1, Math.min(1, pan + (Math.random() - 0.5) * 0.3)));
          this.timers.delete(timer);
        }, 150 + Math.random() * 130);
        this.timers.add(timer);
      }
    }
  }

  dispose() {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers.clear();
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  private createNoiseBuffer(context: AudioContext) {
    const duration = 0.14;
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const envelope = Math.sin((i / data.length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
    return buffer;
  }

  private rustle(strength: number, pan: number) {
    const context = this.context;
    const master = this.master;
    if (!context || !master || !this.noiseBuffer) return;
    const now = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createStereoPanner();

    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 0.78 + strength * 0.72;
    filter.type = "bandpass";
    filter.frequency.value = 420 + strength * 1250;
    filter.Q.value = 0.65 + strength * 0.8;
    panner.pan.value = pan;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.012 + strength * 0.035, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    source.connect(filter).connect(gain).connect(panner).connect(master);
    source.start(now);
    source.stop(now + 0.14);
  }

  private chime(strength: number, pan: number) {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const now = context.currentTime;
    const base = 420 + strength * 260 + Math.random() * 55;
    const panner = context.createStereoPanner();
    const bus = context.createGain();
    panner.pan.value = pan;
    bus.gain.value = 0.15;
    bus.connect(panner).connect(master);

    [
      { ratio: 1, gain: 0.045, decay: 0.62 },
      { ratio: 1.43, gain: 0.026, decay: 0.39 },
      { ratio: 2.11, gain: 0.014, decay: 0.24 },
    ].forEach((partial) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = base * partial.ratio;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(partial.gain * (0.35 + strength * 0.65), now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
      oscillator.connect(gain).connect(bus);
      oscillator.start(now);
      oscillator.stop(now + partial.decay + 0.03);
    });
  }
}
