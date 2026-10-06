// 键盘输入：把按键归一化为动作名，供 Game.update 查询。
// 仅在浏览器中调用（main.js），Node 测试不加载本模块。

const KEY_MAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'fire',
  Enter: 'enter'
};

const PREVENT_DEFAULT = new Set(Object.keys(KEY_MAP));

export function createInput(target = window) {
  const down = new Set();    // 当前按住的动作
  const pressed = new Set(); // 本次按下后未被消费的动作（用于 Enter 等单次触发）

  function onKeyDown(e) {
    const action = KEY_MAP[e.code];
    if (!action) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(action);
    down.add(action);
  }

  function onKeyUp(e) {
    const action = KEY_MAP[e.code];
    if (action) down.delete(action);
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  return {
    isDown(action) {
      return down.has(action);
    },
    // 单次触发：读取即消费
    consumePress(action) {
      if (pressed.has(action)) {
        pressed.delete(action);
        return true;
      }
      return false;
    },
    detach() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
    }
  };
}
