import {
  CANVAS_WIDTH, CANVAS_HEIGHT, HUD_HEIGHT, COLORS,
  TILE, GRID, TANK_SIZE, TANK_OFFSET,
  PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW, PLAYER_BULLET_LIMIT, PLAYER_FIRE_COOLDOWN,
  MAX_ENEMIES_ON_SCREEN, ENEMIES_PER_LEVEL, ENEMY_SPAWN_COLS, ENEMY_SPAWN_ROW,
  ENEMY_SPAWN_INTERVAL, RESPAWN_INVINCIBLE,
  DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT, DIR_DX, DIR_DY
} from './constants.js';
import { GameMap, TOTAL_LEVELS } from './map.js';
import { PlayerTank, EnemyTank } from './tank.js';

// 游戏主体：持有全部状态，每帧被 main.js 调用 update + render。
// 纯逻辑（不触碰 DOM），可在 Node 下测试。
export class Game {
  constructor(rng = Math.random) {
    this.rng = rng; // 可注入随机源，便于测试
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
    this.enemiesRemaining = ENEMIES_PER_LEVEL; // 本关待出生的敌人总数
    this.spawnTimer = 1.0;                     // 距下次出生尝试的秒数
    this.spawnIndex = 0;                       // 轮换出生点
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

  // 敌人出生调度：场上未满且还有剩余敌人时，按间隔在轮换出生点放置
  updateSpawning(dt) {
    if (this.enemiesRemaining <= 0) return;
    if (this.enemies.length >= MAX_ENEMIES_ON_SCREEN) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const col = ENEMY_SPAWN_COLS[this.spawnIndex % ENEMY_SPAWN_COLS.length];
    const x = col * TILE + TANK_OFFSET;
    const y = ENEMY_SPAWN_ROW * TILE + TANK_OFFSET;
    // 出生点被其他坦克占据则稍后重试
    for (const t of this.allTanks()) {
      if (t.alive && t.x === x && t.y === y) {
        this.spawnTimer = 0.5;
        return;
      }
    }
    this.enemies.push(new EnemyTank(x, y, this.rng));
    this.spawnIndex++;
    this.enemiesRemaining--;
    this.spawnTimer = ENEMY_SPAWN_INTERVAL;
  }

  killPlayer() {
    this.player.alive = false;
    this.lives--;
    if (this.lives <= 0) {
      this.state = 'gameOver';
      return;
    }
    // 立即重生，附带短暂无敌
    this.player = new PlayerTank(
      PLAYER_SPAWN_COL * TILE + TANK_OFFSET,
      PLAYER_SPAWN_ROW * TILE + TANK_OFFSET
    );
    this.player.invincible = RESPAWN_INVINCIBLE;
  }

  // 子弹与坦克的命中判定
  handleBulletTankCollisions() {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      const rb = b.rect();
      if (b.owner === 'player') {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const re = e.rect();
          if (rb.x < re.x + re.w && rb.x + rb.w > re.x &&
              rb.y < re.y + re.h && rb.y + rb.h > re.y) {
            b.alive = false;
            e.alive = false;
            break;
          }
        }
      } else {
        const p = this.player;
        if (p.alive && p.invincible <= 0) {
          const rp = p.rect();
          if (rb.x < rp.x + rp.w && rb.x + rb.w > rp.x &&
              rb.y < rp.y + rp.h && rb.y + rb.h > rp.y) {
            b.alive = false;
            this.killPlayer();
          }
        }
      }
    }
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (e.alive) e.update(dt, this);
    }
  }

  // 胜利判定：剩余敌人清零且场上敌人清空
  checkVictory() {
    if (this.state === 'playing' &&
        this.enemiesRemaining === 0 && this.enemies.length === 0) {
      this.state = 'levelClear';
    }
  }

  updateBullets(dt) {
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.update(dt);
      // 飞出地图边界
      if (b.x < 0 || b.y < 0 || b.x > TILE * GRID || b.y > TILE * GRID) {
        b.alive = false;
        continue;
      }
      // 命中地形：砖块被摧毁，钢/基地/边界仅挡住子弹（基地判定在状态流转中处理）
      const hit = this.map.hitBullet(b.x, b.y);
      if (hit) b.alive = false;
    }
    // 敌我子弹相撞，同归于尽
    for (let i = 0; i < this.bullets.length; i++) {
      const a = this.bullets[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.bullets.length; j++) {
        const b = this.bullets[j];
        if (!b.alive || a.owner === b.owner) continue;
        const ra = a.rect(), rb = b.rect();
        if (ra.x < rb.x + rb.w && ra.x + ra.w > rb.x &&
            ra.y < rb.y + rb.h && ra.y + ra.h > rb.y) {
          a.alive = false;
          b.alive = false;
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }

  update(dt, input) {
    if (this.state !== 'playing') return;
    this.updatePlayer(dt, input);
    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.handleBulletTankCollisions();
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemies = this.enemies.filter(e => e.alive);
    this.checkVictory();
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
    for (const e of this.enemies) e.render(ctx);
    for (const b of this.bullets) b.render(ctx);
    ctx.restore();
  }
}
