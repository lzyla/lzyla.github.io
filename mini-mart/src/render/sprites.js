// Procedural "sprites": every visual in the game world is drawn with Canvas
// 2D primitives here. Nothing is loaded from disk.
import { TILE, PRODUCTS } from '../config.js';
import { roundRect, shade, ease, clamp } from '../utils.js';

const OUTLINE = 'rgba(40, 30, 20, 0.35)';

function outlined(ctx, fill, lw = 2) {
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = lw; ctx.strokeStyle = OUTLINE; ctx.stroke();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

export function drawShadow(ctx, x, y, rx, ry = rx * 0.45, alpha = 0.22) {
  ctx.fillStyle = `rgba(30,20,10,${alpha})`;
  ellipse(ctx, x, y, rx, ry); ctx.fill();
}

// ---------------------------------------------------------------- products
export function drawProduct(ctx, type, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  switch (type) {
    case 'carrot': {
      // leaves
      ctx.fillStyle = '#4caf50';
      for (const [dx, ang] of [[-4, -0.5], [0, 0], [4, 0.5]]) {
        ctx.save(); ctx.translate(dx, -10); ctx.rotate(ang);
        ellipse(ctx, 0, -5, 2.6, 7); ctx.fill(); ctx.restore();
      }
      // body
      ctx.beginPath();
      ctx.moveTo(-8, -8); ctx.quadraticCurveTo(-9, 2, 0, 13); ctx.quadraticCurveTo(9, 2, 8, -8); ctx.closePath();
      outlined(ctx, '#ff8a3d');
      ctx.strokeStyle = 'rgba(200,80,0,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(3, -1); ctx.moveTo(-3, 4); ctx.lineTo(3, 5); ctx.stroke();
      break;
    }
    case 'apple': {
      ctx.beginPath(); ctx.arc(0, 1, 10.5, 0, Math.PI * 2); outlined(ctx, '#e53935');
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(ctx, -4, -3, 3, 4.5); ctx.fill();
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(1, -14); ctx.stroke();
      ctx.fillStyle = '#7cb342'; ellipse(ctx, 5, -12, 5, 2.4); ctx.fill();
      break;
    }
    case 'tomato': {
      ellipse(ctx, 0, 2, 11.5, 9.5); outlined(ctx, '#ef4136');
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ellipse(ctx, -4, -1, 3.5, 2.5); ctx.fill();
      ctx.fillStyle = '#43a047';
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; ctx.save(); ctx.translate(0, -6); ctx.rotate(a); ellipse(ctx, 4, 0, 4.5, 1.8); ctx.fill(); ctx.restore(); }
      ctx.beginPath(); ctx.arc(0, -6, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'milk': {
      roundRect(ctx, -8, -10, 16, 24, 3); outlined(ctx, '#ffffff');
      ctx.fillStyle = '#42a5f5'; roundRect(ctx, -8, -1, 16, 7, 1); ctx.fill();
      ctx.fillStyle = '#e3f2fd'; roundRect(ctx, -6, -14, 12, 5, 2); ctx.fill();
      ctx.fillStyle = '#90caf9'; roundRect(ctx, -2.5, -17, 5, 4, 1.5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 2.5, 2, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'eggs': {
      roundRect(ctx, -13, -4, 26, 13, 3); outlined(ctx, '#d9b98a');
      ctx.fillStyle = '#fffaf0';
      for (const dx of [-8, 0, 8]) { ellipse(ctx, dx, -4, 4.2, 5.4); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(120,90,50,0.35)'; ctx.stroke(); }
      break;
    }
    case 'bread': {
      ctx.beginPath();
      ctx.moveTo(-13, 6); ctx.quadraticCurveTo(-14, -8, -4, -9); ctx.lineTo(4, -9); ctx.quadraticCurveTo(14, -8, 13, 6); ctx.quadraticCurveTo(0, 10, -13, 6); ctx.closePath();
      outlined(ctx, '#d99a4e');
      ctx.strokeStyle = '#f5deb3'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); for (const dx of [-6, 0, 6]) { ctx.moveTo(dx - 2, -4); ctx.lineTo(dx + 2, 1); } ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// A wooden crate holding a product (used for carried stacks).
export function drawCrate(ctx, type, x, y, s = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  roundRect(ctx, -17, -7, 34, 16, 3); outlined(ctx, '#d9a066');
  ctx.fillStyle = 'rgba(120,70,20,0.25)';
  ctx.fillRect(-17, 2, 34, 2);
  ctx.fillRect(-2, -7, 3, 16);
  ctx.restore();
  // items peeking out over the crate rim
  const sc = s * 0.6;
  drawProduct(ctx, type, x - 9 * s, y - 7 * s, sc);
  drawProduct(ctx, type, x + 9 * s, y - 7 * s, sc);
  drawProduct(ctx, type, x, y - 9 * s, sc);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#e6b57a'; roundRect(ctx, -17, -7, 34, 6, 2); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; roundRect(ctx, -17, -7, 34, 16, 3); ctx.stroke();
  ctx.restore();
}

export function drawCoin(ctx, x, y, r = 8, rot = 0) {
  const sx = Math.abs(Math.cos(rot)) * 0.7 + 0.3;
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#f2b91d'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#b8860b'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

// -------------------------------------------------------------- characters
// Draws a full figure with walk animation. `ch` is a Character.
export function drawCharacter(ctx, ch, time) {
  const L = ch.look;
  const H = L.height, W = L.width;
  const phase = ch.walkPhase;
  const amt = ch.moveAmount;
  const swing = Math.sin(phase) * amt;
  const bob = Math.abs(Math.sin(phase)) * 2 * amt;
  const breathe = Math.sin(time * 2.2 + ch.bornAt * 0.001) * 0.6 * (1 - amt);
  const side = Math.abs(ch.faceX) > Math.abs(ch.faceY) * 1.1;
  const back = !side && ch.faceY < 0;
  const flip = side && ch.faceX < 0 ? -1 : 1;
  const x = ch.x, y = ch.y;
  const carrying = ch.stackCount > 0;

  drawShadow(ctx, x, y + 2, 17 * W, 7);

  ctx.save();
  ctx.translate(x, y - bob);
  ctx.scale(flip, 1);

  const hipY = -30 * H;
  const legLen = 30 * H - 6;
  // legs + shoes
  for (const sgn of [-1, 1]) {
    const lx = sgn * 6.5 * W;
    const kick = side ? swing * 9 * sgn : 0;
    const lift = side ? Math.max(0, swing * sgn) * 5 : Math.max(0, Math.sin(phase + (sgn > 0 ? 0 : Math.PI))) * 6 * amt;
    ctx.fillStyle = L.pants;
    roundRect(ctx, lx - 5 * W + kick * 0.3, hipY, 10 * W, legLen - lift, 4); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
    // shoe
    ctx.fillStyle = L.shoes;
    roundRect(ctx, lx - 6 * W + kick, hipY + legLen - lift - 5, 13 * W, 7, 3); ctx.fill();
    ctx.stroke();
  }

  // torso
  const torsoTop = -60 * H, torsoH = 32 * H;
  const sway = Math.sin(phase) * 1.5 * amt;
  ctx.save();
  ctx.translate(sway, 0);
  roundRect(ctx, -14 * W, torsoTop + breathe * 0.3, 28 * W, torsoH, 9 * W); outlined(ctx, L.top);
  if (L.apron) {
    ctx.fillStyle = back ? 'rgba(255,255,255,0.15)' : '#f8f4ea';
    roundRect(ctx, -9 * W, torsoTop + 10 * H, 18 * W, torsoH - 10 * H, 5); ctx.fill();
    if (!back) { ctx.fillStyle = '#e57373'; roundRect(ctx, -3, torsoTop + 14 * H, 6, 5, 1.5); ctx.fill(); }
  } else if (!back) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(ctx, -9 * W, torsoTop + 4, 18 * W, 6, 3); ctx.fill();
  }
  if (L.bag && !back) { ctx.fillStyle = '#8d6e63'; roundRect(ctx, 8 * W, torsoTop + 8, 9, 16, 3); ctx.fill(); ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6 * W, torsoTop + 2); ctx.lineTo(10 * W, torsoTop + 12); ctx.stroke(); }

  // arms
  const armLen = 24 * H;
  for (const sgn of [-1, 1]) {
    const ax = sgn * 15 * W;
    ctx.save();
    ctx.translate(ax, torsoTop + 5);
    if (carrying) {
      ctx.rotate(sgn * -2.6 + Math.sin(phase) * 0.05 * amt);
    } else {
      const a = side ? -swing * 0.9 * sgn : swing * 0.35 * sgn;
      ctx.rotate(a);
    }
    ctx.fillStyle = L.top;
    roundRect(ctx, -4.5, 0, 9, armLen * 0.55, 4.5); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.fillStyle = L.skin;
    ctx.beginPath(); ctx.arc(0, armLen * 0.55 + 2, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // head
  const headY = -76 * H + breathe * 0.4;
  const hr = 14 * W;
  ctx.save();
  ctx.translate(sway * 0.6, 0);
  ctx.beginPath(); ctx.arc(0, headY, hr, 0, Math.PI * 2); outlined(ctx, L.skin);
  // ears
  ctx.fillStyle = L.skin;
  if (!side) { ctx.beginPath(); ctx.arc(-hr, headY + 1, 3.5, 0, Math.PI * 2); ctx.arc(hr, headY + 1, 3.5, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(-hr + 1, headY + 1, 3.5, 0, Math.PI * 2); ctx.fill(); }
  // face
  if (!back) {
    const eyeY = headY + 1;
    ctx.fillStyle = '#2b2b2b';
    if (side) {
      ellipse(ctx, 6, eyeY, 2.2, 3); ctx.fill();
      ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(7, eyeY + 7, 3, 0.2, Math.PI - 0.6); ctx.stroke();
    } else {
      ellipse(ctx, -5, eyeY, 2.2, 3); ctx.fill(); ellipse(ctx, 5, eyeY, 2.2, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,120,0.35)'; ellipse(ctx, -8, eyeY + 6, 3, 2); ctx.fill(); ellipse(ctx, 8, eyeY + 6, 3, 2); ctx.fill();
      ctx.strokeStyle = '#a0522d'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, eyeY + 5, 4, 0.3, Math.PI - 0.3); ctx.stroke();
    }
    if (L.glasses) {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
      if (side) { ctx.beginPath(); ctx.arc(6, eyeY, 4.5, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(-5, eyeY, 4.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(5, eyeY, 4.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-0.5, eyeY); ctx.lineTo(0.5, eyeY); ctx.stroke(); }
    }
  }
  drawHair(ctx, L, headY, hr, side, back);
  ctx.restore();
  ctx.restore();

  // carried stack (drawn unflipped)
  if (carrying) drawStack(ctx, ch, time);
}

function drawHair(ctx, L, headY, hr, side, back) {
  const c = L.hair;
  ctx.fillStyle = c; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
  switch (L.hairstyle) {
    case 'bald': return;
    case 'short':
      ctx.beginPath(); ctx.arc(0, headY - 1, hr + 1, Math.PI, Math.PI * 2); ctx.lineTo(hr + 1, headY + 2); ctx.lineTo(-hr - 1, headY + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'bob':
      ctx.beginPath(); ctx.arc(0, headY - 1, hr + 2, Math.PI, Math.PI * 2); ctx.lineTo(hr + 2, headY + 9); ctx.quadraticCurveTo(hr, headY + 12, hr - 4, headY + 10);
      ctx.lineTo(hr - 4, headY + 2); ctx.lineTo(-hr + 4, headY + 2); ctx.lineTo(-hr + 4, headY + 10); ctx.quadraticCurveTo(-hr, headY + 12, -hr - 2, headY + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'long':
      ctx.beginPath(); ctx.arc(0, headY - 1, hr + 2, Math.PI, Math.PI * 2); ctx.lineTo(hr + 3, headY + 18); ctx.quadraticCurveTo(hr - 2, headY + 20, hr - 5, headY + 16);
      ctx.lineTo(hr - 5, headY + 2); ctx.lineTo(-hr + 5, headY + 2); ctx.lineTo(-hr + 5, headY + 16); ctx.quadraticCurveTo(-hr + 2, headY + 20, -hr - 3, headY + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'bun':
      ctx.beginPath(); ctx.arc(0, headY - 1, hr + 1, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(side ? -6 : 0, headY - hr - 3, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    case 'spiky':
      ctx.beginPath(); ctx.moveTo(-hr - 1, headY + 1);
      for (let i = 0; i <= 5; i++) { const t = i / 5; const px = -hr - 1 + t * (hr * 2 + 2); ctx.lineTo(px, headY - hr - (i % 2 ? 7 : 1)); }
      ctx.lineTo(hr + 1, headY + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'curly':
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * hr / 3, headY - hr * 0.72 - (Math.abs(i) < 2 ? 3 : 0), 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(-hr, headY + 1, 5, 0, Math.PI * 2); ctx.arc(hr, headY + 1, 5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'cap': {
      const cc = shade(L.top, -0.25);
      ctx.fillStyle = cc;
      ctx.beginPath(); ctx.arc(0, headY - 2, hr + 1.5, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = cc;
      if (side) { roundRect(ctx, 2, headY - 5, hr + 8, 5, 2); ctx.fill(); ctx.stroke(); }
      else if (!back) { roundRect(ctx, -hr - 3, headY - 5, hr * 2 + 6, 5, 2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(side ? 0 : 0, headY - 9, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
}

// Stack of crates above the head with sway + bounce.
export function drawStack(ctx, ch, time) {
  const items = ch.stack.items;
  const baseY = ch.y - 94 * ch.look.height;
  for (let i = 0; i < items.length; i++) {
    const sw = ch.stack.sway[i] || { x: 0, y: 0 };
    const wob = Math.sin(time * 6 + i * 0.7) * 0.6 * ch.moveAmount;
    const top = i === items.length - 1;
    const bounce = top ? ch.stack.bounce : 0;
    const s = 1 + Math.sin(bounce * Math.PI) * 0.25;
    drawCrate(ctx, items[i], ch.x + sw.x * 0.35 + wob, baseY - i * 11 + sw.y * 0.2 - bounce * 6, s * 0.78);
  }
}

// Thought bubble above a customer.
export function drawMood(ctx, ch, mood, time) {
  const y = ch.stackTopY - 26 + Math.sin(time * 4) * 2;
  const x = ch.x + 16;
  ctx.save();
  roundRect(ctx, x - 14, y - 12, 28, 24, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.beginPath(); ctx.arc(x - 12, y + 15, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (mood === 'wait') { ctx.fillStyle = '#777'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * 6, y + 1, 2.2, 0, Math.PI * 2); ctx.fill(); } }
  else if (mood === 'angry') { ctx.fillStyle = '#e53935'; ctx.font = '900 18px Nunito, sans-serif'; ctx.fillText('!', x, y + 1); }
  else if (mood === 'happy') { drawCoin(ctx, x, y, 7); }
  ctx.restore();
}

// -------------------------------------------------------------------- shelf
export function drawShelf(ctx, shelf, capacity, now, ghostProduct = true) {
  const { x, y, w, h } = shelf;
  const P = PRODUCTS[shelf.product];
  drawShadow(ctx, x + w / 2, y + h + 4, w / 2, 8, 0.18);
  // back board / header
  ctx.fillStyle = '#7b8fa3'; roundRect(ctx, x + 2, y - 36, w - 4, 40, 6); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = P.accent; roundRect(ctx, x + 6, y - 33, w - 12, 8, 3); ctx.fill();
  // sign with product icon + name
  ctx.fillStyle = '#fffdf6'; roundRect(ctx, x + w / 2 - 44, y - 30, 88, 22, 6); ctx.fill(); ctx.stroke();
  drawProduct(ctx, shelf.product, x + w / 2 - 30, y - 19, 0.55);
  ctx.fillStyle = '#3a3a3a'; ctx.font = '800 12px Nunito, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(P.name, x + w / 2 - 18, y - 18);
  // body: front face + display top
  ctx.fillStyle = '#c99a63'; roundRect(ctx, x, y + 28, w, h - 28, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; roundRect(ctx, x + 6, y + 40, w - 12, 7, 3); ctx.fill(); roundRect(ctx, x + 6, y + 52, w - 12, 7, 3); ctx.fill();
  ctx.fillStyle = '#e8c58f'; roundRect(ctx, x, y - 4, w, 34, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.07)'; roundRect(ctx, x + 4, y + 12, w - 8, 3, 1.5); ctx.fill();
  // items
  const perRow = Math.max(4, Math.ceil(capacity / 2));
  const rows = Math.ceil(capacity / perRow);
  for (let i = 0; i < shelf.count; i++) {
    const p = shelfSlot(shelf, i, perRow, rows);
    let s = 0.72;
    const t = (now - (shelf.slotAnim[i] || 0)) / 260;
    if (t < 1) s *= ease.outBack(clamp(t, 0, 1));
    drawProduct(ctx, shelf.product, p.x, p.y, s);
  }
  // removed item shrink animation
  if (shelf.lastRemoveAt > 0) {
    const t = (now - shelf.lastRemoveAt) / 220;
    if (t < 1) { const p = shelfSlot(shelf, shelf.lastRemoveSlot, perRow, rows); ctx.globalAlpha = 1 - t; drawProduct(ctx, shelf.product, p.x, p.y - t * 18, 0.72 * (1 - t * 0.6)); ctx.globalAlpha = 1; }
  }
  // empty warning
  if (shelf.count === 0 && ghostProduct) {
    ctx.globalAlpha = 0.22; drawProduct(ctx, shelf.product, x + w / 2, y + 14, 0.8); ctx.globalAlpha = 1;
    const pulse = 1 + Math.sin(now / 180) * 0.08;
    ctx.save(); ctx.translate(x + w - 6, y - 38); ctx.scale(pulse, pulse);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fillStyle = '#ef5350'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '900 14px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 1);
    ctx.restore();
  }
}

export function shelfSlot(shelf, i, perRow, rows) {
  const col = i % perRow, row = Math.floor(i / perRow);
  const inner = shelf.w - 16;
  return { x: shelf.x + 8 + (col + 0.5) * (inner / perRow), y: shelf.y + (rows === 1 ? 12 : 4 + row * 14) };
}

// ----------------------------------------------------------------- stations
export function drawStation(ctx, st, now, time) {
  switch (st.look) {
    case 'field': drawField(ctx, st, now, time); break;
    case 'bushes': drawBushes(ctx, st, now, time); break;
    case 'tree': drawTree(ctx, st, now, time); break;
    case 'dairy': drawDairy(ctx, st, now, time); break;
    case 'coop': drawCoop(ctx, st, now, time); break;
    case 'bakery': drawBakery(ctx, st, now, time); break;
  }
  drawProgress(ctx, st);
}

function drawProgress(ctx, st) {
  if (st.stored >= st.capacity) return;
  const w = Math.min(64, st.w - 20), x = st.cx - w / 2, y = st.y + st.h + 6;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(ctx, x, y, w, 7, 3.5); ctx.fill();
  ctx.fillStyle = '#8bc34a'; roundRect(ctx, x, y, Math.max(2, w * st.progress), 7, 3.5); ctx.fill();
}

function soil(ctx, st) {
  ctx.fillStyle = '#a3785a'; roundRect(ctx, st.x + 4, st.y + 4, st.w - 8, st.h - 8, 10); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let r = 0; r < 2; r++) roundRect(ctx, st.x + 10, st.y + 14 + r * (st.h / 2), st.w - 20, 6, 3), ctx.fill();
}

function drawField(ctx, st, now, time) {
  soil(ctx, st);
  for (let i = 0; i < st.slots.length; i++) {
    const p = st.slots[i];
    const wind = Math.sin(time * 2 + p.x * 0.05) * 0.08;
    if (i < st.stored) {
      // ripe carrot: orange top peeking out + leaves
      const pop = i === st.stored - 1 ? 1 + st.pulse * 0.25 : 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pop, pop);
      ctx.fillStyle = '#ff8a3d'; ellipse(ctx, 0, 2, 7, 4); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
      ctx.fillStyle = '#4caf50';
      for (const [dx, a] of [[-5, -0.6], [0, 0], [5, 0.6]]) { ctx.save(); ctx.rotate(a + wind); ellipse(ctx, dx * 0.4, -10, 3, 9); ctx.fill(); ctx.restore(); }
      ctx.restore();
    } else if (i === st.stored) {
      const g = st.progress;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = '#6d4c33'; ellipse(ctx, 0, 3, 8, 4); ctx.fill();
      if (g > 0.15) { ctx.fillStyle = '#7cb342'; const s = clamp((g - 0.15) / 0.85, 0, 1); for (const [dx, a] of [[-4, -0.6], [0, 0], [4, 0.6]]) { ctx.save(); ctx.rotate(a + wind); ellipse(ctx, dx * 0.4 * s, -2 - 8 * s, 2 + s, 3 + 6 * s); ctx.fill(); ctx.restore(); } }
      if (g > 0.75) { ctx.fillStyle = '#ffb27a'; ellipse(ctx, 0, 2, 5 * (g - 0.75) * 4, 2.5); ctx.fill(); }
      ctx.restore();
    } else {
      ctx.fillStyle = '#6d4c33'; ellipse(ctx, p.x, p.y + 3, 8, 4); ctx.fill();
    }
  }
}

function drawBushes(ctx, st, now, time) {
  soil(ctx, st);
  for (let i = 0; i < st.slots.length; i++) {
    const p = st.slots[i];
    const sway = Math.sin(time * 1.8 + i) * 1.2;
    ctx.fillStyle = '#4e9a3f'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
    ellipse(ctx, p.x + sway, p.y - 4, 15, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#66b04e'; ellipse(ctx, p.x - 5 + sway, p.y - 9, 8, 6); ctx.fill();
    if (i < st.stored) {
      const pop = i === st.stored - 1 ? 1 + st.pulse * 0.3 : 1;
      drawProduct(ctx, 'tomato', p.x + 4 + sway, p.y - 2, 0.55 * pop);
      drawProduct(ctx, 'tomato', p.x - 6 + sway, p.y + 2, 0.42 * pop);
    } else if (i === st.stored && st.progress > 0.25) {
      const g = (st.progress - 0.25) / 0.75;
      ctx.fillStyle = g < 0.6 ? '#a5c95a' : '#f0a24b'; ellipse(ctx, p.x + 4 + sway, p.y - 2, 3 + 4 * g, 3 + 3 * g); ctx.fill(); ctx.stroke();
    }
  }
}

function drawTree(ctx, st, now, time) {
  const cx = st.cx, base = st.y + st.h - 8;
  drawShadow(ctx, cx, base + 2, st.w * 0.45, 10, 0.2);
  ctx.fillStyle = '#6b4a2b'; roundRect(ctx, cx - 9, base - 46, 18, 46, 6); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  const sway = Math.sin(time * 1.3) * 2;
  const canopyY = st.y + st.h * 0.38;
  ctx.fillStyle = '#4e9a3f'; ellipse(ctx, cx + sway, canopyY, st.w * 0.48, st.h * 0.4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#66b04e'; ellipse(ctx, cx - st.w * 0.15 + sway, canopyY - st.h * 0.12, st.w * 0.25, st.h * 0.18); ctx.fill();
  ctx.fillStyle = '#3f8a34'; ellipse(ctx, cx + st.w * 0.2 + sway, canopyY + st.h * 0.15, st.w * 0.2, st.h * 0.12); ctx.fill();
  for (let i = 0; i < st.slots.length; i++) {
    const p = st.slots[i];
    if (i < st.stored) { const pop = i === st.stored - 1 ? 1 + st.pulse * 0.3 : 1; drawProduct(ctx, 'apple', p.x + sway, p.y, 0.6 * pop); }
    else if (i === st.stored && st.progress > 0.2) { const g = (st.progress - 0.2) / 0.8; ctx.fillStyle = g < 0.5 ? '#9ccc65' : '#ef9a9a'; ctx.beginPath(); ctx.arc(p.x + sway, p.y, 2 + 4 * g, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
}

function counterBase(ctx, st, color) {
  drawShadow(ctx, st.cx, st.y + st.h + 4, st.w / 2, 8, 0.18);
  ctx.fillStyle = shade(color, -0.2); roundRect(ctx, st.x + 2, st.y + st.h * 0.62, st.w - 4, st.h * 0.38, 6); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = color; roundRect(ctx, st.x + 2, st.y + st.h * 0.55, st.w - 4, st.h * 0.16, 5); ctx.fill(); ctx.stroke();
}

function drawDairy(ctx, st, now, time) {
  // grass pen + fence
  ctx.fillStyle = '#9ccc65'; roundRect(ctx, st.x + 2, st.y + 2, st.w - 4, st.h * 0.62, 8); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = '#e0c097';
  for (let i = 0; i <= 4; i++) { roundRect(ctx, st.x + 6 + i * ((st.w - 16) / 4), st.y + 6, 5, st.h * 0.3, 2); ctx.fill(); }
  ctx.fillStyle = '#d4b48c'; roundRect(ctx, st.x + 4, st.y + 12, st.w - 8, 4, 2); ctx.fill(); roundRect(ctx, st.x + 4, st.y + 26, st.w - 8, 4, 2); ctx.fill();
  // cow
  const cx = st.cx + 10, cy = st.y + st.h * 0.42 + Math.sin(time * 1.5) * 1;
  ctx.fillStyle = '#fff'; roundRect(ctx, cx - 30, cy - 18, 60, 30, 12); ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#3b3b3b'; ellipse(ctx, cx - 12, cy - 6, 9, 7); ctx.fill(); ellipse(ctx, cx + 14, cy + 4, 7, 5); ctx.fill();
  ctx.fillStyle = '#f8bbd0'; roundRect(ctx, cx - 10, cy + 6, 20, 9, 4); ctx.fill();
  // head
  const hx = cx - 34, hy = cy - 6 + Math.sin(time * 2.3) * 1.5;
  ctx.fillStyle = '#fff'; roundRect(ctx, hx - 12, hy - 12, 24, 24, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f8bbd0'; roundRect(ctx, hx - 9, hy + 2, 18, 9, 4); ctx.fill();
  ctx.fillStyle = '#3b3b3b'; ctx.beginPath(); ctx.arc(hx - 5, hy - 3, 2, 0, Math.PI * 2); ctx.arc(hx + 5, hy - 3, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0c097'; ellipse(ctx, hx - 10, hy - 12, 5, 3); ctx.fill(); ellipse(ctx, hx + 10, hy - 12, 5, 3); ctx.fill();
  // legs
  ctx.fillStyle = '#eee'; for (const dx of [-22, -8, 8, 22]) { roundRect(ctx, cx + dx - 4, cy + 10, 8, 10, 3); ctx.fill(); }
  counterBase(ctx, st, '#b0bec5');
  for (let i = 0; i < st.slots.length; i++) {
    const p = st.slots[i];
    if (i < st.stored) drawProduct(ctx, 'milk', p.x, p.y - 4, 0.6 * (i === st.stored - 1 ? 1 + st.pulse * 0.3 : 1));
  }
}

function drawCoop(ctx, st, now, time) {
  ctx.fillStyle = '#c5a46a'; roundRect(ctx, st.x + 2, st.y + 2, st.w - 4, st.h * 0.62, 8); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // hut
  const hx = st.x + st.w - 46, hy = st.y + 8;
  ctx.fillStyle = '#c0392b'; roundRect(ctx, hx, hy + 14, 40, 30, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6d4c33'; ctx.beginPath(); ctx.moveTo(hx - 6, hy + 16); ctx.lineTo(hx + 20, hy - 2); ctx.lineTo(hx + 46, hy + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3e2723'; roundRect(ctx, hx + 14, hy + 26, 12, 18, 3); ctx.fill();
  // chickens
  for (let i = 0; i < 2; i++) {
    const cx = st.x + 22 + i * 30, cy = st.y + 34 + Math.abs(Math.sin(time * 5 + i * 2)) * -3;
    ctx.fillStyle = '#fff'; ellipse(ctx, cx, cy, 11, 9); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 9, cy - 8, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e53935'; ellipse(ctx, cx + 9, cy - 15, 3, 2.5); ctx.fill();
    ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.moveTo(cx + 14, cy - 8); ctx.lineTo(cx + 19, cy - 6); ctx.lineTo(cx + 14, cy - 5); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(cx + 10, cy - 9, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  counterBase(ctx, st, '#d7b27a');
  // straw nests + eggs
  for (let i = 0; i < st.slots.length; i++) {
    const p = st.slots[i];
    ctx.fillStyle = '#e6c982'; ellipse(ctx, p.x, p.y, 12, 6); ctx.fill();
    if (i < st.stored) drawProduct(ctx, 'eggs', p.x, p.y - 4, 0.45 * (i === st.stored - 1 ? 1 + st.pulse * 0.3 : 1));
  }
}

function drawBakery(ctx, st, now, time) {
  ctx.fillStyle = '#b8a48a'; roundRect(ctx, st.x + 2, st.y + 2, st.w - 4, st.h * 0.62, 8); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // oven
  const ox = st.cx - 34, oy = st.y + 6;
  ctx.fillStyle = '#8d6e63'; roundRect(ctx, ox, oy, 68, 56, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) roundRect(ctx, ox + 6 + c * 15 + (r % 2) * 6, oy + 6 + r * 12, 10, 7, 2), ctx.fill();
  const glow = 0.5 + 0.5 * Math.sin(time * 6) * 0.3 + st.progress * 0.4;
  ctx.fillStyle = `rgba(255,${Math.floor(120 + glow * 80)},40,1)`; roundRect(ctx, ox + 16, oy + 24, 36, 26, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgba(255,240,150,${0.5 * glow})`; ellipse(ctx, ox + 34, oy + 40, 12, 6); ctx.fill();
  ctx.fillStyle = '#5d4037'; roundRect(ctx, ox + 26, oy - 10, 16, 12, 3); ctx.fill();
  counterBase(ctx, st, '#e0b27d');
  for (let i = 0; i < st.slots.length; i++) {
    const p = st.slots[i];
    if (i < st.stored) drawProduct(ctx, 'bread', p.x, p.y - 4, 0.6 * (i === st.stored - 1 ? 1 + st.pulse * 0.3 : 1));
  }
}

// ----------------------------------------------------------------- checkout
export function drawCheckout(ctx, co, now, time) {
  const { x, y, w, h } = co;
  drawShadow(ctx, x + w / 2, y + h + 4, w / 2, 8, 0.18);
  ctx.fillStyle = '#5c8fbf'; roundRect(ctx, x, y + 14, w, h - 14, 8); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = '#7fb0dd'; roundRect(ctx, x, y, w, 20, 7); ctx.fill(); ctx.stroke();
  // conveyor strip
  ctx.fillStyle = '#37474f'; roundRect(ctx, x + 10, y + 5, w - 60, 10, 4); ctx.fill();
  const off = (time * 30) % 12;
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < (w - 70) / 12; i++) ctx.fillRect(x + 12 + ((i * 12 + off) % (w - 64)), y + 7, 3, 6);
  // register
  const rx = x + w - 42, ry = y - 12;
  ctx.fillStyle = '#eceff1'; roundRect(ctx, rx, ry, 34, 26, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = co.active ? '#69f0ae' : '#9e9e9e'; roundRect(ctx, rx + 5, ry + 4, 24, 9, 3); ctx.fill();
  ctx.fillStyle = '#90a4ae'; for (let i = 0; i < 3; i++) roundRect(ctx, rx + 5 + i * 8, ry + 16, 6, 5, 1.5), ctx.fill();
  // serving progress ring
  if (co.queue.length && co.progress > 0) {
    ctx.save(); ctx.translate(x + w / 2, y - 28);
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * co.progress); ctx.lineWidth = 5; ctx.strokeStyle = '#43a047'; ctx.stroke();
    ctx.restore();
  }
  // "stand here" hint when nobody is serving and a queue exists
  if (!co.active && co.queue.length) {
    const p = 0.6 + Math.sin(time * 5) * 0.3;
    ctx.fillStyle = `rgba(255, 213, 79, ${p})`; roundRect(ctx, co.interactRect.x + 8, co.interactRect.y + 8, co.interactRect.w - 16, co.interactRect.h - 12, 10); ctx.fill();
  }
}

// ---------------------------------------------------------------- zones
export function drawZone(ctx, zone, affordable, progress, time) {
  const { x, y, w, h } = zone.rect;
  const pulse = 1 + Math.sin(time * 3 + x * 0.01) * 0.025;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(pulse, pulse);
  const color = affordable ? '#43a047' : '#8d6e63';
  ctx.fillStyle = affordable ? 'rgba(129,199,132,0.35)' : 'rgba(0,0,0,0.12)';
  roundRect(ctx, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 10); ctx.fill();
  ctx.setLineDash([8, 6]); ctx.lineDashOffset = -time * 20;
  ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke(); ctx.setLineDash([]);
  // progress fill while the player stands in the zone (purchase animation)
  if (progress > 0) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; roundRect(ctx, -w / 2 + 4, -h / 2 + 4, (w - 8) * progress, h - 8, 10); ctx.fill(); }
  ctx.restore();
  // label card above the zone
  const cx = x + w / 2, cy = y - 8;
  ctx.font = '800 13px Nunito, sans-serif';
  const tw = Math.max(70, ctx.measureText(zone.label).width + 20);
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(ctx, cx - tw / 2, cy - 36, tw, 34, 10); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(zone.label, cx, cy - 26);
  drawCoin(ctx, cx - 16, cy - 10, 6);
  ctx.fillStyle = affordable ? '#2e7d32' : '#c62828'; ctx.font = '900 13px Nunito, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(String(zone.cost), cx - 7, cy - 10);
  if (zone.kind === 'hire') {
    // little hard hat icon
    ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(cx, y + h / 2 - 2, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 13, y + h / 2 - 3, 26, 4);
  }
}

// ---------------------------------------------------------------- decor
export function drawDecoration(ctx, d, time) {
  const x = d.x * TILE, y = d.y * TILE;
  switch (d.kind) {
    case 'tree': {
      drawShadow(ctx, x, y + 4, 26, 9, 0.2);
      ctx.fillStyle = '#6b4a2b'; roundRect(ctx, x - 7, y - 36, 14, 38, 5); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
      const s = Math.sin(time * 1.1 + x) * 2;
      ctx.fillStyle = '#4e9a3f'; ellipse(ctx, x + s, y - 52, 34, 30); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#66b04e'; ellipse(ctx, x - 10 + s, y - 62, 16, 12); ctx.fill();
      break;
    }
    case 'bush':
      drawShadow(ctx, x, y + 6, 22, 7, 0.18);
      ctx.fillStyle = '#5aa64a'; ellipse(ctx, x, y - 6, 22, 14); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUTLINE; ctx.stroke();
      ctx.fillStyle = '#74c25f'; ellipse(ctx, x - 7, y - 12, 10, 7); ctx.fill();
      break;
    case 'flowers':
      for (let i = 0; i < 5; i++) {
        const fx = x + (i - 2) * 12, fy = y + Math.sin(i * 2) * 5;
        ctx.fillStyle = ['#f06292', '#ffd54f', '#ba68c8', '#4fc3f7', '#ff8a65'][i]; ctx.beginPath(); ctx.arc(fx, fy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff59d'; ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
      }
      break;
  }
}

// Tutorial arrow bobbing above a world point.
export function drawArrow(ctx, x, y, time) {
  const bob = Math.sin(time * 5) * 6;
  ctx.save(); ctx.translate(x, y - 70 + bob);
  ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(-16, 0); ctx.lineTo(-7, 0); ctx.lineTo(-7, -18); ctx.lineTo(7, -18); ctx.lineTo(7, 0); ctx.lineTo(16, 0); ctx.closePath();
  ctx.fillStyle = '#ffd54f'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8d6e00'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
