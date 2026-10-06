import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameMap, TOTAL_LEVELS } from '../js/map.js';
import { TILE, GRID, TILE_EMPTY, TILE_BRICK, TILE_STEEL, TILE_BASE } from '../js/constants.js';

test('关卡 0 加载：13×13 网格，基地存在', () => {
  const map = new GameMap(0);
  assert.equal(map.grid.length, GRID);
  for (const row of map.grid) assert.equal(row.length, GRID);
  const base = map.findBase();
  assert.ok(base, '应能找到基地');
  assert.equal(map.tileAt(base.col, base.row), TILE_BASE);
  // 基地在底部中央
  assert.equal(base.col, 6);
  assert.equal(base.row, 12);
});

test('关卡 0 包含砖墙和钢墙', () => {
  const map = new GameMap(0);
  const types = new Set(map.grid.flat());
  assert.ok(types.has(TILE_BRICK), '应有砖墙');
  assert.ok(types.has(TILE_STEEL), '应有钢墙');
});

test('关卡总数大于 1，越界关卡索引取模循环', () => {
  assert.ok(TOTAL_LEVELS > 1);
  const map = new GameMap(TOTAL_LEVELS); // 等价于关卡 0
  assert.equal(map.findBase().row, 12);
});

test('rectCollides：砖墙/钢墙/基地为实心，空地可通行', () => {
  const map = new GameMap(0);
  const base = map.findBase();
  // 基地格
  assert.ok(map.rectCollides(base.col * TILE, base.row * TILE, TILE, TILE));
  // 左上角为空地（敌人出生点）
  assert.ok(!map.rectCollides(0, 0, TILE, TILE));
  // 找一个砖格验证
  outer:
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (map.tileAt(c, r) === TILE_BRICK) {
        assert.ok(map.rectCollides(c * TILE, r * TILE, TILE, TILE));
        break outer;
      }
    }
  }
});

test('hitBullet：击中砖块将其摧毁并返回 brick', () => {
  const map = new GameMap(0);
  outer:
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (map.tileAt(c, r) === TILE_BRICK) {
        const result = map.hitBullet(c * TILE + TILE / 2, r * TILE + TILE / 2);
        assert.equal(result, 'brick');
        assert.equal(map.tileAt(c, r), TILE_EMPTY, '砖块应被摧毁');
        break outer;
      }
    }
  }
});

test('hitBullet：击中钢墙返回 steel 且不摧毁', () => {
  const map = new GameMap(0);
  outer:
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (map.tileAt(c, r) === TILE_STEEL) {
        const result = map.hitBullet(c * TILE + TILE / 2, r * TILE + TILE / 2);
        assert.equal(result, 'steel');
        assert.equal(map.tileAt(c, r), TILE_STEEL, '钢墙不可摧毁');
        break outer;
      }
    }
  }
});

test('hitBullet：击中基地返回 base', () => {
  const map = new GameMap(0);
  const base = map.findBase();
  const result = map.hitBullet(base.col * TILE + TILE / 2, base.row * TILE + TILE / 2);
  assert.equal(result, 'base');
});

test('hitBullet：空地返回 null，越界返回 edge 且视为实心', () => {
  const map = new GameMap(0);
  assert.equal(map.hitBullet(0, 0), null); // 左上角空地
  assert.equal(map.tileAt(-1, 0), TILE_STEEL, '越界视为实心');
  assert.equal(map.hitBullet(-TILE, 0), 'edge');
});
