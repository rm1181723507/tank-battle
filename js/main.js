import { Game } from './game.js';
import { createInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game();
const input = createInput();

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // 限制单帧步长，切后台回来不会跳帧穿透
  last = now;
  game.update(dt, input);
  game.render(ctx);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
