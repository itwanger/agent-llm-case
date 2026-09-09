/* ============================================================
 * main.ts — bootstrap
 * ============================================================ */

import './style.css';
import { Game } from './game';
import { audio } from './audio';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const game = new Game(canvas);
game.start();

/* hide the loading screen once the first frame is on screen */
requestAnimationFrame(() =>
  requestAnimationFrame(() => setTimeout(() => game.hud.hideLoading(), 260)),
);

/* restart: R key or the results button */
document.getElementById('restart-btn')!.addEventListener('click', () => game.requestRestart());
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') game.requestRestart();
});

/* handy for debugging / automated checks */
(window as unknown as { __game: Game; __audio: typeof audio }).__game = game;
(window as unknown as { __game: Game; __audio: typeof audio }).__audio = audio;
