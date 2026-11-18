// Prismfall's sound: every effect is a small WebAudio oscillator phrase made
// in code, so the game ships no audio files. The engine stays silent until
// the first player gesture unlocks the browser's audio context.

export class SoundEngine {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.context.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(frequency, seconds, { type = 'square', slideTo = null, delay = 0, volume = 1 } = {}) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  paddleBounce() {
    this.tone(220, 0.07, { type: 'triangle', slideTo: 330 });
  }

  wallBounce() {
    this.tone(180, 0.05, { type: 'triangle', volume: 0.6 });
  }

  prismCrack(tier) {
    this.tone(500 + tier * 90, 0.06, { type: 'square', volume: 0.7 });
  }

  prismShatter(tier) {
    const base = 620 + tier * 110;
    this.tone(base, 0.1, { type: 'square', slideTo: base * 1.6 });
    this.tone(base * 1.5, 0.14, { type: 'triangle', delay: 0.03, volume: 0.8 });
  }

  powerupCaught() {
    this.tone(660, 0.08, { type: 'sine' });
    this.tone(880, 0.1, { type: 'sine', delay: 0.06 });
    this.tone(1320, 0.14, { type: 'sine', delay: 0.12 });
  }

  shieldLost() {
    this.tone(320, 0.3, { type: 'sawtooth', slideTo: 70, volume: 0.9 });
  }

  waveCleared() {
    for (let i = 0; i < 4; i++) this.tone(523 * Math.pow(1.25, i), 0.12, { type: 'triangle', delay: i * 0.07 });
  }

  gameStarted() {
    this.tone(392, 0.1, { type: 'triangle' });
    this.tone(587, 0.12, { type: 'triangle', delay: 0.08 });
  }

  gameOver() {
    this.tone(392, 0.22, { type: 'triangle' });
    this.tone(311, 0.22, { type: 'triangle', delay: 0.18 });
    this.tone(233, 0.4, { type: 'triangle', delay: 0.36 });
  }

  victory() {
    const notes = [523, 659, 784, 1046, 784, 1046];
    notes.forEach((note, i) => this.tone(note, 0.16, { type: 'triangle', delay: i * 0.11 }));
  }
}
