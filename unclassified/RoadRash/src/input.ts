export type ActionName =
  | 'throttle'
  | 'brake'
  | 'left'
  | 'right'
  | 'punchL'
  | 'punchR'
  | 'club'
  | 'pause'
  | 'mute'
  | 'restart'
  | 'start';

const KEYMAP: Record<string, ActionName> = {
  KeyW: 'throttle',
  ArrowUp: 'throttle',
  KeyS: 'brake',
  ArrowDown: 'brake',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyJ: 'punchL',
  KeyK: 'punchR',
  KeyL: 'club',
  Escape: 'pause',
  KeyM: 'mute',
  KeyR: 'restart',
  Enter: 'start',
};

export class Input {
  private down = new Set<ActionName>();
  private pressed = new Set<ActionName>();
  private onKeyDown = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (!e.repeat) this.pressed.add(a);
    this.down.add(a);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (a) this.down.delete(a);
  };

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  isDown(a: ActionName) {
    return this.down.has(a);
  }

  /** Edge-triggered actions pressed since last consume; holding a key yields one press. */
  consumePressed(): Set<ActionName> {
    const s = this.pressed;
    this.pressed = new Set();
    return s;
  }

  clear() {
    this.down.clear();
    this.pressed.clear();
  }
}
