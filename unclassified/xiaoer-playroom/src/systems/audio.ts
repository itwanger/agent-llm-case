/** Gesture-unlocked, local procedural audio. No music downloads or autoplay. */
export class RoomAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices: OscillatorNode[] = [];
  private enabled = false;
  private lastNote = 0;
  async toggle() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      [130.81, 196, 261.63, 329.63].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator(),
          gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = i % 2 ? 3 : -3;
        gain.gain.value = 0.009;
        osc.connect(gain);
        gain.connect(this.master!);
        osc.start();
        this.voices.push(osc);
      });
    }
    await this.ctx.resume();
    this.enabled = !this.enabled;
    this.master!.gain.setTargetAtTime(this.enabled ? 1 : 0, this.ctx.currentTime, 0.4);
    return this.enabled;
  }
  update(time: number, music: boolean) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const interval = music ? 0.34 : 4.5;
    if (time - this.lastNote < interval) return;
    this.lastNote = time;
    const notes = music ? [523.25, 587.33, 659.25, 783.99, 880] : [523.25, 659.25, 783.99];
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = notes[Math.floor(time * 2.7) % notes.length];
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(music ? 0.055 : 0.016, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(now + 0.9);
    osc.onended = () => {
      gain.disconnect();
      osc.disconnect();
    };
  }
  dispose() {
    this.voices.forEach((v) => v.stop());
    void this.ctx?.close();
  }
}
