// 本文件由 scripts/build.js 自动生成，请勿手改。
// 源码：js/*.js（ES Module），修改后运行 npm run build 重新生成。

(function () {
'use strict';
// ===== js/constants.js =====
// 全局常量：尺寸、速度、方向、颜色

const TILE = 32;               // 瓦片边长（像素）
const GRID = 13;               // 地图 13×13 格
const HUD_HEIGHT = 64;         // 顶部 HUD 高度
const CANVAS_WIDTH = TILE * GRID;          // 416
const CANVAS_HEIGHT = TILE * GRID + HUD_HEIGHT; // 480

// 方向枚举
const DIR_UP = 0;
const DIR_RIGHT = 1;
const DIR_DOWN = 2;
const DIR_LEFT = 3;
const DIR_DX = [0, 1, 0, -1];
const DIR_DY = [-1, 0, 1, 0];

// 瓦片类型
const TILE_EMPTY = 0;
const TILE_BRICK = 1;
const TILE_STEEL = 2;
const TILE_BASE = 3;

// 坦克与子弹
const TANK_SIZE = 28;
const TANK_OFFSET = (TILE - TANK_SIZE) / 2; // 坦克在格内居中的偏移（2px）
const PLAYER_SPEED = 80;
const ENEMY_SPEED = 56;
const PLAYER_FIRE_COOLDOWN = 0.4;
const ENEMY_FIRE_COOLDOWN = 1.2;
const PLAYER_BULLET_LIMIT = 1;  // 同屏己方子弹上限
const ENEMY_BULLET_LIMIT = 1;
const BULLET_SIZE = 6;
const BULLET_SPEED = 240;

// 出生点（瓦片坐标）
const PLAYER_SPAWN_COL = 4;
const PLAYER_SPAWN_ROW = 12;
const ENEMY_SPAWN_COLS = [0, 6, 12];
const ENEMY_SPAWN_ROW = 0;

// 游戏规则
const PLAYER_MAX_LIVES = 3;
const RESPAWN_INVINCIBLE = 2;      // 重生无敌时间（秒）
const MAX_ENEMIES_ON_SCREEN = 3;
const ENEMIES_PER_LEVEL = 6;
const ENEMY_SPAWN_INTERVAL = 2.5;  // 敌人出生间隔（秒）

// 颜色
const COLORS = {
  background: '#000000',
  hud: '#808080',
  text: '#ffffff',
  player: '#e8c832',
  playerDark: '#8f7a10',
  enemy: '#c0c0c0',
  enemyDark: '#6f6f6f',
  brick: '#b85427',
  brickDark: '#7d3419',
  steel: '#9c9c9c',
  steelDark: '#5f5f5f',
  base: '#d4a017',
  baseDark: '#8a6a0f',
  bullet: '#ffffff',
  spark: '#ffe14d',
  explosion: '#ff7f27',
  explosionCore: '#ffe14d'
};

// ===== js/bullet.js =====

// 子弹：以中心点坐标存储，命中判定由 Game 调度。
class Bullet {
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

// ===== js/effects.js =====

// 单个特效：圆形扩散动画
class Effect {
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

class EffectManager {
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

// ===== js/map.js =====

// 字符关卡定义：'.'=空 B=砖 S=钢 E=基地（每行 13 字符，共 13 行）
const LEVELS = [
  [
    '.............',
    '.B.B.B.B.B.B.',
    '.B.B.B.B.B.B.',
    '.B.B.BSB.B.B.',
    '.B.B.....B.B.',
    '.....B.B.....',
    'BB.BB...BB.BB',
    '.....B.B.....',
    '.B.B.....B.B.',
    '.B.B.B.B.B.B.',
    '.B.B.BBB.B.B.',
    '.B...BBB...B.',
    '.....BEB.....'
  ],
  [
    '.............',
    '.S.B.B.B.B.S.',
    '...B.....B...',
    '.B.B.BBB.B.B.',
    '.B.B.B.B.B.B.',
    '...B..S..B...',
    'BB.B.....B.BB',
    '...B.....B...',
    '.B.B.B.B.B.B.',
    '.B.B.BBB.B.B.',
    '...B.....B...',
    '.B...BBB...B.',
    '.....BEB.....'
  ]
];

const TOTAL_LEVELS = LEVELS.length;

const CHAR_TO_TILE = {
  '.': TILE_EMPTY,
  'B': TILE_BRICK,
  'S': TILE_STEEL,
  'E': TILE_BASE
};

class GameMap {
  constructor(levelIndex = 0) {
    this.load(levelIndex);
  }

  load(levelIndex) {
    const rows = LEVELS[levelIndex % LEVELS.length];
    this.grid = rows.map(row => [...row].map(ch => CHAR_TO_TILE[ch]));
  }

  // 越界视为钢墙（实心），使坦克和子弹无法离开地图
  tileAt(col, row) {
    if (col < 0 || row < 0 || col >= GRID || row >= GRID) return TILE_STEEL;
    return this.grid[row][col];
  }

  isSolid(type) {
    return type !== TILE_EMPTY;
  }

  // 像素矩形是否与实心瓦片重叠
  rectCollides(x, y, w, h) {
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + w - 1) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + h - 1) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isSolid(this.tileAt(c, r))) return true;
      }
    }
    return false;
  }

  // 子弹（中心点命中）击中地图。
  // 返回：null=未命中 | 'brick'（砖被摧毁）| 'steel' | 'base' | 'edge'
  hitBullet(px, py) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || row < 0 || col >= GRID || row >= GRID) return 'edge';
    const type = this.tileAt(col, row);
    switch (type) {
      case TILE_BRICK:
        this.grid[row][col] = TILE_EMPTY;
        return 'brick';
      case TILE_STEEL:
        return 'steel';
      case TILE_BASE:
        return 'base';
      default:
        return null;
    }
  }

  // 基地（老鹰）所在格
  findBase() {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (this.grid[r][c] === TILE_BASE) return { col: c, row: r };
      }
    }
    return null;
  }

  render(ctx) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const type = this.grid[r][c];
        if (type === TILE_EMPTY) continue;
        const x = c * TILE;
        const y = r * TILE;
        if (type === TILE_BRICK) {
          ctx.fillStyle = COLORS.brick;
          ctx.fillRect(x, y, TILE, TILE);
          // 砖缝
          ctx.fillStyle = COLORS.brickDark;
          ctx.fillRect(x, y + TILE / 2 - 1, TILE, 2);
          ctx.fillRect(x + TILE / 2 - 1, y, 2, TILE / 2);
          ctx.fillRect(x + TILE / 4 - 1, y + TILE / 2 + TILE / 4 - 1, 2, TILE / 4);
        } else if (type === TILE_STEEL) {
          ctx.fillStyle = COLORS.steel;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = COLORS.steelDark;
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.fillStyle = COLORS.steel;
          ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 16);
        } else if (type === TILE_BASE) {
          ctx.fillStyle = COLORS.base;
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.fillStyle = COLORS.baseDark;
          ctx.fillRect(x + 10, y + 12, TILE - 20, TILE - 22);
          ctx.fillStyle = COLORS.base;
          ctx.fillRect(x + 13, y + 6, 2, 6);
          ctx.fillRect(x + 17, y + 4, 2, 8);
        }
      }
    }
  }
}

