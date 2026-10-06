// 零依赖打包脚本：把 js/ 下的 ES Module 源码按依赖顺序拼接为
// 经典脚本 dist/tank-battle.js，使 index.html 可以双击直接打开
// （Chrome 在 file:// 协议下会拦截 ES Module 的跨文件加载）。
//
// 用法：npm run build
// 测试会校验 dist 产物与源码同步，请勿手改 dist/ 下的文件。

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// 按依赖顺序排列：被依赖者在前
export const SOURCE_FILES = [
  'js/constants.js',
  'js/bullet.js',
  'js/effects.js',
  'js/map.js',
  'js/tank.js',
  'js/game.js',
  'js/input.js',
  'js/main.js'
];

// 拼接并剥离 ESM 语法（import 语句、export 前缀），
// 全部包进 IIFE：避免顶层 const/class 泄漏到全局作用域，
// 与页面上的其他经典脚本冲突。main.js 之前把关键类型挂到
// window.TankBattle 供外部（如冒烟测试）使用。
export function assembleBundle() {
  const parts = SOURCE_FILES.map(file => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    const stripped = src
      .replace(/^import[\s\S]*?from\s+'\.\/[^']+';\s*$/gm, '')
      .replace(/^export\s+/gm, '');
    return `// ===== ${file} =====\n${stripped}`;
  });
  const iifeOpen = '(function () {\n\'use strict\';\n';
  const apiExport = `
// ===== 对外 API（供页面脚本 / 冒烟测试使用） =====
if (typeof window !== 'undefined') {
  window.TankBattle = { Game, GameMap, TOTAL_LEVELS, PlayerTank, EnemyTank, Bullet, EffectManager, createInput };
}
`;
  // apiExport 插在 main.js（自启动入口）之前，确保即使入口报错 API 也已挂载
  const ordered = [];
  for (const part of parts) {
    if (part.startsWith('// ===== js/main.js')) {
      ordered.push(apiExport);
    }
    ordered.push(part);
  }
  const banner = `// 本文件由 scripts/build.js 自动生成，请勿手改。\n// 源码：js/*.js（ES Module），修改后运行 npm run build 重新生成。\n\n`;
  return banner + iifeOpen + ordered.join('\n') + '\n})();\n';
}

export function build() {
  mkdirSync(join(ROOT, 'dist'), { recursive: true });
  const out = join(ROOT, 'dist', 'tank-battle.js');
  writeFileSync(out, assembleBundle());
  return out;
}

// 直接运行 node scripts/build.js 时执行构建（被测试 import 时不执行）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`written: ${build()}`);
}
