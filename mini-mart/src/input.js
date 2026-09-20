// Keyboard (WASD / arrows) + analog on-screen joystick (pointer events).
export class Input {
  constructor(layer, joystickEl) {
    this.keys = new Set();
    this.layer = layer;
    this.joy = joystickEl;
    this.joyKnob = joystickEl.querySelector('.knob');
    this.pointerId = null;
    this.base = { x: 0, y: 0 };
    this.stick = { x: 0, y: 0 };      // -1..1 analog vector
    this.radius = 52;                 // px travel of the knob
    this.enabled = true;
    this.anyInput = false;            // set once the player has moved (tutorial)

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { this.keys.add(k); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    layer.addEventListener('pointerdown', (e) => this.onDown(e));
    layer.addEventListener('pointermove', (e) => this.onMove(e));
    layer.addEventListener('pointerup', (e) => this.onUp(e));
    layer.addEventListener('pointercancel', (e) => this.onUp(e));
    layer.addEventListener('lostpointercapture', (e) => this.onUp(e));
    // block page gestures while playing
    layer.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    layer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    layer.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onDown(e) {
    if (!this.enabled || this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.layer.setPointerCapture?.(e.pointerId);
    this.base.x = e.clientX; this.base.y = e.clientY;
    this.joy.style.left = `${e.clientX}px`;
    this.joy.style.top = `${e.clientY}px`;
    this.joy.classList.add('active');
    this.joyKnob.style.transform = 'translate(-50%,-50%)';
    this.stick.x = 0; this.stick.y = 0;
  }

  onMove(e) {
    if (e.pointerId !== this.pointerId) return;
    let dx = e.clientX - this.base.x, dy = e.clientY - this.base.y;
    const d = Math.hypot(dx, dy);
    if (d > this.radius) { dx = dx / d * this.radius; dy = dy / d * this.radius; }
    // dead zone 12% then linear
    const mag = Math.hypot(dx, dy) / this.radius;
    const adj = mag < 0.12 ? 0 : (mag - 0.12) / 0.88;
    const l = Math.hypot(dx, dy) || 1;
    this.stick.x = dx / l * adj; this.stick.y = dy / l * adj;
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    if (adj > 0) this.anyInput = true;
  }

  onUp(e) {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.stick.x = 0; this.stick.y = 0;
    this.joy.classList.remove('active');
  }

  // Combined movement vector (keyboard has priority when pressed).
  get vector() {
    let x = 0, y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 || y !== 0) { this.anyInput = true; const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    return { x: this.stick.x, y: this.stick.y };
  }
}
