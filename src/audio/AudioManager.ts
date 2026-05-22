// Procedural audio generator for casino ambiance
// No external files needed - everything is synthesized

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceInterval: ReturnType<typeof setInterval> | null = null;
  private isPlaying = false;

  private init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  startAmbience() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Continuous low background hum (HVAC)
    this.playHVACHum();

    // Random ambient events
    this.ambienceInterval = setInterval(() => {
      const r = Math.random();
      if (r < 0.15) this.playSlotChime();
      else if (r < 0.25) this.playChipClack();
      else if (r < 0.32) this.playDistantMurmur();
      else if (r < 0.36) this.playPADing();
    }, 2000);
  }

  stopAmbience() {
    this.isPlaying = false;
    if (this.ambienceInterval) {
      clearInterval(this.ambienceInterval);
      this.ambienceInterval = null;
    }
  }

  setVolume(vol: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
    }
  }

  // Card deal sound - crisp snap
  playCardDeal() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const noise = this.createNoiseBuffer(0.06);
    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    source.connect(filter).connect(gain).connect(this.masterGain);
    source.start(now);
    source.stop(now + 0.06);
  }

  // Chip sound - ceramic clack
  playChipMove() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Multiple short clicks for stacking sound
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.04 + Math.random() * 0.02;
      const osc = this.ctx.createOscillator();
      osc.frequency.value = 3000 + Math.random() * 2000;
      osc.type = 'sine';

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.03);

      osc.connect(gain).connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.04);
    }
  }

  // Card flip
  playCardFlip() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const noise = this.createNoiseBuffer(0.08);
    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    source.connect(filter).connect(gain).connect(this.masterGain);
    source.start(now);
    source.stop(now + 0.08);
  }

  // Fold sound - soft card slide
  playFold() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const noise = this.createNoiseBuffer(0.15);
    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.frequency.linearRampToValueAtTime(500, now + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.15);

    source.connect(filter).connect(gain).connect(this.masterGain);
    source.start(now);
    source.stop(now + 0.15);
  }

  // Win sound - satisfying chip cascade
  playWin() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 8; i++) {
      const offset = i * 0.06 + Math.random() * 0.03;
      const osc = this.ctx.createOscillator();
      osc.frequency.value = 2500 + Math.random() * 3000;
      osc.type = 'sine';

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);

      osc.connect(gain).connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.07);
    }
  }

  // --- Background ambience sounds ---

  private playHVACHum() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const noise = this.createNoiseBuffer(30);
    const source = this.ctx.createBufferSource();
    source.buffer = noise;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;

    source.connect(filter).connect(gain).connect(this.masterGain);
    source.start(now);
  }

  private playSlotChime() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const notes = [523, 659, 784, 1047]; // C major arpeggio
    const note = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    osc.frequency.value = note;
    osc.type = 'sine';

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    // Pan it to one side for spatial effect
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.6;

    osc.connect(gain).connect(pan).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  private playChipClack() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const noise = this.createNoiseBuffer(0.04);
    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4000 + Math.random() * 2000;
    filter.Q.value = 5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    const pan = this.ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 2;

    source.connect(filter).connect(gain).connect(pan).connect(this.masterGain);
    source.start(now);
    source.stop(now + 0.04);
  }

  private playDistantMurmur() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const noise = this.createNoiseBuffer(0.5);
    const source = this.ctx.createBufferSource();
    source.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300 + Math.random() * 200;
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    source.connect(filter).connect(gain).connect(this.masterGain);
    source.start(now);
    source.stop(now + 0.5);
  }

  private playPADing() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Two-tone PA ding
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      osc.frequency.value = i === 0 ? 880 : 660;
      osc.type = 'sine';

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.03, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.3 + 0.4);

      osc.connect(gain).connect(this.masterGain);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.4);
    }
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not initialized');
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

export const audioManager = new AudioManager();
