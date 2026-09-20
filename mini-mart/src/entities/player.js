// The player character: moved by the input vector, collides with furniture.
import { Character, makeAppearance } from './character.js';

export class Player extends Character {
  constructor(x, y) {
    super(x, y, makeAppearance(7, {
      skin: '#ffd9b8', hair: '#4a2c17', top: '#ffb703', pants: '#2f3e56', shoes: '#3b2a1a',
      hairstyle: 'cap', height: 1.05, width: 1.0, glasses: false, bag: false, apron: true,
    }));
    this.radius = 18;
    this.speed = 230;
  }

  update(dt, input, world) {
    let ix = input.x, iy = input.y;
    let l = Math.hypot(ix, iy);
    if (l > 1) { ix /= l; iy /= l; l = 1; }          // normalise diagonals
    const dx = ix * this.speed * dt, dy = iy * this.speed * dt;
    // safety: never stay stuck inside an obstacle
    if (world.circleHits(this.x, this.y, this.radius * 0.7)) { const p = world.ejectCircle(this.x, this.y, this.radius * 0.7); this.x = p.x; this.y = p.y; }
    const res = world.moveCircle(this.x, this.y, this.radius * 0.7, dx, dy);
    const mdx = res.x - this.x, mdy = res.y - this.y;
    this.x = res.x; this.y = res.y;
    this.animate(dt, mdx, mdy);
    // facing follows the stick even when a wall stops the movement
    if (l > 0.05) { this.faceX = ix / l; this.faceY = iy / l; }
  }
}
