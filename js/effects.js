import { COLORS } from './constants.js';

// 单个特效：圆形扩散动画
export class Effect {
  constructor(x, y, duration, color, maxRadius) {
    this.x = x;             // 中心
    this.y = y;
    this.age = 0;
    this.duration = duration;
    this.color = color;
    this.maxRadius = maxRadius;
    this.alive = true;
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.duration) this.alive = false;
  }

  render(ctx) {
    const t = Math.min(this.age / this.duration, 1);
    const radius = 2 + this.maxRadius * t;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class EffectManager {
  constructor() {
    this.list = [];
  }

  // 坦克 / 基地爆炸：外圈橙 + 内芯黄
  addExplosion(x, y, big = false) {
    const outer = big ? 26 : 16;
    this.list.push(new Effect(x, y, 0.35, COLORS.explosion, outer));
    this.list.push(new Effect(x, y, 0.25, COLORS.explosionCore, outer * 0.5));
  }

  // 子弹命中的小火花
  addSpark(x, y) {
    this.list.push(new Effect(x, y, 0.12, COLORS.spark, 6));
  }

  update(dt) {
    for (const e of this.list) e.update(dt);
    this.list = this.list.filter(e => e.alive);
  }

  render(ctx) {
    for (const e of this.list) e.render(ctx);
  }

  get count() {
    return this.list.length;
  }
}
