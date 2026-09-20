// Tiny Web Audio synth: no external assets. Created lazily after the first
// user interaction (browsers block autoplay).
export class AudioFx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.lastPlay = {};
  }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  // Named effects; `vol` scales loudness, rate-limited per name.
  play(name, vol = 1) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (this.lastPlay[name] && now - this.lastPlay[name] < 45) return;
    this.lastPlay[name] = now;
    switch (name) {
      case 'pick':   this.tone(520, 0.08, 'triangle', 0.18 * vol, 240); break;
      case 'place':  this.tone(420, 0.07, 'triangle', 0.16 * vol, -120); break;
      case 'take':   this.tone(360, 0.07, 'sine', 0.12 * vol, 90); break;
      case 'coin':   this.tone(1240, 0.09, 'square', 0.08 * vol); this.tone(1660, 0.16, 'square', 0.08 * vol, 0, 0.06); break;
      case 'buy':    this.tone(392, 0.1, 'triangle', 0.2 * vol); this.tone(523, 0.1, 'triangle', 0.2 * vol, 0, 0.09); this.tone(659, 0.18, 'triangle', 0.2 * vol, 0, 0.18); break;
      case 'unlock': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22 * vol, 0, i * 0.09)); this.tone(130, 0.5, 'sawtooth', 0.05 * vol, 40); break;
      case 'error':  this.tone(180, 0.15, 'sawtooth', 0.12 * vol, -60); break;
      case 'click':  this.tone(800, 0.04, 'square', 0.06 * vol); break;
    }
  }
}
