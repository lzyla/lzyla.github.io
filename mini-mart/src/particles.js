// Visual effects: particles, floating texts and flying product tweens.
import { ease, rand, roundRect } from './utils.js';
import { drawProduct, drawCoin } from './render/sprites.js';

const MAX_PARTICLES = 220;

export class Effects {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.flights = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt * 1.5;
      p.rot += p.spin * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 38 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      f.t += dt / f.dur;
      if (f.t >= 1) { this.flights.splice(i, 1); f.onArrive && f.onArrive(); }
    }
  }

  // ------------------------------------------------------------- spawners
  burst(x, y, kind, n = 10) {
    if (this.particles.length > MAX_PARTICLES) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(60, 200);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, gravity: kind === 'coin' ? 420 : 260,
        life: rand(0.5, 0.9), maxLife: 0.9, kind, rot: rand(0, 6), spin: rand(-6, 6), size: rand(4, 8),
        color: kind === 'confetti' ? ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2'][i % 5] : kind === 'dust' ? '#c9b58a' : '#fff',
      });
    }
  }

  coins(x, y, n = 6) { this.burst(x, y, 'coin', n); }
  sparkle(x, y, n = 8) { this.burst(x, y, 'sparkle', n); }
  confetti(x, y, n = 24) { this.burst(x, y, 'confetti', n); }

  text(x, y, str, color = '#2b7a0b', size = 22) {
    this.texts.push({ x, y, str, color, size, life: 1.1, maxLife: 1.1 });
  }

  // A product flies from a world point to a character's stack top.
  flyItem(type, from, targetChar, onArrive) {
    this.flights.push({ type, from: { x: from.x, y: from.y }, target: targetChar, t: 0, dur: 0.32, onArrive, arc: 60 });
  }

  // A product flies from a character's stack to the next free slot of a shelf.
  flyToShelf(type, fromChar, shelf, capacity, onArrive) {
    const slot = shelf.slotPos(shelf.count + (shelf.incoming || 0) - 1, capacity);
    this.flights.push({ type, fromChar, to: { x: slot.x, y: slot.y }, t: 0, dur: 0.28, onArrive, arc: 40 });
  }

  // ---------------------------------------------------------------- render
  renderWorld(ctx) {
    for (const f of this.flights) {
      const t = ease.inOutQuad(Math.min(1, f.t));
      const from = f.fromChar ? { x: f.fromChar.x, y: f.fromChar.stackTopY } : f.from;
      const to = f.target ? { x: f.target.x + (f.target.stack.sway[0]?.x || 0), y: f.target.stackTopY - 8 } : f.to;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * f.arc;
      const s = 0.9 + Math.sin(t * Math.PI) * 0.3;
      drawProduct(ctx, f.type, x, y, s);
    }
    for (const p of this.particles) {
      const a = Math.min(1, p.life / 0.3);
      ctx.globalAlpha = a;
      if (p.kind === 'coin') drawCoin(ctx, p.x, p.y, p.size * 0.9, p.rot);
      else if (p.kind === 'sparkle') {
        ctx.fillStyle = '#fff7c2';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { const ang = p.rot + i * Math.PI / 2; ctx.lineTo(p.x + Math.cos(ang) * p.size, p.y + Math.sin(ang) * p.size); ctx.lineTo(p.x + Math.cos(ang + Math.PI / 4) * p.size * 0.35, p.y + Math.sin(ang + Math.PI / 4) * p.size * 0.35); }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        roundRect(ctx, -p.size / 2, -p.size / 3, p.size, p.size * 0.66, 2); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    for (const t of this.texts) {
      const a = Math.min(1, t.life / 0.35);
      const s = t.life > t.maxLife - 0.15 ? ease.outBack((t.maxLife - t.life) / 0.15) : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(t.x, t.y); ctx.scale(s, s);
      ctx.font = `800 ${t.size}px "Nunito", "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineJoin = 'round';
      ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
  }
}
