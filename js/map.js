import {
  TILE, GRID, TILE_EMPTY, TILE_BRICK, TILE_STEEL, TILE_BASE, COLORS
} from './constants.js';

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

export const TOTAL_LEVELS = LEVELS.length;

const CHAR_TO_TILE = {
  '.': TILE_EMPTY,
  'B': TILE_BRICK,
  'S': TILE_STEEL,
  'E': TILE_BASE
};

export class GameMap {
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
