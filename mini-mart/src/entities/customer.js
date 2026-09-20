// Autonomous shopper. State machine:
// ENTER → CHOOSE_PRODUCT → GO_TO_SHELF → TAKE_PRODUCT → GO_TO_CHECKOUT → QUEUE → PAY → LEAVE
import { TILE, PRODUCTS, BALANCE, SPAWN, DOOR } from '../config.js';
import { Character, makeAppearance } from './character.js';
import { pick, randInt, dist } from '../utils.js';

let seedCounter = 1000;

export class Customer extends Character {
  constructor(game) {
    super(SPAWN.x * TILE + (Math.random() - 0.5) * 30, SPAWN.y * TILE, makeAppearance((seedCounter++) * 7919 + Date.now() % 1000));
    this.game = game;
    this.speed = BALANCE.customerSpeed * (0.9 + Math.random() * 0.25);
    this.radius = 15 * this.look.width;
    this.stackCapacity = 6;
    this.state = 'ENTER';
    this.basket = [];          // product ids taken
    this.want = null;          // { product, qty, shelf }
    this.waitTimer = 0;
    this.takeTimer = 0;
    this.checkout = null;
    this.timer = 0;
    this.mood = 'ok';          // 'ok' | 'wait' | 'angry' | 'happy' (thought bubble)
    this.moodTimer = 0;
    this.triedProducts = new Set();
    this.extraTrips = (game.builtShelves().length >= 3 && Math.random() < 0.4) ? 1 : 0;
    this.setPath(game.world.findPath(this.x, this.y, DOOR.x * TILE, DOOR.y * TILE) || [{ x: DOOR.x * TILE, y: DOOR.y * TILE }]);
  }

  setMood(m, t = 1.2) { this.mood = m; this.moodTimer = t; }

  update(dt) {
    const g = this.game;
    this.moodTimer -= dt;
    if (this.moodTimer <= 0) this.mood = 'ok';
    // stuck safety: recompute path when not progressing for a while
    if (this.path && this.stuckTime > 1.2 && this.pathIndex < this.path.length) {
      const end = this.path[this.path.length - 1];
      this.setPath(g.world.findPath(this.x, this.y, end.x, end.y) || [end]);
    }

    switch (this.state) {
      case 'ENTER':
        if (this.followPath(dt, g.world)) this.chooseProduct();
        break;

      case 'GO_TO_SHELF':
        if (this.followPath(dt, g.world)) { this.state = 'TAKE_PRODUCT'; this.waitTimer = 0; this.takeTimer = 0.2; }
        // shelf may have been emptied on the way: still walk there and wait.
        break;

      case 'TAKE_PRODUCT': {
        this.animate(dt, 0, 0);
        const shelf = this.want.shelf;
        this.faceX = 0; this.faceY = -1;
        if (shelf.count > 0 && this.want.qty > 0) {
          this.takeTimer -= dt;
          if (this.takeTimer <= 0) {
            this.takeTimer = 0.45;
            shelf.remove(g.now);
            shelf.reserved = Math.max(0, shelf.reserved - 1);
            this.want.qty--;
            this.basket.push(this.want.product);
            this.pending++;
            g.fx.flyItem(this.want.product, shelf.slotPos(shelf.count, shelf.capacity(g.eco.level('shelf'))), this, () => { this.pending--; this.addToStack(this.want.product, true); });
            g.audio.play('take');
            if (this.want.qty === 0) this.afterTaking();
          }
        } else if (this.want.qty > 0) {
          this.waitTimer += dt;
          if (this.waitTimer > 0.8) this.setMood('wait', 0.5);
          if (this.waitTimer > BALANCE.customerPatience) {
            shelf.reserved = Math.max(0, shelf.reserved - this.want.qty);
            this.want.qty = 0;
            if (this.basket.length) this.goToCheckout();
            else if (Math.random() < 0.7) { this.setMood('wait', 1); this.chooseProduct(); }
            else { this.setMood('angry', 3); this.leave(); g.stats.lostCustomers++; }
          }
        }
        break;
      }

      case 'GO_TO_CHECKOUT':
        if (this.followPath(dt, g.world)) this.state = 'QUEUE';
        break;

      case 'QUEUE': {
        const co = this.checkout;
        const idx = co.indexOf(this);
        const slot = co.queueSlot(Math.max(0, idx));
        const d = dist(this.x, this.y, slot.x, slot.y);
        if (d > 3) {
          const dx = slot.x - this.x, dy = slot.y - this.y;
          const step = Math.min(d, this.speed * dt);
          const res = g.world.moveCircle(this.x, this.y, this.radius * 0.5, dx / d * step, dy / d * step);
          const mdx = res.x - this.x, mdy = res.y - this.y;
          this.x = res.x; this.y = res.y;
          this.animate(dt, mdx, mdy);
        } else {
          this.animate(dt, 0, 0);
          this.faceX = 0; this.faceY = -1;
        }
        this.atSlot = d <= 6;
        if (idx > 0 && Math.random() < dt * 0.15) this.setMood('wait', 0.6);
        // nobody serving here for a while? move to a staffed checkout if any
        this.queueWait = (this.queueWait || 0) + dt;
        if (!co.active && this.queueWait > 4) {
          const alt = this.pickCheckout();
          if (alt !== co && alt.active) { this.goToCheckout(); }
          this.queueWait = 0;
        }
        break;
      }

      case 'PAY':
        this.animate(dt, 0, 0);
        this.timer -= dt;
        if (this.timer <= 0) this.leave();
        break;

      case 'LEAVE':
        if (this.followPath(dt, g.world)) this.dead = true;
        break;
    }
  }

