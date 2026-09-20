// Shared behaviour for every walking figure: movement, animation phase,
// facing direction, path following and the visible carried stack.
import { TILE } from '../config.js';
import { damp, seededRandom } from '../utils.js';

const SKIN = ['#ffd9b8', '#f2c29b', '#d9a06b', '#b87a4b', '#8d5a34', '#ffe0c7'];
const HAIR = ['#2b1b12', '#4a2c17', '#8a5a2b', '#d8a24a', '#e8d18f', '#b03a2e', '#3b3b3b', '#f0e6d2', '#6b3fa0'];
const TOPS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#ff922b', '#20c997', '#845ef7'];
const PANTS = ['#2f3e56', '#4b5563', '#7a5230', '#1f5fa8', '#3c3c3c', '#6d597a', '#355c7d', '#8b4513'];
const SHOES = ['#3b2a1a', '#222', '#8b0000', '#f5f5f5', '#1f3a5f'];
export const HAIRSTYLES = ['short', 'bob', 'bun', 'spiky', 'cap', 'long', 'curly', 'bald'];

export function makeAppearance(seed, overrides = {}) {
  const r = seededRandom(seed);
  const p = (arr) => arr[Math.floor(r() * arr.length)];
  return {
    skin: p(SKIN), hair: p(HAIR), top: p(TOPS), pants: p(PANTS), shoes: p(SHOES),
    hairstyle: p(HAIRSTYLES),
    height: 0.9 + r() * 0.25,
    width: 0.9 + r() * 0.25,
    glasses: r() < 0.18,
    bag: r() < 0.3,
    ...overrides,
  };
}

export class Character {
  constructor(x, y, appearance) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = 16;
    this.speed = 150;
    this.faceX = 0; this.faceY = 1;    // facing direction (unit-ish)
    this.walkPhase = 0;
    this.moving = false;
    this.moveAmount = 0;               // 0..1 smoothed "how much we walk"
    this.look = appearance;
    this.stack = { items: [], sway: [], bounce: 0 };
    this.pending = 0;                  // items flying towards the stack
    this.path = null;
    this.pathIndex = 0;
    this.stackCapacity = 4;
    this.bornAt = performance.now();
    this.dead = false;
  }

  get sortY() { return this.y + this.radius * 0.6; }
  get stackFull() { return this.stack.items.length + this.pending >= this.stackCapacity; }
  get stackCount() { return this.stack.items.length; }
  get stackType() { return this.stack.items.length ? this.stack.items[this.stack.items.length - 1] : null; }
  get stackTopY() { return this.y - 62 * this.look.height - this.stack.items.length * 9; }

  // Called after movement with the per-frame displacement.
  animate(dt, dx, dy) {
    const moved = Math.hypot(dx, dy);
    this.moving = moved > 0.5 * dt * 60 * 0.1;
    const target = Math.min(1, moved / (dt * this.speed + 1e-6));
    this.moveAmount = damp(this.moveAmount, this.moving ? target : 0, 0.08, dt);
    if (this.moving) {
      this.walkPhase += dt * 11 * Math.max(0.4, target);
      const len = moved || 1;
      this.faceX = damp(this.faceX, dx / len, 0.05, dt);
      this.faceY = damp(this.faceY, dy / len, 0.05, dt);
    }
    // stack sway follows movement with lag; each level lags a bit more
    const s = this.stack;
    while (s.sway.length < s.items.length) s.sway.push({ x: 0, y: 0 });
    s.sway.length = s.items.length;
    let prevX = -dx * 1.2, prevY = -dy * 0.4;
    for (let i = 0; i < s.sway.length; i++) {
      const sw = s.sway[i];
      const lag = 0.05 + i * 0.012;
      sw.x = damp(sw.x, prevX * (1 + i * 0.35), lag, dt);
      sw.y = damp(sw.y, prevY * (1 + i * 0.25), lag, dt);
      prevX = sw.x; prevY = sw.y;
    }
    s.bounce = Math.max(0, s.bounce - dt * 4);
  }

  // Follow this.path; returns true when the final waypoint is reached.
  followPath(dt, world, speedMult = 1) {
    if (!this.path || this.pathIndex >= this.path.length) { this.animate(dt, 0, 0); return true; }
    const wp = this.path[this.pathIndex];
    let dx = wp.x - this.x, dy = wp.y - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * speedMult * dt;
    const last = this.pathIndex === this.path.length - 1;
    if (d <= step || d < (last ? 2 : TILE * 0.28)) {
      if (last) {
        const nx = wp.x, ny = wp.y;
        const mdx = nx - this.x, mdy = ny - this.y;
        this.x = nx; this.y = ny;
        this.pathIndex++;
        this.animate(dt, mdx, mdy);
        return true;
      }
      this.pathIndex++;
      return this.followPath(dt, world, speedMult);
    }
    dx = dx / d * step; dy = dy / d * step;
    // NPCs push against furniture too (safety net when steering nudges them)
    const res = world.moveCircle(this.x, this.y, this.radius * 0.6, dx + (this.sepX || 0) * dt, dy + (this.sepY || 0) * dt);
    const mdx = res.x - this.x, mdy = res.y - this.y;
    this.x = res.x; this.y = res.y;
    this.animate(dt, mdx, mdy);
    this.stuckTime = (Math.hypot(mdx, mdy) < step * 0.2) ? (this.stuckTime || 0) + dt : 0;
    return false;
  }

  setPath(path) { this.path = path; this.pathIndex = 0; this.stuckTime = 0; }

  // allowMixed=false keeps a single product type on the stack (player rule).
  addToStack(type, allowMixed = false) {
    if (!allowMixed && this.stack.items.length && this.stack.items[0] !== type) return false;
    if (this.stackFull) return false;
    this.stack.items.push(type);
    this.stack.bounce = 1;
    return true;
  }

  takeFromStack(type = null) {
    const items = this.stack.items;
    if (!items.length) return null;
    let i = items.length - 1;
    if (type) { i = items.lastIndexOf(type); if (i < 0) return null; }
    return items.splice(i, 1)[0];
  }

  clearStack() { this.stack.items.length = 0; }
}
