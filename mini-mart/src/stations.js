// Store furniture: production stations, shelves and checkouts.
import { TILE, PRODUCTS, BALANCE } from './config.js';

let uid = 1;

class WorldObject {
  constructor(def) {
    this.id = def.id;
    this.kind = def.kind;
    this.tx = def.x; this.ty = def.y; this.tw = def.w; this.th = def.h;
    this.x = def.x * TILE; this.y = def.y * TILE;
    this.w = def.w * TILE; this.h = def.h * TILE;
    this.cx = this.x + this.w / 2;
    this.cy = this.y + this.h / 2;
    this.bornAt = performance.now();  // for pop-in animation
    this.uid = uid++;
    const pad = TILE * 0.95;
    this.interactRect = { x: this.x - pad, y: this.y - pad, w: this.w + pad * 2, h: this.h + pad * 2 };
  }
  // y used for depth sorting (bottom edge of the footprint)
  get sortY() { return this.y + this.h; }
}

// ---------------------------------------------------------------------------
export class Station extends WorldObject {
  constructor(def) {
    super(def);
    this.product = def.product;
    this.look = def.look;
    this.stored = Math.min(3, this.capacity); // start stocked so the first seconds feel alive
    this.progress = 0;
    this.pulse = 0;       // small bounce when a unit finishes
    this.lastTakeAt = -1;
    this.slots = this.buildSlots();
  }

  get capacity() { return PRODUCTS[this.product].stationCapacity; }

  update(dt, prodMult) {
    if (this.stored < this.capacity) {
      this.progress += dt * prodMult / PRODUCTS[this.product].productionTime;
      if (this.progress >= 1) { this.progress = 0; this.stored++; this.pulse = 1; }
    } else {
      this.progress = 0;
    }
    this.pulse = Math.max(0, this.pulse - dt * 3);
  }

  take() {
    if (this.stored <= 0) return false;
    this.stored--;
    this.lastTakeAt = performance.now();
    return true;
  }

  // Slot positions (world px) where produced units are drawn.
  buildSlots() {
    const s = [];
    const cap = this.capacity;
    if (this.look === 'field' || this.look === 'bushes') {
      const cols = 3, rows = Math.ceil(cap / cols);
      for (let i = 0; i < cap; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        s.push({ x: this.x + (c + 0.5) * (this.w / cols), y: this.y + (r + 0.55) * (this.h / rows) });
      }
    } else if (this.look === 'tree') {
      const pts = [[-0.28, -0.35], [0.22, -0.42], [-0.05, -0.12], [0.33, -0.1], [-0.36, 0.02], [0.08, 0.14]];
      for (let i = 0; i < cap; i++) s.push({ x: this.cx + pts[i % pts.length][0] * this.w, y: this.y + 0.35 * this.h + pts[i % pts.length][1] * this.h });
    } else {
      // counters (dairy/coop/bakery): items in a row on the front shelf
      for (let i = 0; i < cap; i++) s.push({ x: this.x + (i + 0.5) * (this.w / cap), y: this.y + this.h * 0.78 });
    }
    return s;
  }
}

// ---------------------------------------------------------------------------
export class Shelf extends WorldObject {
  constructor(def) {
    super(def);
    this.product = def.product;
    this.count = 0;
    this.slotAnim = [];   // per-slot timestamp of last change (for pop/shrink)
    this.lastRemoveAt = -1;
    this.lastRemoveSlot = -1;
    this.reserved = 0;    // customers on their way (avoids over-promising stock)
    // Customers stand in front (below) the shelf.
    this.stands = [];
    for (let i = 0; i < this.tw; i++) this.stands.push({ x: this.x + (i + 0.5) * TILE, y: this.y + this.h + TILE * 0.55 });
  }

  capacity(shelfLevel) { return PRODUCTS[this.product].shelfBase + shelfLevel * BALANCE.shelfPerLevel; }

  add(now) {
    this.slotAnim[this.count] = now;
    this.count++;
  }

  remove(now) {
    if (this.count <= 0) return false;
    this.count--;
    this.lastRemoveAt = now;
    this.lastRemoveSlot = this.count;
    return true;
  }

  // Slot layout on the shelf top (max capacity 20)
  slotPos(i, capacity) {
    const perRow = Math.max(4, Math.ceil(capacity / 2));
    const rows = Math.ceil(capacity / perRow);
    const col = i % perRow, row = Math.floor(i / perRow);
    const inner = this.w - 16;
    return { x: this.x + 8 + (col + 0.5) * (inner / perRow), y: this.y + (rows === 1 ? 12 : 4 + row * 14) };
  }
}

// ---------------------------------------------------------------------------
export class Checkout extends WorldObject {
  constructor(def) {
    super(def);
    this.queue = [];        // customers waiting (index 0 is being served)
    this.progress = 0;      // 0..1 serving progress
    this.cashier = null;    // Worker assigned
    this.playerHere = false;
    this.cashierSpot = { x: this.cx, y: this.y - TILE * 0.45 };
    // player zone: the row behind the counter
    this.interactRect = { x: this.x - TILE * 0.4, y: this.y - TILE * 1.05, w: this.w + TILE * 0.8, h: TILE * 1.05 };
    this.lastSaleAt = -1;
  }

  get active() { return this.playerHere || (this.cashier && this.cashier.atPost); }

  queueSlot(i) {
    const frontY = this.y + this.h + TILE * 0.55;
    const step = TILE * 0.8;
    if (i < 3) return { x: this.cx, y: frontY + i * step };
    return { x: this.cx + (i - 2) * step, y: frontY + 2 * step };
  }

  indexOf(customer) { return this.queue.indexOf(customer); }
  enqueue(customer) { this.queue.push(customer); }
  dequeue(customer) { const i = this.queue.indexOf(customer); if (i >= 0) this.queue.splice(i, 1); if (i === 0) this.progress = 0; }
}
