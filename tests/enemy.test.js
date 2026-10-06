import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { EnemyTank } from '../js/tank.js';
import { Bullet } from '../js/bullet.js';
import {
  TILE, TANK_OFFSET, DIR_DOWN,
  ENEMIES_PER_LEVEL, MAX_ENEMIES_ON_SCREEN,
  PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW, RESPAWN_INVINCIBLE
} from '../js/constants.js';

const NO_KEYS = { isDown: () => false };

function spawnPos(col, row) {
  return {
    x: col * TILE + TANK_OFFSET,
    y: row * TILE + TANK_OFFSET
  };
}

test('敌人按出生间隔在轮换出生点出现', () => {
  const game = new Game(() => 0);
  assert.equal(game.enemiesRemaining, ENEMIES_PER_LEVEL);
  game.spawnTimer = 0;
  game.update(0.016, NO_KEYS);
  assert.equal(game.enemies.length, 1, '应出生一个敌人');
  assert.equal(game.enemiesRemaining, ENEMIES_PER_LEVEL - 1);
  const pos = spawnPos(0, 0); // 第一个出生点为左上角
  assert.equal(game.enemies[0].x, pos.x);
  assert.ok(game.enemies[0].y >= pos.y, '应从出生点出现（当帧可能已向下移动少许）');
});

test('场上敌人达到上限时不再出生', () => {
  const game = new Game(() => 0);
  for (let i = 0; i < MAX_ENEMIES_ON_SCREEN; i++) {
    game.enemies.push(new EnemyTank(100 + i * 40, 100, () => 0));
  }
  game.spawnTimer = 0;
  game.update(0.016, NO_KEYS);
  assert.equal(game.enemies.length, MAX_ENEMIES_ON_SCREEN);
  assert.equal(game.enemiesRemaining, ENEMIES_PER_LEVEL, '未消耗待出生名额');
});

test('出生点被占据时延后出生', () => {
  const game = new Game(() => 0);
  const pos = spawnPos(0, 0);
  game.enemies.push(new EnemyTank(pos.x, pos.y, () => 0));
  game.spawnTimer = 0;
  game.update(0.016, NO_KEYS);
  assert.equal(game.enemies.length, 1, '出生点被占，不应出生');
  assert.equal(game.enemiesRemaining, ENEMIES_PER_LEVEL);
});

test('与玩家同列且弹道畅通时，敌人朝玩家开火', () => {
  const game = new Game(() => 0);
  // 玩家出生在 (4,12)。把敌人放在 (4,9)，中间 (4,10)、(4,11) 均为空地
  const pos = spawnPos(4, 9);
  const enemy = new EnemyTank(pos.x, pos.y, () => 0);
  enemy.fireTimer = 0; // 立即尝试开火
  game.enemies.push(enemy);
  game.update(0.1, NO_KEYS);
  assert.equal(enemy.dir, DIR_DOWN, '应转向玩家方向');
  assert.equal(game.bullets.filter(b => b.owner === 'enemy').length, 1, '应发射子弹');
});

test('弹道被砖墙阻挡时，敌人不会朝玩家瞄准开火', () => {
  const game = new Game(() => 0.9); // rng 恒 0.9：不瞄准玩家、小概率随机开火判定失败
  // 玩家出生在 (4,12)，(4,11) 与 (4,9) 之间是空地；
  // 把敌人放在 (4,7) 上方路径 (4,8) 是砖? 检查关卡 0：row8 col4='.'。
  // 改为放在 (4,4)——其到玩家路径经过 (4,10)、(4,11) 均空，需另寻阻隔：
  // 直接在敌人与玩家之间的 (4,10) 放一颗“砖墙已存在”的验证前置。
  const game2 = new Game(() => 0.9);
  assert.equal(game2.map.tileAt(4, 10), 0, '前置条件：(4,10) 应为空地');
  game2.map.grid[10][4] = 1; // 人工放置砖墙阻隔弹道
  const pos = spawnPos(4, 9);
  const enemy = new EnemyTank(pos.x, pos.y, () => 0.9);
  enemy.fireTimer = 0;
  game2.enemies.push(enemy);
  game2.update(0.1, NO_KEYS);
  assert.equal(game2.bullets.filter(b => b.owner === 'enemy').length, 0,
    '弹道被阻挡时不应朝玩家开火（rng 恒 0.9 排除随机开火）');
});

test('玩家子弹摧毁敌人', () => {
  const game = new Game(() => 0);
  const pos = spawnPos(2, 2);
  game.enemies.push(new EnemyTank(pos.x, pos.y, () => 0));
  // 在敌人中心放一颗玩家子弹
  game.bullets.push(new Bullet(pos.x + 14, pos.y + 14, 0, 'player'));
  game.update(0.016, NO_KEYS);
  assert.equal(game.enemies.length, 0, '敌人应被摧毁并移除');
  assert.equal(game.bullets.length, 0, '子弹应消失');
});

test('敌人子弹击中玩家：生命减一并重生（带无敌）', () => {
  const game = new Game(() => 0);
  const px = game.player.x + 14;
  const py = game.player.y + 14;
  game.bullets.push(new Bullet(px, py, DIR_DOWN, 'enemy'));
  game.update(0.016, NO_KEYS);
  assert.equal(game.lives, 2);
  assert.ok(game.player.alive, '玩家应已重生');
  assert.ok(game.player.invincible > 0, '重生后应有短暂无敌');
});

test('无敌期间敌人子弹无法伤害玩家', () => {
  const game = new Game(() => 0);
  game.player.invincible = RESPAWN_INVINCIBLE;
  const px = game.player.x + 14;
  const py = game.player.y + 14;
  game.bullets.push(new Bullet(px, py, DIR_DOWN, 'enemy'));
  game.update(0.016, NO_KEYS);
  assert.equal(game.lives, 3);
  assert.ok(game.player.alive);
});

test('生命耗尽进入 gameOver', () => {
  const game = new Game(() => 0);
  game.lives = 1;
  game.bullets.push(new Bullet(game.player.x + 14, game.player.y + 14, DIR_DOWN, 'enemy'));
  game.update(0.016, NO_KEYS);
  assert.equal(game.state, 'gameOver');
});

test('消灭全部敌人后进入 levelClear', () => {
  const game = new Game(() => 0);
  game.enemiesRemaining = 0;
  game.enemies.push(new EnemyTank(spawnPos(2, 2).x, spawnPos(2, 2).y, () => 0));
  game.enemies[0].alive = false;
  game.update(0.016, NO_KEYS); // updateEnemies 移除尸体并触发胜利判定
  assert.equal(game.state, 'levelClear');
});
