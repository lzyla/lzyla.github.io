// Entry point: waits for fonts (best effort) and boots the game.
import { Game } from './game.js';

function boot() {
  const canvas = document.getElementById('game');
  window.__game = new Game(canvas);   // handy for debugging in the console
}

if (document.fonts && document.fonts.load) {
  Promise.race([document.fonts.load('800 16px Nunito'), new Promise((r) => setTimeout(r, 800))]).finally(boot);
} else {
  boot();
}
