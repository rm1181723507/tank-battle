import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { GameMap } from '../js/map.js';

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
  assert.doesNotThrow(() => game.update(0.016, null));
});
