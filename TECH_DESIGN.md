# 坦克大战 — 技术方案文档

> 配套产品文档见 [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md)。

## 1. 技术选型

| 项 | 选择 | 理由 |
|------|------|------|
| 运行环境 | 浏览器（HTML5 + Canvas） | 无需安装、调试方便、易分享 |
| 语言 | 原生 JavaScript（ES Modules） | 零构建工具，浏览器直接支持 |
| 依赖 | 无（零 npm 依赖） | 项目规模小，避免工具链负担 |
| 测试 | Node 内置测试运行器（`node --test`） | 无需安装测试框架，Node ≥ 18 即可 |

## 2. 架构原则

**纯逻辑与渲染分离**：`js/` 目录下除 `main.js` 外均为纯数据逻辑模块，不触碰 DOM / Canvas，因此可在 Node 环境下直接运行单元测试。只有 `main.js` 负责：

1. 获取 canvas 上下文；
2. 通过 `requestAnimationFrame` 驱动主循环，每帧调用 `game.update(dt)` 和 `game.render(ctx)`。

**碰撞检测**：全部基于网格 + AABB 包围盒，不自研物理引擎。

**美术方案**：所有图形用 Canvas 绘制矩形 / 简单形状组合（坦克 = 车身矩形 + 炮管），不使用任何外部图片资源。

## 3. 文件结构

```
D:\tank-battle\
├── index.html          # 入口页面：<canvas> 元素，加载 dist/tank-battle.js
├── style.css           # 页面样式：画布居中、深色背景、字体
├── PRODUCT_DESIGN.md   # 产品设计文档
├── TECH_DESIGN.md      # 本文档
├── AGENTS.md           # 协作规范（commit 与测试要求）
├── js/                 # 源码（ES Module，供 Node 测试与打包）
│   ├── main.js         # 引导代码：创建 Game 实例、requestAnimationFrame 主循环
│   ├── game.js         # Game 类：游戏状态机（进行中/胜利/失败）、碰撞调度、关卡加载
│   ├── map.js          # 地图：13×13 网格数据、瓦片类型、砖块损毁、内置关卡布局
│   ├── tank.js         # Tank 基类 + PlayerTank + EnemyTank（敌人 AI 在此）
│   ├── bullet.js       # Bullet 类：子弹移动与命中判定
│   ├── effects.js      # 爆炸 / 命中特效（纯色块动画）
│   ├── input.js        # 键盘输入状态收集
│   └── constants.js    # 常量：尺寸、速度、颜色、瓦片类型枚举
├── scripts/
│   └── build.js        # 零依赖打包器：将 js/*.js 拼接为经典脚本 dist/tank-battle.js
├── dist/
│   └── tank-battle.js  # 生成产物（勿手改）；Chrome 在 file:// 下无法加载 ES Module
└── tests/
    ├── map.test.js     # 地图加载、砖块摧毁、越界处理
    ├── bullet.test.js  # 子弹移动、命中砖/钢/坦克/基地
    ├── tank.test.js    # 移动受阻、开火冷却、敌人被摧毁
    ├── enemy.test.js   # 敌人出生调度、AI 开火、玩家受伤/无敌
    ├── bundle.test.js  # dist 产物与源码同步校验
    └── game.test.js    # 胜利 / 失败 / 重生状态流转
```

## 4. 关键设计

### 4.1 地图表示

关卡用字符串数组表示，便于肉眼编辑与测试断言：

- `B` = 砖墙（可摧毁）
- `S` = 钢墙（不可摧毁）
- `E` = 基地（老鹰）
- `.` = 空地

砖块以瓦片为粒度损毁：子弹命中即摧毁所命中的砖块单元。

### 4.2 敌人 AI（MVP 简单版）

定时器驱动，不做寻路：

- 每隔一段随机时间改变方向（偏好朝玩家方向）；
- 行进中撞墙立即重选方向；
- 与玩家处于同一行 / 列且无钢墙阻隔时开火。

### 4.3 游戏状态机

```
进行中 ──消灭全部敌人──> 关卡胜利 ──Enter──> 下一关
   │
   ├──玩家生命归零──> 失败 ──Enter──> 重新开始
   └──基地被击中────> 失败 ──Enter──> 重新开始
```

胜利 / 失败提示直接绘制在 Canvas 上。

## 5. 测试策略

- **单元测试**：`tests/` 下各文件覆盖地图、子弹、坦克、胜负流转等纯逻辑；每步功能改动必须同步编写 / 更新测试。
- **交付标准**：`node --test tests/` 全部通过后才 commit（见 AGENTS.md）。
- **人工验证**：浏览器打开 `index.html`，验证移动、开火、砖块摧毁、敌人行为、胜负流转。

## 6. 实施步骤（每步一个 commit）

1. 骨架：`index.html` + `style.css` + `constants.js` + `main.js`（空游戏循环）
2. 地图渲染与数据层（`map.js` + 测试）
3. 玩家坦克：移动、开火（`tank.js`、`input.js` + 测试）
4. 子弹与砖块摧毁（`bullet.js` + 测试）
5. 敌方坦克 AI、玩家受伤 / 重生
6. 胜负流转、基地保护、HUD、特效（`effects.js`、`game.js` + 测试）
7. README 收尾