// ===== js/tank.js =====


// 坦克基类：位置、朝向、移动（网格碰撞）、开火冷却。
class Tank {
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

class PlayerTank extends Tank {
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

class EnemyTank extends Tank {
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

// ===== js/game.js =====




// 游戏主体：持有全部状态，每帧被 main.js 调用 update + render。
// 纯逻辑（不触碰 DOM），可在 Node 下测试。
class Game {
  constructor(rng = Math.random) {
    this.rng = rng; // 可注入随机源，便于测试
    this.levelIndex = 0;
    this.lives = PLAYER_MAX_LIVES;
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
    this.effects = new EffectManager();
    this.enemiesRemaining = ENEMIES_PER_LEVEL; // 本关待出生的敌人总数
    this.spawnTimer = 1.0;                     // 距下次出生尝试的秒数
    this.spawnIndex = 0;                       // 轮换出生点
    this.baseAlive = true;
    this.state = 'playing'; // playing | levelClear | gameOver | victory
  }

  // Enter 键流转：关卡完成→下一关/胜利；失败/通关→重新开始
  handleEnter(input) {
    if (!input || !input.consumePress || !input.consumePress('enter')) return;
    if (this.state === 'levelClear') {
      if (this.levelIndex + 1 < TOTAL_LEVELS) {
        this.levelIndex++;
        this.startLevel();
      } else {
        this.state = 'victory';
      }
    } else if (this.state === 'victory' || this.state === 'gameOver') {
      this.levelIndex = 0;
      this.lives = PLAYER_MAX_LIVES;
      this.startLevel();
    }
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
    this.effects.addExplosion(this.player.centerX, this.player.centerY);
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

  destroyBase() {
    this.baseAlive = false;
    const base = this.map.findBase();
    this.effects.addExplosion(base.col * TILE + TILE / 2, base.row * TILE + TILE / 2, true);
    this.state = 'gameOver';
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
            this.effects.addExplosion(e.centerX, e.centerY);
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
      // 命中地形：砖块被摧毁；钢/边界仅挡住子弹；基地被击中即失败
      const hit = this.map.hitBullet(b.x, b.y);
      if (hit === 'base') {
        b.alive = false;
        this.destroyBase();
        return;
      }
      if (hit) {
        b.alive = false;
        this.effects.addSpark(b.x, b.y);
      }
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
          this.effects.addSpark(a.x, a.y);
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }

  update(dt, input) {
    if (this.state !== 'playing') {
      this.effects.update(dt);
      this.handleEnter(input);
      return;
    }
    this.updatePlayer(dt, input);
    this.updateSpawning(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.handleBulletTankCollisions();
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemies = this.enemies.filter(e => e.alive);
    this.effects.update(dt);
    this.checkVictory();
  }

  renderHud(ctx) {
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px monospace';
    ctx.textBaseline = 'middle';
    const y = HUD_HEIGHT / 2;
    ctx.fillText(`关卡 ${this.levelIndex + 1}`, 12, y);
    ctx.fillText(`敌人 ${this.enemiesRemaining + this.enemies.length}`, 110, y);
    ctx.fillText(`生命 ${this.lives}`, 230, y);
  }

  renderOverlay(ctx) {
    if (this.state === 'playing') return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);
    ctx.fillStyle = COLORS.text;
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = CANVAS_WIDTH / 2;
    const cy = HUD_HEIGHT + (CANVAS_HEIGHT - HUD_HEIGHT) / 2;
    if (this.state === 'levelClear') {
      ctx.fillText('关卡完成！', cx, cy - 20);
      ctx.font = '16px monospace';
      ctx.fillText('按 Enter 进入下一关', cx, cy + 16);
    } else if (this.state === 'victory') {
      ctx.fillText('胜利！', cx, cy - 20);
      ctx.font = '16px monospace';
      ctx.fillText('按 Enter 重新开始', cx, cy + 16);
    } else {
      ctx.fillText('游戏结束', cx, cy - 20);
      ctx.font = '16px monospace';
      ctx.fillText('按 Enter 重新开始', cx, cy + 16);
    }
    ctx.textAlign = 'left';
  }

  render(ctx) {
    // 背景与 HUD 区
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COLORS.brickDark;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    this.renderHud(ctx);
    // 地图与实体
    ctx.save();
    ctx.translate(0, HUD_HEIGHT);
    this.map.render(ctx);
    this.player.render(ctx);
    for (const e of this.enemies) e.render(ctx);
    for (const b of this.bullets) b.render(ctx);
    this.effects.render(ctx);
    ctx.restore();
    this.renderOverlay(ctx);
  }
}

// ===== js/input.js =====
// 键盘输入：把按键归一化为动作名，供 Game.update 查询。
// 仅在浏览器中调用（main.js），Node 测试不加载本模块。

const KEY_MAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'fire',
  Enter: 'enter'
};

const PREVENT_DEFAULT = new Set(Object.keys(KEY_MAP));

function createInput(target = window) {
  const down = new Set();    // 当前按住的动作
  const pressed = new Set(); // 本次按下后未被消费的动作（用于 Enter 等单次触发）

  function onKeyDown(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(action);
    down.add(action);
  }

  function onKeyUp(e) {
    const action = KEY_MAP[e.code];
    if (action) down.delete(action);
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  return {
    isDown(action) {
      return down.has(action);
    },
    // 单次触发：读取即消费
    consumePress(action) {
      if (pressed.has(action)) {
        pressed.delete(action);
        return true;
      }
      return false;
    },
    detach() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
    }
  };
}


// ===== 对外 API（供页面脚本 / 冒烟测试使用） =====
if (typeof window !== 'undefined') {
  window.TankBattle = { Game, GameMap, TOTAL_LEVELS, PlayerTank, EnemyTank, Bullet, EffectManager, createInput };
}

// ===== js/main.js =====


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

})();
