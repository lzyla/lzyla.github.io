// World renderer: floor cache, depth-sorted objects and entities, effects.
import { TILE, SECTIONS, DECOR, DOOR } from '../config.js';
import { roundRect, ease, clamp } from '../utils.js';
import {
  drawCharacter, drawShelf, drawStation, drawCheckout, drawZone, drawDecoration, drawMood, drawArrow, drawShadow,
} from './sprites.js';

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.dpr = 1;
    this.floorCache = document.createElement('canvas');
    this.floorCache.width = game.world.width; this.floorCache.height = game.world.height;
    this.floorDirty = true;
    this.time = 0;
  }

  resize(w, h) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  // ------------------------------------------------------------ floor cache
  buildFloor() {
    const g = this.game, w = g.world;
    const c = this.floorCache.getContext('2d');
    c.clearRect(0, 0, w.width, w.height);
    // grass
    c.fillStyle = '#8fd07a'; c.fillRect(0, 0, w.width, w.height);
    c.fillStyle = 'rgba(255,255,255,0.06)';
    for (let r = 0; r < w.rows; r++) for (let cc = 0; cc < w.cols; cc++) if ((r + cc) % 2 === 0) c.fillRect(cc * TILE, r * TILE, TILE, TILE);
    // little grass tufts
    c.strokeStyle = 'rgba(60,120,40,0.35)'; c.lineWidth = 2;
    for (let i = 0; i < 260; i++) {
      const x = ((i * 7919) % w.width), y = ((i * 104729) % w.height);
      if (w.floor[w.idx(Math.floor(x / TILE), Math.floor(y / TILE))]) continue;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y - 7); c.moveTo(x, y); c.lineTo(x + 4, y - 6); c.stroke();
    }
    // floors
    for (let r = 0; r < w.rows; r++) for (let cc = 0; cc < w.cols; cc++) {
      const f = w.floor[w.idx(cc, r)];
      if (!f) continue;
      const x = cc * TILE, y = r * TILE;
      if (f === 2) {
        c.fillStyle = (r + cc) % 2 ? '#d7d3c8' : '#cdc9bd'; c.fillRect(x, y, TILE, TILE);
        c.strokeStyle = 'rgba(0,0,0,0.08)'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
        if (w.blocked[w.idx(cc, r)]) {
          // front face of the shop's bottom wall
          c.fillStyle = '#e6b877'; c.fillRect(x, y, TILE, 30);
          c.fillStyle = '#f7d9a8'; c.fillRect(x, y, TILE, 8);
          c.fillStyle = 'rgba(0,0,0,0.10)'; c.fillRect(x, y + 30, TILE, 6);
          c.fillStyle = '#7fc8a9'; c.fillRect(x, y + 14, TILE, 5);
        }
      } else {
        c.fillStyle = (r + cc) % 2 ? '#f9f1e3' : '#f4ead8'; c.fillRect(x, y, TILE, TILE);
        c.strokeStyle = 'rgba(120,90,50,0.10)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
    // walls: indoor tile with a non-indoor neighbour above gets a wall band;
    // other outer edges get a skirting line.
    for (let r = 0; r < w.rows; r++) for (let cc = 0; cc < w.cols; cc++) {
      const f = w.floor[w.idx(cc, r)];
      if (f !== 1) continue;
      const x = cc * TILE, y = r * TILE;
      const up = r > 0 ? w.floor[w.idx(cc, r - 1)] : 0;
      const down = r < w.rows - 1 ? w.floor[w.idx(cc, r + 1)] : 0;
      const left = cc > 0 ? w.floor[w.idx(cc - 1, r)] : 0;
      const right = cc < w.cols - 1 ? w.floor[w.idx(cc + 1, r)] : 0;
      if (up !== 1) {
        c.fillStyle = '#f7d9a8'; c.fillRect(x, y, TILE, 26);
        c.fillStyle = '#e6b877'; c.fillRect(x, y + 22, TILE, 6);
        c.fillStyle = '#7fc8a9'; c.fillRect(x, y + 10, TILE, 5);
        c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(x, y + 28, TILE, 6);
      }
      if (down !== 1) {
        const isDoor = down === 2 && Math.abs(cc + 0.5 - DOOR.x) <= 1.6;
        if (isDoor) {
          c.fillStyle = '#c0392b'; roundRect(c, x + 2, y + TILE - 10, TILE - 4, 14, 3); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 6, y + TILE - 6, TILE - 12, 3);
        } else {
          c.fillStyle = '#e6b877'; c.fillRect(x, y + TILE - 8, TILE, 8);
          c.fillStyle = '#f7d9a8'; c.fillRect(x, y + TILE - 8, TILE, 3);
        }
      }
      if (left !== 1) { c.fillStyle = '#e6b877'; c.fillRect(x, y, 6, TILE); }
      if (right !== 1) { c.fillStyle = '#e6b877'; c.fillRect(x + TILE - 6, y, 6, TILE); }
    }
    // shop sign over the entrance (on the pavement side of the bottom wall)
    const sx = (DOOR.x + 3.2) * TILE, sy = (DOOR.y + 0.5) * TILE + 2;
    c.fillStyle = '#2e7d32'; roundRect(c, sx - 92, sy, 184, 34, 10); c.fill();
    c.lineWidth = 3; c.strokeStyle = '#1b5e20'; c.stroke();
    c.fillStyle = '#fff'; c.font = '900 20px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('SUNNY MART', sx, sy + 17);
    // entrance mat
    const mx = DOOR.x * TILE;
    c.fillStyle = '#6d4c41'; roundRect(c, mx - 60, sy + 6, 120, 26, 6); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(c, mx - 54, sy + 10, 108, 18, 4); c.fill();
    c.fillStyle = '#4e342e'; c.font = '900 13px Nunito, sans-serif'; c.fillText('WITAMY', mx, sy + 19);
    this.floorDirty = false;
  }

  // ------------------------------------------------------------------ frame
  render(dt) {
    this.time += dt;
    const g = this.game, ctx = this.ctx, cam = g.camera;
    if (this.floorDirty) this.buildFloor();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#8fd07a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    cam.apply(ctx, this.dpr);
    ctx.imageSmoothingEnabled = true;

    // floor (only the visible part)
    const sx = clamp(cam.left, 0, g.world.width), sy = clamp(cam.top, 0, g.world.height);
    const sw = Math.min(g.world.width - sx, cam.viewW / cam.zoom + 2), sh = Math.min(g.world.height - sy, cam.viewH / cam.zoom + 2);
    if (sw > 0 && sh > 0) ctx.drawImage(this.floorCache, sx, sy, sw, sh, sx, sy, sw, sh);

    // section reveal overlay
    const now = g.now;
    for (const [id, t0] of g.world.sectionAnim) {
      const t = (now - t0) / 700;
      if (t >= 1) { g.world.sectionAnim.delete(id); continue; }
      const s = SECTIONS[id];
      ctx.fillStyle = `rgba(143,208,122,${1 - ease.outCubic(t)})`;
      ctx.fillRect(s.x * TILE, s.y * TILE, s.w * TILE, s.h * TILE);
    }

    // purchase zones (flat on the floor)
    for (const z of g.activeZones()) if (cam.visible(z.rect.x + z.rect.w / 2, z.rect.y + z.rect.h / 2)) drawZone(ctx, z, g.eco.money >= z.cost, z.progress || 0, this.time);

    // interaction highlight for the tutorial target
    if (g.tutorial.target) {
      const tgt = g.tutorial.target;
      const p = 0.35 + Math.sin(this.time * 4) * 0.15;
      ctx.fillStyle = `rgba(255, 213, 79, ${p})`;
      roundRect(ctx, tgt.rect.x, tgt.rect.y, tgt.rect.w, tgt.rect.h, 12); ctx.fill();
    }

    // depth sorted drawables
    const items = [];
    for (const o of g.world.objects) if (cam.visible(o.cx, o.cy, 200)) items.push({ y: o.sortY, o, type: 'object' });
    for (const d of DECOR) items.push({ y: d.y * TILE, o: d, type: 'decor' });
    if (cam.visible(g.player.x, g.player.y)) items.push({ y: g.player.sortY, o: g.player, type: 'char' });
    for (const c of g.customers) if (cam.visible(c.x, c.y)) items.push({ y: c.sortY, o: c, type: 'char' });
    for (const w of g.workers) if (cam.visible(w.x, w.y)) items.push({ y: w.sortY, o: w, type: 'char' });
    items.sort((a, b) => a.y - b.y);

    for (const it of items) {
      if (it.type === 'decor') { drawDecoration(ctx, it.o, this.time); continue; }
      if (it.type === 'char') {
        drawCharacter(ctx, it.o, this.time);
        if (it.o.mood && it.o.mood !== 'ok') drawMood(ctx, it.o, it.o.mood, this.time);
        if (it.o.role) this.drawBadge(ctx, it.o);
        continue;
      }
      const o = it.o;
      const age = (now - o.bornAt) / 550;
      if (age < 1) { ctx.save(); ctx.translate(o.cx, o.y + o.h); const s = ease.outBack(clamp(age, 0.01, 1)); ctx.scale(s, s); ctx.translate(-o.cx, -(o.y + o.h)); }
      if (o.kind === 'shelf') drawShelf(ctx, o, o.capacity(g.eco.level('shelf')), now);
      else if (o.kind === 'station') drawStation(ctx, o, now, this.time);
      else if (o.kind === 'checkout') drawCheckout(ctx, o, now, this.time);
      if (age < 1) ctx.restore();
    }

    // tutorial arrow
    if (g.tutorial.target) { const r = g.tutorial.target.rect; drawArrow(ctx, r.x + r.w / 2, r.y + r.h / 2 + 30, this.time); }

    g.fx.renderWorld(ctx);
    if (g.debug) this.renderDebug(ctx);
    ctx.restore();
  }

  drawBadge(ctx, w) {
    // small name tag above staff so the player can tell them apart
    const y = w.y - 104 * w.look.height - w.stackCount * 11;
    ctx.fillStyle = w.role === 'cashier' ? '#0288d1' : '#2e7d32';
    roundRect(ctx, w.x - 30, y - 9, 60, 16, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 10px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(w.role === 'cashier' ? 'KASJER' : 'MAGAZYN', w.x, y);
  }

  renderDebug(ctx) {
    const g = this.game, w = g.world;
    ctx.lineWidth = 1;
    for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) {
      if (w.blocked[w.idx(c, r)]) { ctx.fillStyle = 'rgba(255,0,0,0.15)'; ctx.fillRect(c * TILE, r * TILE, TILE, TILE); }
    }
    ctx.strokeStyle = 'rgba(0,0,255,0.6)';
    for (const o of w.objects) { const r = o.interactRect; ctx.strokeRect(r.x, r.y, r.w, r.h); }
    ctx.strokeStyle = '#ff00ff';
    ctx.beginPath(); ctx.arc(g.player.x, g.player.y, g.player.radius * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '11px monospace'; ctx.fillStyle = '#000'; ctx.textAlign = 'left';
    for (const c of [...g.customers, ...g.workers]) {
      ctx.fillText(c.state, c.x + 20, c.y);
      if (c.path) { ctx.strokeStyle = 'rgba(0,150,0,0.6)'; ctx.beginPath(); ctx.moveTo(c.x, c.y); for (let i = c.pathIndex; i < c.path.length; i++) ctx.lineTo(c.path[i].x, c.path[i].y); ctx.stroke(); }
    }
  }
}
