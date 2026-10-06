import {
  TANK_SIZE, PLAYER_SPEED, ENEMY_SPEED, ENEMY_FIRE_COOLDOWN, ENEMY_BULLET_LIMIT,
  DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT, DIR_DX, DIR_DY,
  TILE, COLORS
} from './constants.js';
import { Bullet } from './bullet.js';

// 坦克基类：位置、朝向、移动（网格碰撞）、开火冷却。
export class Tank {
  constructor(x, y, dir, speed, owner) {
    this.x = x;             // 像素坐标（左上角）
    this.y = y;
    this.dir = dir;
    this.speed = speed;
    this.owner = owner;     // 'player' | 'enemy'
    this.alive = true;
    this.cooldown = 0;      // 开火冷却剩余秒数
  }

  rect() {
    return { x: this.x, y: this.y, w: TANK_SIZE, h: TANK_SIZE };
  }

  get centerX() {
    return this.x + TANK_SIZE / 2;
  }

  get centerY() {
    return this.y + TANK_SIZE / 2;
  }

  updateCooldown(dt) {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  canFire() {
    return this.alive && this.cooldown <= 0;
  }

  // 在炮口位置生成一颗子弹（是否允许发射——在场子弹上限——由 Game 判定）
  makeBullet() {
    const mx = this.centerX + DIR_DX[this.dir] * (TANK_SIZE / 2 + 1);
    const my = this.centerY + DIR_DY[this.dir] * (TANK_SIZE / 2 + 1);
    return new Bullet(mx, my, this.dir, this.owner);
  }

  // 尝试按位移移动；与实心瓦片或其他坦克重叠则整体放弃本次移动。
  // 返回是否移动成功。
  tryMove(dx, dy, map, others = []) {
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (map.rectCollides(nx, ny, TANK_SIZE, TANK_SIZE)) return false;
    for (const other of others) {
      if (other === this || !other.alive) continue;
      const r = other.rect();
      if (nx < r.x + r.w && nx + TANK_SIZE > r.x && ny < r.y + r.h && ny + TANK_SIZE > r.y) {
        return false;
      }
    }
    this.x = nx;
    this.y = ny;
    return true;
  }

  render(ctx, bodyColor, darkColor) {
    if (!this.alive) return;
    const { x, y } = this;
    // 车身
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x, y, TANK_SIZE, TANK_SIZE);
    // 履带
    ctx.fillStyle = darkColor;
    if (this.dir === 0 || this.dir === 2) { // 垂直朝向：左右履带
      ctx.fillRect(x, y, 6, TANK_SIZE);
      ctx.fillRect(x + TANK_SIZE - 6, y, 6, TANK_SIZE);
    } else { // 水平朝向：上下履带
      ctx.fillRect(x, y, TANK_SIZE, 6);
      ctx.fillRect(x, y + TANK_SIZE - 6, TANK_SIZE, 6);
    }
    // 炮塔
    ctx.fillStyle = darkColor;
    ctx.fillRect(x + 9, y + 9, TANK_SIZE - 18, TANK_SIZE - 18);
    // 炮管
    ctx.fillStyle = bodyColor;
    const cx = this.centerX;
    const cy = this.centerY;
    const half = TANK_SIZE / 2;
    if (this.dir === 0) ctx.fillRect(cx - 2, y, 4, half);
    else if (this.dir === 2) ctx.fillRect(cx - 2, y + half, 4, half);
    else if (this.dir === 3) ctx.fillRect(x, cy - 2, half, 4);
    else ctx.fillRect(x + half, cy - 2, half, 4);
  }
}

export class PlayerTank extends Tank {
  constructor(x, y) {
    super(x, y, 0 /* 朝上 */, PLAYER_SPEED, 'player');
    this.invincible = 0; // 重生无敌剩余秒数
  }

  update(dt) {
    this.updateCooldown(dt);
    if (this.invincible > 0) this.invincible = Math.max(0, this.invincible - dt);
  }

  render(ctx) {
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) return; // 无敌闪烁
    super.render(ctx, COLORS.player, COLORS.playerDark);
  }
}

// 沿 dir 方向从坦克中心发射直线，检查 dist 路径上（不含目标格）是否有实心瓦片
function pathClear(map, x, y, dir, dist) {
  const steps = Math.ceil(dist / TILE);
  for (let s = 1; s < steps; s++) {
    const px = x + DIR_DX[dir] * s * TILE;
    const py = y + DIR_DY[dir] * s * TILE;
    if (map.isSolid(map.tileAt(Math.floor(px / TILE), Math.floor(py / TILE)))) {
      return false;
    }
  }
  return true;
}

export class EnemyTank extends Tank {
  constructor(x, y, rng = Math.random) {
    super(x, y, DIR_DOWN, ENEMY_SPEED, 'enemy');
    this.rng = rng;                 // 可注入，便于测试
    this.turnTimer = 1 + rng() * 2; // 距下次主动换向的秒数
    this.fireTimer = 0.5 + rng();   // 距下次尝试开火的秒数
  }

  update(dt, game) {
    this.updateCooldown(dt);

    // 移动：撞墙或换向计时到点则重新选向
    this.turnTimer -= dt;
    const moved = this.tryMove(
      DIR_DX[this.dir] * this.speed * dt,
      DIR_DY[this.dir] * this.speed * dt,
      game.map, game.allTanks()
    );
    if (this.turnTimer <= 0 || !moved) {
      this.pickDirection(game);
      this.turnTimer = 1 + this.rng() * 2;
    }

    // 开火：与玩家同行/列且有清晰弹道时朝玩家开火，否则小概率随机开火
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = ENEMY_FIRE_COOLDOWN * (0.7 + this.rng() * 0.6);
      const shotDir = this.clearShotDir(game);
      if (shotDir >= 0) {
        this.dir = shotDir;
        this.tryFire(game);
      } else if (this.rng() < 0.35) {
        this.tryFire(game);
      }
    }
  }

  tryFire(game) {
    if (this.canFire() && game.countBullets(this.owner) < ENEMY_BULLET_LIMIT) {
      game.bullets.push(this.makeBullet());
    }
  }

  // 偏好朝向玩家：一半概率直接瞄准，一半概率随机
  pickDirection(game) {
    const p = game.player;
    if (p.alive && this.rng() < 0.5) {
      const dx = p.centerX - this.centerX;
      const dy = p.centerY - this.centerY;
      this.dir = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? DIR_RIGHT : DIR_LEFT)
        : (dy > 0 ? DIR_DOWN : DIR_UP);
    } else {
      this.dir = Math.floor(this.rng() * 4);
    }
  }

  // 若与玩家同行/列且弹道无实心瓦片阻挡，返回应朝向的方向，否则 -1
  clearShotDir(game) {
    const p = game.player;
    if (!p.alive) return -1;
    const dx = p.centerX - this.centerX;
    const dy = p.centerY - this.centerY;
    if (Math.abs(dx) <= 8 && Math.abs(dy) > TANK_SIZE &&
        pathClear(game.map, this.centerX, this.centerY, dy > 0 ? DIR_DOWN : DIR_UP, Math.abs(dy))) {
      return dy > 0 ? DIR_DOWN : DIR_UP;
    }
    if (Math.abs(dy) <= 8 && Math.abs(dx) > TANK_SIZE &&
        pathClear(game.map, this.centerX, this.centerY, dx > 0 ? DIR_RIGHT : DIR_LEFT, Math.abs(dx))) {
      return dx > 0 ? DIR_RIGHT : DIR_LEFT;
    }
    return -1;
  }

  render(ctx) {
    super.render(ctx, COLORS.enemy, COLORS.enemyDark);
  }
}
