/**
 * 输入层：WASD + 鼠标（指针锁定）+ 左键 + R/1/2/3/空格/Shift。
 * 指针锁定失败时仍然可以玩（鼠标移到屏幕边缘会停住，但按键全部有效），
 * 这样无头浏览器里也能完整验证操作。
 */

export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.pressed = new Set(); // 本帧刚按下
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.mousePressed = false;
    this.wheel = 0;
    this.locked = false;
    this.lockSupported = typeof domElement.requestPointerLock === 'function';
    this.lockFailed = false;
    this.forceLook = false; // 测试用：不锁指针也能转视角
    this.enabled = true;
    this.onLockChange = null;

    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.repeat) {
        this.keys.add(e.code);
        return;
      }
      this.keys.add(e.code);
      this.pressed.add(e.code);
      // 防止空格滚页 / Tab 切焦点
      if (['Space', 'Tab', 'KeyR', 'Digit1', 'Digit2', 'Digit3'].includes(e.code)) e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) {
        this.keys.clear();
        this.mouseDown = false;
      }
      if (this.onLockChange) this.onLockChange(this.locked);
    });

    document.addEventListener('pointerlockerror', () => {
      this.lockFailed = true;
      this.locked = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (!this.locked && !this.forceLook) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    });

    this.dom.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0) {
        this.mouseDown = true;
        this.mousePressed = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();
    });

    this.dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });

    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  requestLock() {
    if (!this.lockSupported) {
      this.lockFailed = true;
      return;
    }
    try {
      const p = this.dom.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => { this.lockFailed = true; });
    } catch (e) {
      this.lockFailed = true;
    }
  }

  exitLock() {
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  isDown(code) {
    return this.keys.has(code);
  }

  /** 消费「刚按下」状态 */
  consumePress(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  consumeMouse() {
    if (this.mousePressed) {
      this.mousePressed = false;
      return true;
    }
    return false;
  }

  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  consumeMouseDelta() {
    const d = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }

  endFrame() {
    this.pressed.clear();
  }

  /** 测试用：直接注入按键 */
  setKey(code, down) {
    if (down) {
      this.keys.add(code);
      this.pressed.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  /** 测试用：注入鼠标移动 */
  addLook(dx, dy) {
    this.mouseDX += dx;
    this.mouseDY += dy;
  }
}
