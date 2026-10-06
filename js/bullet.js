import { BULLET_SIZE, BULLET_SPEED, DIR_DX, DIR_DY, COLORS } from './constants.js';

// 子弹：以中心点坐标存储，命中判定由 Game 调度。
export class Bullet {
  constructor(x, y, dir, owner) {
    this.x = x;             // 中心点
    this.y = y;
    this.dir = dir;
    this.owner = owner;     // 'player' | 'enemy'
    this.speed = BULLET_SPEED;
    this.alive = true;
  }

  rect() {
    const half = BULLET_SIZE / 2;
    return { x: this.x - half, y: this.y - half, w: BULLET_SIZE, h: BULLET_SIZE };
  }

  update(dt) {
    this.x += DIR_DX[this.dir] * this.speed * dt;
    this.y += DIR_DY[this.dir] * this.speed * dt;
  }

  render(ctx) {
    if (!this.alive) return;
    const r = this.rect();
    ctx.fillStyle = COLORS.bullet;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
}
