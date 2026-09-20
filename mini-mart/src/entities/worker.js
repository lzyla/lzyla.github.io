// Hired staff. Stocker: IDLE → FIND_SOURCE → COLLECT → FIND_SHELF → DELIVER → IDLE
//               Cashier: GO_TO_POST → AT_POST
import { TILE, BALANCE } from '../config.js';
import { Character, makeAppearance } from './character.js';
import { dist } from '../utils.js';

export class Worker extends Character {
  constructor(game, role, index, x, y) {
    super(x, y, makeAppearance(4242 + index * 331, { top: role === 'cashier' ? '#38bdf8' : '#34d399', apron: true, bag: false }));
    this.game = game;
    this.role = role;
    this.index = index;
    this.radius = 16;
    this.state = role === 'cashier' ? 'GO_TO_POST' : 'IDLE';
    this.timer = 0;
    this.task = null;       // { station, shelf }
    this.checkout = null;
    this.atPost = false;
    this.home = { x, y };
  }

  get speedMult() { return this.game.eco.workerSpeedMult(); }

  update(dt) {
    this.speed = BALANCE.workerBaseSpeed;
    this.stackCapacity = this.game.eco.workerCapacity();
    if (this.path && this.stuckTime > 1.2 && this.pathIndex < this.path.length) {
      const end = this.path[this.path.length - 1];
      this.setPath(this.game.world.findPath(this.x, this.y, end.x, end.y) || [end]);
    }
    if (this.role === 'cashier') this.updateCashier(dt); else this.updateStocker(dt);
  }

  // ---------------------------------------------------------------- cashier
  updateCashier(dt) {
    const g = this.game;
    if (!this.checkout || !g.builtCheckouts().includes(this.checkout)) {
      const free = g.builtCheckouts().filter((c) => !c.cashier || c.cashier === this);
      if (free.length) { this.checkout = free[0]; this.checkout.cashier = this; this.state = 'GO_TO_POST'; this.setPath(g.world.findPath(this.x, this.y, this.checkout.cashierSpot.x, this.checkout.cashierSpot.y)); }
      else { this.animate(dt, 0, 0); return; }
    }
    if (this.state === 'GO_TO_POST') {
      if (this.followPath(dt, g.world, this.speedMult)) { this.state = 'AT_POST'; }
      this.atPost = false;
    } else {
      this.animate(dt, 0, 0);
      this.faceX = 0; this.faceY = 1;
      this.atPost = dist(this.x, this.y, this.checkout.cashierSpot.x, this.checkout.cashierSpot.y) < 12;
      if (!this.atPost) { this.state = 'GO_TO_POST'; this.setPath(g.world.findPath(this.x, this.y, this.checkout.cashierSpot.x, this.checkout.cashierSpot.y)); }
    }
  }

  // ---------------------------------------------------------------- stocker
  updateStocker(dt) {
    const g = this.game;
    switch (this.state) {
      case 'IDLE': {
        this.animate(dt, 0, 0);
        this.timer -= dt;
        if (this.timer > 0) break;
        this.timer = 0.6;
        if (this.stackCount > 0) {
          const shelf = g.shelfFor(this.stackType);
          if (shelf && shelf.count < shelf.capacity(g.eco.level('shelf'))) { this.task = { shelf, station: g.stationFor(shelf.product) }; this.goDeliver(); }
          break;
        }
        const task = this.pickTask();
        if (task) { this.task = task; this.state = 'FIND_SOURCE'; this.setPath(g.world.findPath(this.x, this.y, task.station.cx, task.station.y + task.station.h + TILE * 0.55)); }
        break;
      }
      case 'FIND_SOURCE':
        if (this.followPath(dt, g.world, this.speedMult)) { this.state = 'COLLECT'; this.timer = 0; this.waited = 0; }
        break;
      case 'COLLECT': {
        this.animate(dt, 0, 0);
        this.faceX = 0; this.faceY = -1;
        const st = this.task.station;
        this.timer -= dt;
        if (this.stackFull) { this.goDeliver(); break; }
        if (st.stored > 0) {
          if (this.timer <= 0) {
            this.timer = BALANCE.collectInterval * 1.2;
            st.take();
            this.pending++;
            g.fx.flyItem(st.product, st.slots[Math.min(st.stored, st.slots.length - 1)], this, () => { this.pending--; this.addToStack(st.product); });
            g.audio.play('pick', 0.4);
          }
        } else {
          this.waited += dt;
          if (this.waited > (this.stackCount ? 1.5 : 5)) { if (this.stackCount) this.goDeliver(); else { this.state = 'IDLE'; this.timer = 1; } }
        }
        break;
      }
      case 'FIND_SHELF':
        if (this.followPath(dt, g.world, this.speedMult)) { this.state = 'DELIVER'; this.timer = 0; }
        break;
      case 'DELIVER': {
        this.animate(dt, 0, 0);
        this.faceX = 0; this.faceY = -1;
        const shelf = this.task.shelf;
        const cap = shelf.capacity(g.eco.level('shelf'));
        this.timer -= dt;
        if (this.stackCount === 0) { this.state = 'IDLE'; this.timer = 0.3; break; }
        if (shelf.count + (shelf.incoming || 0) >= cap) { this.state = 'IDLE'; this.timer = 1.5; break; }
        if (this.timer <= 0) {
          this.timer = BALANCE.deliverInterval * 1.1;
          const type = this.takeFromStack();
          shelf.incoming = (shelf.incoming || 0) + 1;
          g.fx.flyToShelf(type, this, shelf, cap, () => { shelf.incoming--; shelf.add(g.now); });
          g.audio.play('place', 0.35);
        }
        break;
      }
    }
  }

  goDeliver() {
    const s = this.task.shelf;
    const stand = s.stands[Math.floor(s.stands.length / 2)];
    this.state = 'FIND_SHELF';
    this.setPath(this.game.world.findPath(this.x, this.y, stand.x, stand.y));
  }

  // Choose the shelf that needs restocking most and has a source with stock.
  pickTask() {
    const g = this.game;
    let best = null, bestScore = 0;
    const busy = g.workers.filter((w) => w !== this && w.task && w.role === 'stocker' && w.state !== 'IDLE').map((w) => w.task.shelf);
    for (const shelf of g.builtShelves()) {
      const station = g.stationFor(shelf.product);
      if (!station) continue;
      const cap = shelf.capacity(g.eco.level('shelf'));
      const need = cap - shelf.count - (shelf.incoming || 0);
      if (need <= 0) continue;
      const avail = station.stored + (station.progress > 0.6 ? 1 : 0);
      if (avail <= 0) continue;
      let score = (need / cap) * 2 + Math.min(avail, this.stackCapacity) / this.stackCapacity;
      if (busy.includes(shelf)) score *= 0.35;
      score -= dist(this.x, this.y, station.cx, station.cy) / 4000;
      if (score > bestScore) { bestScore = score; best = { shelf, station }; }
    }
    return best;
  }
}
