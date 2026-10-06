// 全局常量：尺寸、速度、方向、颜色

export const TILE = 32;               // 瓦片边长（像素）
export const GRID = 13;               // 地图 13×13 格
export const HUD_HEIGHT = 64;         // 顶部 HUD 高度
export const CANVAS_WIDTH = TILE * GRID;          // 416
export const CANVAS_HEIGHT = TILE * GRID + HUD_HEIGHT; // 480

// 方向枚举
export const DIR_UP = 0;
export const DIR_RIGHT = 1;
export const DIR_DOWN = 2;
export const DIR_LEFT = 3;
export const DIR_DX = [0, 1, 0, -1];
export const DIR_DY = [-1, 0, 1, 0];

// 瓦片类型
export const TILE_EMPTY = 0;
export const TILE_BRICK = 1;
export const TILE_STEEL = 2;
export const TILE_BASE = 3;

// 坦克与子弹
export const TANK_SIZE = 28;
export const PLAYER_SPEED = 80;
export const ENEMY_SPEED = 56;
export const PLAYER_FIRE_COOLDOWN = 0.4;
export const ENEMY_FIRE_COOLDOWN = 1.2;
export const BULLET_SIZE = 6;
export const BULLET_SPEED = 240;

// 游戏规则
export const PLAYER_MAX_LIVES = 3;
export const RESPAWN_INVINCIBLE = 2;      // 重生无敌时间（秒）
export const MAX_ENEMIES_ON_SCREEN = 3;
export const ENEMIES_PER_LEVEL = 6;
export const ENEMY_SPAWN_INTERVAL = 2.5;  // 敌人出生间隔（秒）

// 颜色
export const COLORS = {
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