  // Pick a product to buy. Prefers shelves with stock; avoids repeats.
  chooseProduct() {
    const g = this.game;
    const shelves = g.builtShelves().filter((s) => !this.triedProducts.has(s.product));
    if (!shelves.length) { this.basket.length ? this.goToCheckout() : this.leave(); return; }
    const stocked = shelves.filter((s) => s.count - s.reserved > 0);
    const pool = stocked.length && Math.random() < 0.85 ? stocked : shelves;
    // weight cheaper goods a bit higher so the early game stays lively
    const shelf = pick(pool);
    const price = PRODUCTS[shelf.product].price;
    const maxQty = price >= 24 ? 2 : 3;
    const qty = Math.max(1, Math.min(maxQty, randInt(1, maxQty), Math.max(1, shelf.count - shelf.reserved)));
    this.triedProducts.add(shelf.product);
    this.want = { product: shelf.product, qty, shelf };
    shelf.reserved += qty;
    const stand = pick(shelf.stands);
    this.state = 'GO_TO_SHELF';
    this.setPath(g.world.findPath(this.x, this.y, stand.x + (Math.random() - 0.5) * 14, stand.y) || [stand]);
  }

  afterTaking() {
    if (this.extraTrips > 0 && this.game.builtShelves().length > this.triedProducts.size) {
      this.extraTrips--;
      this.chooseProduct();
    } else {
      this.goToCheckout();
    }
  }

  // Prefer staffed checkouts; among those the shortest queue.
  pickCheckout() {
    const checkouts = this.game.builtCheckouts();
    const staffed = checkouts.filter((c) => c.active);
    const pool = staffed.length ? staffed : checkouts;
    let best = pool[0];
    for (const c of pool) if (c.queue.length < best.queue.length) best = c;
    return best;
  }

  goToCheckout() {
    const g = this.game;
    const best = this.pickCheckout();
    if (this.checkout) this.checkout.dequeue(this);
    this.checkout = best;
    this.queueWait = 0;
    best.enqueue(this);
    const slot = best.queueSlot(best.indexOf(this));
    this.state = 'GO_TO_CHECKOUT';
    this.setPath(g.world.findPath(this.x, this.y, slot.x, slot.y) || [slot]);
  }

  // Called by the checkout when served.
  pay() {
    const g = this.game;
    let total = 0;
    for (const p of this.basket) total += PRODUCTS[p].price;
    total = Math.round(total * g.eco.priceMult());
    this.checkout.dequeue(this);
    g.earn(total, this.x, this.y - 40);
    g.stats.customersServed++;
    this.clearStack();
    this.setMood('happy', 1.5);
    this.state = 'PAY';
    this.timer = 0.5;
    this.faceX = 0; this.faceY = 1;
  }

  leave() {
    const g = this.game;
    if (this.checkout) { this.checkout.dequeue(this); }
    if (this.want && this.want.qty > 0) { this.want.shelf.reserved = Math.max(0, this.want.shelf.reserved - this.want.qty); this.want.qty = 0; }
    this.state = 'LEAVE';
    const target = { x: SPAWN.x * TILE + (Math.random() - 0.5) * 60, y: SPAWN.y * TILE };
    this.setPath(g.world.findPath(this.x, this.y, target.x, target.y) || [target]);
  }
}
