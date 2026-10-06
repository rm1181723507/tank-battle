import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { GameMap, TOTAL_LEVELS } from '../js/map.js';
import { Bullet } from '../js/bullet.js';
import { TILE, PLAYER_MAX_LIVES } from '../js/constants.js';

const NO_KEYS = { isDown: () => false, consumePress: () => false };
const ENTER = { isDown: () => false, consumePress: action => action === 'enter' };

test('初始状态为 playing', () => {
  const game = new Game();
  assert.equal(game.state, 'playing');
});

test('构造时加载关卡 0 地图', () => {
  const game = new Game();
  assert.ok(game.map instanceof GameMap);
  assert.ok(game.map.findBase(), '地图应包含基地');
});

test('非 playing 状态下 update 不推进游戏也不报错', () => {
  const game = new Game();
  game.state = 'gameOver';
  assert.doesNotThrow(() => game.update(0.016, NO_KEYS));
});

test('基地（老鹰）被击中立即 gameOver', () => {
  const game = new Game();
  const base = game.map.findBase();
  const bx = base.col * TILE + TILE / 2;
  const by = base.row * TILE + TILE / 2;
  game.bullets.push(new Bullet(bx, by, 2 /* 向下 */, 'enemy'));
  game.update(0.016, NO_KEYS);
  assert.equal(game.state, 'gameOver', '基地被击中应直接失败');
  assert.equal(game.baseAlive, false);
  assert.ok(game.effects.count > 0, '基地爆炸应有特效');
});

test('关卡完成后按 Enter 进入下一关', () => {
  const game = new Game();
  game.state = 'levelClear';
  game.update(0.016, ENTER);
  assert.equal(game.levelIndex, 1);
  assert.equal(game.state, 'playing');
});

test('最后一关完成后按 Enter 进入 victory', () => {
  const game = new Game();
  game.levelIndex = TOTAL_LEVELS - 1;
  game.state = 'levelClear';
  game.update(0.016, ENTER);
  assert.equal(game.state, 'victory');
});

test('victory 后按 Enter 完全重新开始', () => {
  const game = new Game();
  game.levelIndex = TOTAL_LEVELS - 1;
  game.state = 'victory';
  game.lives = 1;
  game.update(0.016, ENTER);
  assert.equal(game.levelIndex, 0);
  assert.equal(game.lives, PLAYER_MAX_LIVES);
  assert.equal(game.state, 'playing');
});

test('gameOver 后按 Enter 重新开始', () => {
  const game = new Game();
  game.state = 'gameOver';
  game.levelIndex = 1;
  game.update(0.016, ENTER);
  assert.equal(game.levelIndex, 0);
  assert.equal(game.lives, PLAYER_MAX_LIVES);
  assert.equal(game.state, 'playing');
});

test('未按 Enter 时不流转状态', () => {
  const game = new Game();
  game.state = 'levelClear';
  game.update(0.016, NO_KEYS);
  assert.equal(game.state, 'levelClear');
});

test('摧毁敌人产生爆炸特效', () => {
  const game = new Game(() => 0);
  game.enemiesRemaining = 0;
  game.enemies = [];
  game.effects.addExplosion(100, 100);
  assert.ok(game.effects.count > 0);
  game.effects.update(1);
  assert.equal(game.effects.count, 0, '特效结束后应被清理');
});
