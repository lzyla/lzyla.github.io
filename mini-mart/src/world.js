// World: tile grid, unlocked sections, obstacles and pathfinding.
import { TILE, MAP_COLS, MAP_ROWS, SECTIONS, DOOR } from './config.js';

export class World {
  constructor() {
    this.cols = MAP_COLS;
    this.rows = MAP_ROWS;
    this.width = MAP_COLS * TILE;
    this.height = MAP_ROWS * TILE;
    this.unlocked = new Set();
    this.objects = [];            // stations / shelves / checkouts (built)
    this.blocked = new Uint8Array(MAP_COLS * MAP_ROWS);
    this.floor = new Uint8Array(MAP_COLS * MAP_ROWS); // 0 grass, 1 floor, 2 pavement
    this.sectionAnim = new Map(); // sectionId -> unlock time (for reveal animation)
    this.pathCache = new Map();
    for (const [id, s] of Object.entries(SECTIONS)) if (s.builtIn) this.unlockSection(id, true);
  }

  idx(c, r) { return r * this.cols + c; }
  inBounds(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
  isBlocked(c, r) { return !this.inBounds(c, r) || this.blocked[this.idx(c, r)] === 1; }

  unlockSection(id, silent = false) {
    if (this.unlocked.has(id)) return;
    this.unlocked.add(id);
    if (!silent) this.sectionAnim.set(id, performance.now());
    this.rebuild();
  }

  addObject(obj) {
    this.objects.push(obj);
    this.rebuild();
  }

  getObject(id) { return this.objects.find((o) => o.id === id); }

  sectionAt(c, r) {
    for (const [id, s] of Object.entries(SECTIONS)) {
      if (c >= s.x && c < s.x + s.w && r >= s.y && r < s.y + s.h) return id;
    }
    return null;
  }

  // Recompute the floor + blocked grids from unlocked sections and objects.
  rebuild() {
    this.blocked.fill(1);
    this.floor.fill(0);
    for (const id of this.unlocked) {
      const s = SECTIONS[id];
      for (let r = s.y; r < s.y + s.h; r++) for (let c = s.x; c < s.x + s.w; c++) {
        const i = this.idx(c, r);
        this.blocked[i] = 0;
        this.floor[i] = s.outdoor ? 2 : 1;
      }
    }
    // bottom wall between the shop and the pavement, with a gap for the door
    const walk = SECTIONS.walk;
    for (let c = walk.x; c < walk.x + walk.w; c++) if (Math.abs(c + 0.5 - DOOR.x) > 1.6) this.blocked[this.idx(c, walk.y)] = 1;
    for (const o of this.objects) {
      for (let r = o.ty; r < o.ty + o.th; r++) for (let c = o.tx; c < o.tx + o.tw; c++) {
        if (this.inBounds(c, r)) this.blocked[this.idx(c, r)] = 1;
      }
    }
    this.pathCache.clear();
  }

  // Circle vs. blocked-tile collision. Moves (x,y) by (dx,dy) resolving each
  // axis separately so the mover slides along walls.
  moveCircle(x, y, r, dx, dy) {
    x = this.slideAxis(x, y, r, dx, true);
    y = this.slideAxis(x, y, r, dy, false);
    return { x, y };
  }

  // Move along one axis as far as possible (binary refinement keeps motion
  // smooth when brushing against furniture).
  slideAxis(x, y, r, d, horizontal) {
    if (d === 0) return horizontal ? x : y;
    const test = (t) => horizontal ? this.circleHits(x + d * t, y, r) : this.circleHits(x, y + d * t, r);
    if (!test(1)) return (horizontal ? x : y) + d;
    let lo = 0, hi = 1;
    for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (test(m)) hi = m; else lo = m; }
    return (horizontal ? x : y) + d * lo;
  }

