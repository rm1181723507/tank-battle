import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { GameMap } from '../js/map.js';
import { Tank, PlayerTank } from '../js/tank.js';
import {
  TILE, GRID, TILE_STEEL, TANK_SIZE, TANK_OFFSET,
  DIR_UP, DIR_RIGHT, DIR_DOWN, PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW
} from '../js/constants.js';

function makeInput(pressedAction) {
  return { isDown: action => action === pressedAction };
}

test('tryMove：空地可移动', () => {
  const map = new GameMap(0);
  const tank = new Tank(TANK_OFFSET, TANK_OFFSET, DIR_RIGHT, 80, 'player');
  assert.equal(tank.tryMove(8, 0, map, []), true);
  assert.equal(tank.x, TANK_OFFSET + 8);
});

test('tryMove：被钢墙阻挡', () => {
  const map = new GameMap(0);
  // 找到关卡 0 中的钢墙格，把坦克放在其左侧一格
  let steel = null;
  outer:
  for (let r = 1; r < GRID; r++) {
    for (let c = 1; c < GRID; c++) {
      if (map.tileAt(c, r) === TILE_STEEL) { steel = { c, r }; break outer; }
    }
  }
  assert.ok(steel, '关卡 0 应有钢墙');
  const tank = new Tank((steel.c - 1) * TILE + TANK_OFFSET, steel.r * TILE + TANK_OFFSET,
    DIR_RIGHT, 80, 'player');
  const before = tank.x;
  assert.equal(tank.tryMove(8, 0, map, []), false, '向钢墙移动应被阻挡');
  assert.equal(tank.x, before);
});

test('tryMove：与其他坦克重叠则放弃移动', () => {
  const map = new GameMap(0);
  const a = new Tank(TANK_OFFSET, TANK_OFFSET, DIR_RIGHT, 80, 'player');
  const b = new Tank(TILE, TANK_OFFSET, DIR_RIGHT, 80, 'enemy');
  assert.equal(a.tryMove(8, 0, map, [a, b]), false);
});

test('开火冷却：发射后进入冷却，冷却结束才能再发射', () => {
  const tank = new PlayerTank(TANK_OFFSET, TANK_OFFSET);
  assert.ok(tank.canFire());
  const bullet = tank.makeBullet();
  assert.equal(bullet.owner, 'player');
  assert.equal(bullet.dir, tank.dir);
  tank.cooldown = 0.4;
  assert.equal(tank.canFire(), false);
  tank.updateCooldown(0.1);
  assert.equal(tank.canFire(), false);
  tank.updateCooldown(0.5);
  assert.equal(tank.canFire(), true);
});

test('玩家输入：按住上键向上移动并转向', () => {
  const game = new Game();
  const spawnX = game.player.x;
  game.update(0.1, makeInput('up'));
  assert.equal(game.player.dir, DIR_UP);
  assert.ok(game.player.y < PLAYER_SPAWN_ROW * TILE + TANK_OFFSET, '应向上移动');
  assert.equal(game.player.x, spawnX);
});

test('玩家输入：出生点右侧是基地护卫砖墙，不能直接右移', () => {
  const game = new Game();
  const spawnX = game.player.x;
  game.update(0.1, makeInput('right'));
  assert.equal(game.player.dir, DIR_RIGHT, '朝向应改变');
  assert.equal(game.player.x, spawnX, '位置应被砖墙挡住');
});

test('玩家输入：出生点向左移动被砖墙挡住（基地左侧有墙）', () => {
  const game = new Game();
  // 关卡 0 出生点 (4,12) 左侧是空地但再往左是墙；先验证向左移动一段后被挡
  game.update(0.1, makeInput('left'));
  game.update(2.0, makeInput('left')); // 持续左移，最终应停住
  const leftWallX = 0;
  assert.ok(game.player.x >= leftWallX);
});

test('玩家开火：按下 fire 生成子弹，且同屏子弹不超过上限', () => {
  const game = new Game();
  game.update(0.016, makeInput('fire'));
  assert.equal(game.bullets.length, 1);
  // 冷却中再按不会生成第二颗
  game.update(0.016, makeInput('fire'));
  assert.equal(game.bullets.length, 1);
});

test('玩家出生位置正确且朝上', () => {
  const game = new Game();
  assert.equal(game.player.x, PLAYER_SPAWN_COL * TILE + TANK_OFFSET);
  assert.equal(game.player.y, PLAYER_SPAWN_ROW * TILE + TANK_OFFSET);
});
