// Smooth-follow camera with map clamping and viewport-aware zoom.
import { TILE } from './config.js';
import { clamp, damp } from './utils.js';

export class Camera {
  constructor(world) {
    this.world = world;
    this.x = world.width / 2; this.y = world.height / 2;   // world point at the view centre
    this.zoom = 1;
    this.viewW = 800; this.viewH = 600;
    this.shake = 0;
  }

  resize(w, h) {
    this.viewW = w; this.viewH = h;
    // Show roughly 16 tiles across on wide screens, but never fewer than ~9
    // tiles on a narrow phone; clamp so sprites stay crisp and readable.
    const byW = w / (TILE * 22), byH = h / (TILE * 12.5);
    this.zoom = clamp(Math.min(byW, byH), 0.5, 1.0);
    if (w < 600) this.zoom = clamp(w / (TILE * 9.5), 0.55, 0.85);
    else if (h < 450) this.zoom = clamp(h / (TILE * 8.5), 0.5, 0.9);
  }

  follow(tx, ty, dt, snap = false) {
    if (snap) { this.x = tx; this.y = ty; } else {
      this.x = damp(this.x, tx, 0.12, dt);
      this.y = damp(this.y, ty, 0.12, dt);
    }
    const halfW = this.viewW / 2 / this.zoom, halfH = this.viewH / 2 / this.zoom;
    if (this.world.width > halfW * 2) this.x = clamp(this.x, halfW, this.world.width - halfW); else this.x = this.world.width / 2;
    if (this.world.height > halfH * 2) this.y = clamp(this.y, halfH, this.world.height - halfH); else this.y = this.world.height / 2;
    this.shake = Math.max(0, this.shake - dt * 3);
  }

  // Top-left world coordinate of the view.
  get left() { return this.x - this.viewW / 2 / this.zoom; }
  get top() { return this.y - this.viewH / 2 / this.zoom; }

  apply(ctx, dpr = 1) {
    ctx.setTransform(this.zoom * dpr, 0, 0, this.zoom * dpr, 0, 0);
    const sx = this.shake ? (Math.random() - 0.5) * 6 * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * 6 * this.shake : 0;
    ctx.translate(-this.left + sx, -this.top + sy);
  }

  worldToScreen(x, y) { return { x: (x - this.left) * this.zoom, y: (y - this.top) * this.zoom }; }

  visible(x, y, pad = 120) {
    return x > this.left - pad && x < this.left + this.viewW / this.zoom + pad && y > this.top - pad && y < this.top + this.viewH / this.zoom + pad;
  }
}
