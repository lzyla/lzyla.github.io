// Game orchestrator: owns every system, runs the loop, applies the rules.
import { TILE, PRODUCTS, OBJECTS, ZONES, SECTIONS, BALANCE, UPGRADES } from './config.js';
import { World } from './world.js';
import { Camera } from './camera.js';
import { Economy } from './economy.js';
import { Effects } from './particles.js';
import { AudioFx } from './audio.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { Renderer } from './render/renderer.js';
import { Station, Shelf, Checkout } from './stations.js';
import { Player } from './entities/player.js';
import { Customer } from './entities/customer.js';
import { Worker } from './entities/worker.js';
import { hasSave, loadSave, writeSave, clearSave } from './save.js';
import { pointInRect, dist, rand } from './utils.js';

const PLAYER_START = { x: 13.5 * TILE, y: 14.5 * TILE };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.debug = new URLSearchParams(location.search).get('debug') === '1';
    this.world = new World();
    this.camera = new Camera(this.world);
    this.eco = new Economy();
    this.fx = new Effects();
    this.audio = new AudioFx();
    this.input = new Input(document.getElementById('touch-layer'), document.getElementById('joystick'));
    this.renderer = new Renderer(canvas, this);
    this.ui = new UI(this);
    this.player = new Player(PLAYER_START.x, PLAYER_START.y);
    this.customers = [];
    this.workers = [];
    this.purchased = new Set();
    this.zoneState = new Map();     // zone id -> { rect, progress }
    this.stats = { customersServed: 0, lostCustomers: 0, playTime: 0 };
    this.tutorial = { step: 0, done: false, target: null };
    this.running = false;
    this.paused = false;
    this.now = performance.now();
    this.time = 0;
    this.spawnTimer = 2.5;
    this.saveTimer = 0;
    this.hintOverride = null;
    this.hintTimer = 0;
    this.lastTs = 0;
    this.fps = 0;

    for (const def of OBJECTS) if (def.builtIn) this.buildObject(def, true);
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 200));
    const unlockAudio = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.running) this.save(); });
    window.addEventListener('beforeunload', () => { if (this.running) this.save(); });

    this.ui.showStart(hasSave());
    requestAnimationFrame((ts) => this.loop(ts));
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.resize(w, h);
    this.camera.resize(w, h);
    this.camera.follow(this.player.x, this.player.y, 0, true);
  }

  // ------------------------------------------------------------ lifecycle
  startNew() {
    clearSave();
    this.resetState();
    this.begin();
  }

  continueGame() {
    const data = loadSave();
    this.resetState();
    if (data) this.applySave(data);
    this.begin();
  }

  resetGame() {
    clearSave();
    this.resetState();
    this.running = false;
    this.ui.showStart(false);
  }

  begin() {
    this.running = true;
    this.paused = false;
    this.ui.hideStart();
    this.audio.unlock();
    this.camera.follow(this.player.x, this.player.y, 0, true);
    this.renderer.floorDirty = true;
    this.updateTutorial(0);
  }

  resetState() {
    this.world = new World();
    this.camera = new Camera(this.world);
    this.renderer.floorCache.width = this.world.width; this.renderer.floorCache.height = this.world.height;
    this.renderer.floorDirty = true;
    this.eco = new Economy();
    this.customers = [];
    this.workers = [];
    this.purchased = new Set();
    this.zoneState = new Map();
    this.stats = { customersServed: 0, lostCustomers: 0, playTime: 0 };
    this.tutorial = { step: 0, done: false, target: null };
    this.player = new Player(PLAYER_START.x, PLAYER_START.y);
    this.spawnTimer = 2.5;
    this.fx = new Effects();
    for (const def of OBJECTS) if (def.builtIn) this.buildObject(def, true);
    this.onResize();
    this.ui.lastMoney = -1;
  }

  // -------------------------------------------------------------- objects
  buildObject(def, silent = false) {
    let obj;
    if (def.kind === 'station') obj = new Station(def);
    else if (def.kind === 'shelf') obj = new Shelf(def);
    else obj = new Checkout(def);
    if (silent) obj.bornAt = 0;
    this.world.addObject(obj);
    this.renderer.floorDirty = true;
    return obj;
  }

  builtShelves() { return this.world.objects.filter((o) => o.kind === 'shelf'); }
  builtCheckouts() { return this.world.objects.filter((o) => o.kind === 'checkout'); }
  builtStations() { return this.world.objects.filter((o) => o.kind === 'station'); }
  stationFor(product) { return this.world.objects.find((o) => o.kind === 'station' && o.product === product); }
  shelfFor(product) { return this.world.objects.find((o) => o.kind === 'shelf' && o.product === product); }
  unlockedProducts() { return this.builtShelves().length; }
  storeLevel() { return 1 + this.purchased.size; }

  // Zones whose requirements are met and that are not yet bought.
  activeZones() {
    const out = [];
    for (const z of ZONES) {
      if (this.purchased.has(z.id)) continue;
      if (!z.requires.every((r) => this.purchased.has(r))) continue;
      let st = this.zoneState.get(z.id);
      if (!st) {
        let rect;
        if (z.kind === 'object') { const d = OBJECTS.find((o) => o.id === z.target); rect = { x: d.x * TILE, y: d.y * TILE, w: d.w * TILE, h: d.h * TILE }; }
        else rect = { x: z.x * TILE, y: z.y * TILE, w: z.w * TILE, h: z.h * TILE };
        st = { id: z.id, kind: z.kind, label: z.label, cost: z.cost, rect, progress: 0, def: z };
        this.zoneState.set(z.id, st);
      }
      out.push(st);
    }
    return out;
  }

  nextGoal() {
    let best = null;
    for (const z of this.activeZones()) if (!best || z.cost < best.cost) best = z;
    return best;
  }

  buyZone(zoneDef, silent = false) {
    if (!silent && !this.eco.spend(zoneDef.cost)) return false;
    this.purchased.add(zoneDef.id);
    const st = this.zoneState.get(zoneDef.id);
    const rect = st ? st.rect : null;
    if (zoneDef.kind === 'section') {
      this.world.unlockSection(zoneDef.target, silent);
      this.renderer.floorDirty = true;
    } else if (zoneDef.kind === 'object') {
      const def = OBJECTS.find((o) => o.id === zoneDef.target);
      this.buildObject(def, silent);
      // nobody may stay inside the new furniture
      for (const ch of [this.player, ...this.customers, ...this.workers]) {
        const p = this.world.ejectCircle(ch.x, ch.y, ch.radius * 0.7);
        if (p.x !== ch.x || p.y !== ch.y) {
          ch.x = p.x; ch.y = p.y;
          if (ch.path && ch.pathIndex < ch.path.length) { const end = ch.path[ch.path.length - 1]; ch.setPath(this.world.findPath(ch.x, ch.y, end.x, end.y) || [end]); }
        }
      }
    } else if (zoneDef.kind === 'hire') {
      const w = new Worker(this, zoneDef.role, this.workers.length, (zoneDef.x + 0.5) * TILE, (zoneDef.y + 0.5) * TILE);
      this.workers.push(w);
    }
    if (!silent && rect) {
      const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
      this.fx.confetti(cx, cy, zoneDef.kind === 'section' ? 40 : 22);
      this.fx.sparkle(cx, cy, 12);
      this.audio.play(zoneDef.kind === 'section' ? 'unlock' : 'buy');
      const titles = { section: 'Nowa sekcja otwarta!', object: zoneDef.label, hire: 'Nowy pracownik!' };
      this.ui.showBanner(titles[zoneDef.kind], zoneDef.kind === 'hire' ? (zoneDef.role === 'cashier' ? 'Kasjer obsłuży klientów za Ciebie' : 'Magazynier uzupełni półki') : `Poziom ${this.storeLevel()}`);
      if (zoneDef.kind === 'section') { this.ui.flash(); this.camera.shake = 0.6; }
      this.save();
    }
    return true;
  }

  buyUpgrade(id) {
    if (!this.eco.buyUpgrade(id)) { this.audio.play('error'); return false; }
    this.audio.play('buy');
    this.fx.sparkle(this.player.x, this.player.y - 60, 10);
    this.ui.toast(`${UPGRADES[id].name} → poziom ${this.eco.level(id)}`, 'good');
    this.save();
    return true;
  }

  earn(amount, x, y) {
    this.eco.add(amount);
    this.fx.text(x, y, `+${amount}`, '#2e7d32', 24);
    this.fx.coins(x, y + 20, Math.min(10, 3 + Math.floor(amount / 10)));
    this.audio.play('coin');
  }

  toggleMute() { this.audio.setMuted(!this.audio.muted); if (this.running) this.save(); }

  // ------------------------------------------------------------------ loop
  loop(ts) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = this.lastTs ? (ts - this.lastTs) / 1000 : 0.016;
    this.lastTs = ts;
    if (dt > 0.05) dt = 0.05;            // tab was hidden: don't let the sim jump
    if (dt <= 0) dt = 0.001;
    this.now = performance.now();
    this.fps = this.fps * 0.9 + (1 / dt) * 0.1;
    if (this.running && !this.paused) this.update(dt);
    this.renderer.render(this.running && !this.paused ? dt : 0);
    if (this.debug) this.renderDebugHud();
  }

  update(dt) {
    this.time += dt;
    this.stats.playTime += dt;
    const eco = this.eco;
    this.player.speed = eco.playerSpeed();
    this.player.stackCapacity = eco.playerCapacity();
    this.player.update(dt, this.input.vector, this.world);

    const prodMult = eco.productionMult();
    for (const o of this.world.objects) if (o.kind === 'station') o.update(dt, prodMult);

    this.updateInteractions(dt);
    this.updateZones(dt);
    this.updateCustomers(dt);
    for (const w of this.workers) w.update(dt);
    this.separate(dt);
    this.updateCheckouts(dt);
    this.fx.update(dt);
    this.camera.follow(this.player.x, this.player.y - 20, dt);
    this.updateTutorial(dt);
    this.ui.update();

    this.saveTimer += dt;
    if (this.saveTimer > 5) { this.saveTimer = 0; this.save(); }
  }

  // ------------------------------------------------------- player actions
  updateInteractions(dt) {
    const p = this.player;
    const im = this.eco.interactionMult();
    this.collectTimer = (this.collectTimer || 0) - dt;
    this.deliverTimer = (this.deliverTimer || 0) - dt;
    let hint = null;

    for (const o of this.world.objects) {
      if (!pointInRect(p.x, p.y, o.interactRect)) { if (o.kind === 'checkout') o.playerHere = false; continue; }
      if (o.kind === 'station') {
        if (p.stackCount && p.stackType !== o.product) hint = `Najpierw odłóż: ${PRODUCTS[p.stackType].name}`;
        else if (!this.shelfFor(o.product)) hint = `Najpierw zbuduj regał: ${PRODUCTS[o.product].name}`;
        else if (p.stackFull) hint = 'Stos pełny — zanieś towar na regał';
        else if (o.stored > 0 && this.collectTimer <= 0) {
          this.collectTimer = BALANCE.collectInterval / im;
          o.take();
          const slot = o.slots[Math.min(o.stored, o.slots.length - 1)];
          p.pending++;
          this.fx.flyItem(o.product, slot, p, () => { p.pending--; p.addToStack(o.product); });
          this.fx.sparkle(slot.x, slot.y, 3);
          this.audio.play('pick');
        }
      } else if (o.kind === 'shelf') {
        const cap = o.capacity(this.eco.level('shelf'));
        if (p.stackCount && p.stackType !== o.product) hint = `To regał na: ${PRODUCTS[o.product].name}`;
        else if (p.stackCount && o.count + (o.incoming || 0) >= cap) hint = 'Regał pełny';
        else if (p.stackCount && this.deliverTimer <= 0) {
          this.deliverTimer = BALANCE.deliverInterval / im;
          const type = p.takeFromStack();
          o.incoming = (o.incoming || 0) + 1;
          this.fx.flyToShelf(type, p, o, cap, () => { o.incoming--; o.add(this.now); });
          this.audio.play('place');
        }
      } else if (o.kind === 'checkout') {
        o.playerHere = true;
      }
    }
    // stack full while standing anywhere: a gentle reminder
    if (!hint && p.stackFull && this.tutorial.done) hint = null;
    if (hint) { this.hintOverride = hint; this.hintTimer = 0.4; }
    this.hintTimer -= dt;
    if (this.hintTimer <= 0) this.hintOverride = null;
  }

  // Stand on a zone with enough money for ~0.5 s to buy it.
  updateZones(dt) {
    const p = this.player;
    const pad = TILE * 0.35;
    for (const z of this.activeZones()) {
      const r = z.rect;
      if (pointInRect(p.x, p.y, { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 })) {
        if (this.eco.money >= z.cost) {
          z.progress += dt / 0.55;
          if (z.progress >= 1) { z.progress = 0; this.buyZone(z.def); }
        } else {
          z.progress = Math.max(0, z.progress - dt * 2);
          this.hintOverride = `Brakuje ${Math.ceil(z.cost - this.eco.money)} monet`;
          this.hintTimer = 0.3;
        }
      } else if (z.progress > 0) z.progress = Math.max(0, z.progress - dt * 2);
    }
  }

  updateCheckouts(dt) {
    const serveTime = this.eco.checkoutTime();
    for (const co of this.builtCheckouts()) {
      const first = co.queue[0];
      if (co.active && first && first.state === 'QUEUE' && first.atSlot) {
        const mult = co.playerHere ? this.eco.interactionMult() : 1;
        co.progress += dt / serveTime * mult;
        if (co.progress >= 1) { co.progress = 0; first.pay(); co.lastSaleAt = this.now; }
      } else if (!first) co.progress = 0;
      else if (!co.active) co.progress = Math.max(0, co.progress - dt * 0.5);
    }
  }

  // ------------------------------------------------------------ customers
  updateCustomers(dt) {
    const products = Math.max(1, this.unlockedProducts());
    const stock = this.builtShelves().some((s) => s.count > 0);
    const interval = Math.max(BALANCE.spawnMin, BALANCE.spawnBase / (1 + 0.35 * (products - 1))) * (stock ? 1 : 1.8);
    const maxCustomers = BALANCE.maxCustomersBase + products * 2 + (this.builtCheckouts().length - 1) * 2;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.customers.length < maxCustomers) {
      this.spawnTimer = interval * rand(0.75, 1.25);
      this.customers.push(new Customer(this));
    }
    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      c.update(dt);
      if (c.dead) this.customers.splice(i, 1);
    }
  }

  // Soft separation so NPCs don't stand inside each other.
  separate(dt) {
    const all = [...this.customers, ...this.workers];
    for (const a of all) { a.sepX = 0; a.sepY = 0; }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const min = (a.radius + b.radius) * 0.8;
      if (d < min) {
        const push = (min - d) / min * 60;
        const nx = dx / d, ny = dy / d;
        // queue members hold their slot: push the newcomer instead
        const aFixed = a.state === 'QUEUE' && a.atSlot, bFixed = b.state === 'QUEUE' && b.atSlot;
        if (!aFixed) { a.sepX -= nx * push; a.sepY -= ny * push; }
        if (!bFixed) { b.sepX += nx * push; b.sepY += ny * push; }
      }
    }
    // apply as tiny displacement (path following also reads sepX/sepY)
    for (const a of all) {
      if (a.sepX || a.sepY) {
        const r = this.world.moveCircle(a.x, a.y, a.radius * 0.5, a.sepX * dt * 0.5, a.sepY * dt * 0.5);
        a.x = r.x; a.y = r.y;
      }
    }
    // player pushes NPCs a little so they never block the way
    const p = this.player;
    for (const a of all) {
      const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy) || 0.01;
      const min = (a.radius + p.radius) * 0.75;
      if (d < min && !(a.state === 'QUEUE' && a.atSlot)) { const r = this.world.moveCircle(a.x, a.y, a.radius * 0.5, dx / d * (min - d) * 0.5, dy / d * (min - d) * 0.5); a.x = r.x; a.y = r.y; }
    }
  }

  // ------------------------------------------------------------- tutorial
  updateTutorial(dt) {
    const t = this.tutorial;
    if (t.done) { t.target = null; this.ui.setHint(this.hintOverride || ''); return; }
    const field = this.world.getObject('carrot_field');
    const shelf = this.world.getObject('carrot_shelf');
    const co = this.world.getObject('checkout1');
    const isTouch = matchMedia('(pointer: coarse)').matches;
    let text = '';
    switch (t.step) {
      case 0:
        text = isTouch ? 'Dotknij ekranu i przeciągnij, aby iść' : 'Poruszaj się klawiszami WASD lub strzałkami';
        t.target = { rect: field.interactRect };
        if (this.input.anyInput) t.step = 1;
        break;
      case 1:
        text = 'Podejdź do grządki, aby zebrać marchewki';
        t.target = { rect: field.interactRect };
        if (this.player.stackCount > 0) t.step = 2;
        break;
      case 2:
        text = 'Zanieś marchewki na regał';
        t.target = { rect: shelf.interactRect };
        if (shelf.count > 0 || (shelf.incoming || 0) > 0) t.step = 3;
        break;
      case 3: {
        const waiting = co.queue.length > 0;
        text = waiting ? 'Klient czeka — stań za kasą, aby go obsłużyć' : 'Klienci już idą! Uzupełniaj regał, a potem obsłuż kasę';
        t.target = { rect: waiting ? co.interactRect : shelf.interactRect };
        if (this.stats.customersServed > 0) t.step = 4;
        break;
      }
      case 4: {
        const goal = this.nextGoal();
        text = goal ? `Zbierz ${goal.cost} monet i stań na zielonej strefie, aby rozbudować sklep` : '';
        t.target = goal ? { rect: goal.rect } : null;
        if (this.purchased.size > 0) { t.step = 5; t.done = true; this.ui.toast('Ulepszenia gracza i sklepu znajdziesz pod przyciskiem strzałki', 'info'); this.save(); }
        break;
      }
    }
    this.ui.setHint(this.hintOverride || text);
  }

  // ------------------------------------------------------------------ save
  save() {
    const stations = {}, shelves = {};
    for (const o of this.world.objects) { if (o.kind === 'station') stations[o.id] = o.stored; if (o.kind === 'shelf') shelves[o.id] = o.count; }
    writeSave({
      money: this.eco.money, totalEarned: this.eco.totalEarned, levels: this.eco.levels,
      purchased: [...this.purchased], stations, shelves,
      tutorial: { step: this.tutorial.step, done: this.tutorial.done },
      muted: this.audio.muted, stats: this.stats,
      player: { x: this.player.x, y: this.player.y },
      savedAt: Date.now(),
    });
  }

  applySave(d) {
    this.eco.money = Number(d.money) || 0;
    this.eco.totalEarned = Number(d.totalEarned) || 0;
    for (const k of Object.keys(UPGRADES)) this.eco.levels[k] = Math.min(UPGRADES[k].max, Number(d.levels?.[k]) || 0);
    // replay purchases in definition order so requirements resolve
    const bought = new Set(d.purchased || []);
    for (const z of ZONES) if (bought.has(z.id)) this.buyZone(z, true);
    for (const o of this.world.objects) {
      if (o.kind === 'station' && d.stations?.[o.id] != null) o.stored = Math.min(o.capacity, Number(d.stations[o.id]) || 0);
      if (o.kind === 'shelf' && d.shelves?.[o.id] != null) { o.count = Math.min(o.capacity(this.eco.level('shelf')), Number(d.shelves[o.id]) || 0); }
    }
    this.tutorial.step = d.tutorial?.step || 0; this.tutorial.done = !!d.tutorial?.done;
    this.audio.setMuted(!!d.muted);
    if (d.stats) this.stats = { customersServed: 0, lostCustomers: 0, playTime: 0, ...d.stats };
    if (d.player && Number.isFinite(d.player.x) && Number.isFinite(d.player.y) && !this.world.circleHits(d.player.x, d.player.y, 10)) { this.player.x = d.player.x; this.player.y = d.player.y; }
    // workers start at their posts
    this.renderer.floorDirty = true;
  }

  renderDebugHud() {
    const el = document.getElementById('debug');
    el.style.display = 'block';
    const p = this.player;
    el.textContent = `FPS ${this.fps.toFixed(0)}  pos ${p.x.toFixed(0)},${p.y.toFixed(0)}  cust ${this.customers.length}  workers ${this.workers.length}  money ${this.eco.money}  zoom ${this.camera.zoom.toFixed(2)}  fx ${this.fx.particles.length}/${this.fx.flights.length}`;
  }
}
