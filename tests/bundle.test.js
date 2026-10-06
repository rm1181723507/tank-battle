import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assembleBundle } from '../scripts/build.js';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'tank-battle.js');

test('dist 产物存在且与源码同步', () => {
  const committed = readFileSync(DIST, 'utf8');
  assert.equal(committed, assembleBundle(),
    'dist/tank-battle.js 已过期，请运行 npm run build 重新生成');
});

test('bundle 中不含 ESM 语法', () => {
  const bundle = readFileSync(DIST, 'utf8');
  assert.doesNotMatch(bundle, /^import[\s\S]*from\s+['"]\.\//m, '不应残留 import 语句');
  assert.doesNotMatch(bundle, /^export\s+/m, '不应残留 export 前缀');
});