  circleHits(x, y, r) {
    const c0 = Math.floor((x - r) / TILE), c1 = Math.floor((x + r) / TILE);
    const r0 = Math.floor((y - r) / TILE), r1 = Math.floor((y + r) / TILE);
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      if (!this.isBlocked(cc, rr)) continue;
      // closest point on tile AABB to the circle center
      const px = Math.max(cc * TILE, Math.min(x, cc * TILE + TILE));
      const py = Math.max(rr * TILE, Math.min(y, rr * TILE + TILE));
      if ((px - x) ** 2 + (py - y) ** 2 < r * r) return true;
    }
    return false;
  }

  // If a circle sits inside an obstacle (e.g. furniture was just built on top
  // of it), move it to the centre of the nearest free tile.
  ejectCircle(x, y, r) {
    if (!this.circleHits(x, y, r)) return { x, y };
    const free = this.nearestFree(Math.floor(x / TILE), Math.floor(y / TILE), 6);
    if (!free) return { x, y };
    return { x: free.c * TILE + TILE / 2, y: free.r * TILE + TILE / 2 };
  }

  // Simple but complete A* over the tile grid (8 directions, no corner cutting).
  findPath(fromX, fromY, toX, toY) {
    const sc = Math.floor(fromX / TILE), sr = Math.floor(fromY / TILE);
    const tc = Math.floor(toX / TILE), tr = Math.floor(toY / TILE);
    const start = this.nearestFree(sc, sr);
    const goal = this.nearestFree(tc, tr);
    if (!start || !goal) return null;
    const key = `${start.c},${start.r}>${goal.c},${goal.r}`;
    if (this.pathCache.has(key)) return this.finishPath(this.pathCache.get(key), toX, toY);

    const cols = this.cols, rows = this.rows, N = cols * rows;
    const g = new Float32Array(N).fill(Infinity);
    const f = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const open = [];
    const si = this.idx(start.c, start.r), gi = this.idx(goal.c, goal.r);
    const h = (i) => { const c = i % cols, r = (i / cols) | 0; return Math.hypot(c - goal.c, r - goal.r); };
    g[si] = 0; f[si] = h(si); open.push(si);
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false;
    let guard = 0;
    while (open.length && guard++ < 20000) {
      // pick lowest f (open list is small; linear scan is fine for 720 cells)
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const cur = open[bi];
      open[bi] = open[open.length - 1]; open.pop();
      if (cur === gi) { found = true; break; }
      closed[cur] = 1;
      const cc = cur % cols, cr = (cur / cols) | 0;
      for (const [dc, dr, cost] of dirs) {
        const nc = cc + dc, nr = cr + dr;
        if (this.isBlocked(nc, nr)) continue;
        if (dc !== 0 && dr !== 0 && (this.isBlocked(cc + dc, cr) || this.isBlocked(cc, cr + dr))) continue;
        const ni = this.idx(nc, nr);
        if (closed[ni]) continue;
        const ng = g[cur] + cost;
        if (ng < g[ni]) {
          g[ni] = ng; f[ni] = ng + h(ni); came[ni] = cur;
          if (!open.includes(ni)) open.push(ni);
        }
      }
    }
    if (!found) return null;
    const tiles = [];
    for (let i = gi; i !== -1; i = came[i]) tiles.push({ x: (i % cols) * TILE + TILE / 2, y: ((i / cols) | 0) * TILE + TILE / 2 });
    tiles.reverse();
    this.pathCache.set(key, tiles);
    return this.finishPath(tiles, toX, toY);
  }

  // Replace the last waypoint by the exact target and drop the first waypoint
  // when the mover is already in that tile (avoids walking backwards).
  finishPath(tiles, toX, toY) {
    const path = tiles.slice(1);
    if (path.length === 0) path.push({ x: toX, y: toY }); else path[path.length - 1] = { x: toX, y: toY };
    return path;
  }

  nearestFree(c, r, maxD = 3) {
    if (!this.isBlocked(c, r)) return { c, r };
    for (let d = 1; d <= maxD; d++) {
      for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue;
        if (!this.isBlocked(c + dc, r + dr)) return { c: c + dc, r: r + dr };
      }
    }
    return null;
  }
}
