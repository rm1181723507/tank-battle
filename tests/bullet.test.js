import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { Bullet } from '../js/bullet.js';
import { TILE, DIR_UP, DIR_LEFT } from '../js/constants.js';

const NO_KEYS = { isDown: () => false };

test('子弹沿朝向移动', () => {
  const b = new Bullet(100, 100, DIR_UP, 'player');
  b.update(0.1);
  assert.equal(b.y, 100 - b.speed * 0.1);
  assert.equal(b.x, 100);
});

test('子弹击中砖墙：砖块被摧毁、子弹消失', () => {
  const game = new Game();
  // 关卡 0 中 (1,4) 是砖，(1,5) 是空地：从空地向上发射
  assert.equal(game.map.tileAt(1, 4), 1, '前置条件：(1,4) 应为砖墙');
  game.bullets.push(new Bullet(1 * TILE + TILE / 2, 5 * TILE + TILE / 2, DIR_UP, 'player'));
  game.update(0.1, NO_KEYS);
  assert.equal(game.map.tileAt(1, 4), 0, '砖块应被摧毁');
  assert.equal(game.bullets.length, 0, '子弹应消失');
});

test('子弹击中钢墙：钢墙完好、子弹消失', () => {
  const game = new Game();
  // 关卡 0 中 (6,3) 是钢墙，(6,4) 是空地：从空地向上发射
  assert.equal(game.map.tileAt(6, 3), 2, '前置条件：(6,3) 应为钢墙');
  game.bullets.push(new Bullet(6 * TILE + TILE / 2, 4 * TILE + TILE / 2, DIR_UP, 'player'));
  game.update(0.1, NO_KEYS);
  assert.equal(game.map.tileAt(6, 3), 2, '钢墙应完好');
  assert.equal(game.bullets.length, 0, '子弹应消失');
});

test('子弹飞出地图边界后消失', () => {
  const game = new Game();
  game.bullets.push(new Bullet(TILE / 2, TILE / 2, DIR_UP, 'player'));
  game.update(0.1, NO_KEYS);
  assert.equal(game.bullets.length, 0);
});

test('敌我子弹相撞同归于尽', () => {
  const game = new Game();
  game.bullets.push(new Bullet(16, 20, DIR_UP, 'player'));
  game.bullets.push(new Bullet(16, 24, DIR_UP, 'enemy'));
  game.update(0.016, NO_KEYS);
  assert.equal(game.bullets.length, 0);
});

test('己方子弹相遇不会互相抵消', () => {
  const game = new Game();
  game.bullets.push(new Bullet(16, 20, DIR_UP, 'player'));
  game.bullets.push(new Bullet(16, 24, DIR_UP, 'player'));
  game.update(0.016, NO_KEYS);
  assert.equal(game.bullets.length, 2);
});
