import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from './constants.js';

// 游戏主体：持有全部状态，每帧被 main.js 调用 update + render。
// 纯逻辑（不触碰 DOM），可在 Node 下测试。
export class Game {
  constructor() {
    this.state = 'playing'; // playing | levelClear | gameOver | victory
  }

  update(dt, input) {
    if (this.state !== 'playing') return;
  }

  render(ctx) {
    // 背景与 HUD 区
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLORS.brickDark;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
  }
}
