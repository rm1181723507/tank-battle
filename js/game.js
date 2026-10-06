import {
  CANVAS_WIDTH, CANVAS_HEIGHT, HUD_HEIGHT, COLORS,
  TILE, TANK_SIZE, TANK_OFFSET,
  PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW, PLAYER_BULLET_LIMIT, PLAYER_FIRE_COOLDOWN,
  DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT, DIR_DX, DIR_DY
} from './constants.js';
import { GameMap, TOTAL_LEVELS } from './map.js';
import { PlayerTank } from './tank.js';

// 游戏主体：持有全部状态，每帧被 main.js 调用 update + render。
// 纯逻辑（不触碰 DOM），可在 Node 下测试。
export class Game {
  constructor() {
    this.levelIndex = 0;
    this.lives = 3;
    this.startLevel();
  }

  startLevel() {
    this.map = new GameMap(this.levelIndex);
    this.player = new PlayerTank(
      PLAYER_SPAWN_COL * TILE + TANK_OFFSET,
      PLAYER_SPAWN_ROW * TILE + TANK_OFFSET
    );
    this.enemies = [];
    this.bullets = [];
    this.state = 'playing'; // playing | levelClear | gameOver | victory
  }

  // 全部坦克（用于坦克间碰撞）
  allTanks() {
    return [this.player, ...this.enemies];
  }

  // 场上某方的存活子弹数
  countBullets(owner) {
    let n = 0;
    for (const b of this.bullets) {
      if (b.owner === owner && b.alive) n++;
    }
    return n;
  }

  // 改变朝向后，把垂直于朝向的坐标吸附到瓦片边界，
  // 保证坦克能钻进单格宽的通道；吸附后若重叠则放弃吸附。
  snapTank(tank) {
    if (tank.dir === DIR_LEFT || tank.dir === DIR_RIGHT) {
      const old = tank.y;
      tank.y = Math.round((tank.y - TANK_OFFSET) / TILE) * TILE + TANK_OFFSET;
      if (this.map.rectCollides(tank.x, tank.y, TANK_SIZE, TANK_SIZE)) tank.y = old;
    } else {
      const old = tank.x;
      tank.x = Math.round((tank.x - TANK_OFFSET) / TILE) * TILE + TANK_OFFSET;
      if (this.map.rectCollides(tank.x, tank.y, TANK_SIZE, TANK_SIZE)) tank.x = old;
    }
  }

  updatePlayer(dt, input) {
    const p = this.player;
    p.update(dt);
    if (!p.alive) return;

    // 方向：优先级 上 > 下 > 左 > 右
    let dir = null;
    if (input.isDown('up')) dir = DIR_UP;
    else if (input.isDown('down')) dir = DIR_DOWN;
    else if (input.isDown('left')) dir = DIR_LEFT;
    else if (input.isDown('right')) dir = DIR_RIGHT;

    if (dir !== null) {
      if (dir !== p.dir) {
        p.dir = dir;
        this.snapTank(p);
      }
      p.tryMove(DIR_DX[dir] * p.speed * dt, DIR_DY[dir] * p.speed * dt,
        this.map, this.allTanks());
    }

    // 开火
    if (input.isDown('fire') && p.canFire() &&
        this.countBullets('player') < PLAYER_BULLET_LIMIT) {
      this.bullets.push(p.makeBullet());
      p.cooldown = PLAYER_FIRE_COOLDOWN;
    }
  }

  update(dt, input) {
    if (this.state !== 'playing') return;
    this.updatePlayer(dt, input);
  }

  render(ctx) {
    // 背景与 HUD 区
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLORS.brickDark;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    // 地图与实体
    ctx.save();
    ctx.translate(0, HUD_HEIGHT);
    this.map.render(ctx);
    this.player.render(ctx);
    for (const b of this.bullets) b.render(ctx);
    ctx.restore();
  }
}
