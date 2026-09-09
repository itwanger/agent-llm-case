/* ============================================================
 * input.ts — keyboard state + edge-triggered actions
 * ============================================================ */

export type ActionName = 'punchLeft' | 'punchRight' | 'club' | 'restart' | 'pause';

const KEY_MAP: Record<string, ActionName> = {
  KeyJ: 'punchLeft',
  KeyK: 'punchRight',
  Space: 'club',
  KeyR: 'restart',
  KeyP: 'pause',
  Escape: 'pause',
};

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>(); // consumed each frame
  private anyKeyHandlers: Array<() => void> = [];

  constructor(target: Window = window) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // keep arrow keys / space from scrolling the page
    if (
      e.code.startsWith('Arrow') ||
      e.code === 'Space' ||
      e.code === 'Tab'
    ) {
      e.preventDefault();
    }
    if (!this.down.has(e.code)) {
      this.pressed.add(e.code);
      for (const h of this.anyKeyHandlers) h();
    }
    this.down.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };

  private onBlur = (): void => {
    this.down.clear();
  };

  onAnyKey(h: () => void): void {
    this.anyKeyHandlers.push(h);
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** True on the frame the key was first pressed. */
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /* ---------- semantic helpers ---------- */

  get throttle(): boolean {
    return this.down.has('KeyW') || this.down.has('ArrowUp');
  }
  get brake(): boolean {
    return this.down.has('KeyS') || this.down.has('ArrowDown');
  }
  get left(): boolean {
    return this.down.has('KeyA') || this.down.has('ArrowLeft');
  }
  get right(): boolean {
    return this.down.has('KeyD') || this.down.has('ArrowRight');
  }

  /** -1 .. 1 steering input (positive = right). */
  get steer(): number {
    return (this.right ? 1 : 0) - (this.left ? 1 : 0);
  }

  action(name: ActionName): boolean {
    return this.wasPressed(
      Object.keys(KEY_MAP).find((k) => KEY_MAP[k] === name) ?? '',
    );
  }

  /** Call at the very end of each frame. */
  endFrame(): void {
    this.pressed.clear();
  }
}
