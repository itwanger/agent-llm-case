export interface HudData {
  speedKmh: number;
  hp01: number;
  rank: number;
  total: number;
  progress01: number;
  time: number;
  punchCd01: number; // 1 = ready
  clubCd01: number;
}

export interface FloaterData {
  x: number;
  y: number;
  name: string;
  hp01: number;
  warn: boolean;
  visible: boolean;
}

export interface ResultRow {
  pos: number;
  name: string;
  time: string;
  me: boolean;
}

function fmtTime(t: number): string {
  if (t < 0) return '--:--.-';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const d = Math.floor((t * 10) % 10);
  return `${m}:${s.toString().padStart(2, '0')}.${d}`;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export class HUD {
  readonly root: HTMLElement;
  private elRank: HTMLElement;
  private elTime: HTMLElement;
  private elProgFill: HTMLElement;
  private elSpeed: HTMLElement;
  private elHp: HTMLElement;
  private elPunch: HTMLElement;
  private elClub: HTMLElement;
  private elMute: HTMLButtonElement;
  private floaters: HTMLElement[] = [];
  private screens: Record<string, HTMLElement> = {};
  private elCount: HTMLElement;
  private elResults: HTMLElement;
  private elFinishTime: HTMLElement;

  constructor(root: HTMLElement, onMute: () => void, onStart: () => void, onRestart: () => void) {
    this.root = root;
    root.innerHTML = `
      <div class="panel" id="hud-rank"><div class="label">POS</div><div class="big" id="v-rank">- / -</div></div>
      <div class="panel" id="hud-time"><div class="label">TIME</div><div class="big" id="v-time">0:00.0</div></div>
      <div class="panel" id="hud-progress-wrap"><div class="label">COURSE</div><div id="hud-progress"><div id="hud-progress-fill"></div></div></div>
      <div class="panel" id="hud-speed"><div class="label">SPEED</div><div class="big"><span id="v-speed">0</span> km/h</div></div>
      <div class="panel" id="hud-vitals">
        <div class="label">CONDITION</div>
        <div class="bar"><div id="v-hp"></div></div>
        <div id="hud-cds">
          <div class="cd">PUNCH J/K<i id="v-punch"></i></div>
          <div class="cd">CLUB L<i id="v-club"></i></div>
        </div>
      </div>
      <button id="btn-mute">SOUND: ON [M]</button>
      <div id="floaters"></div>
      <div class="screen" id="screen-menu">
        <div class="box">
          <h1>ROAD RASH 3D</h1>
          <p>OUTLAW MOTO GP &mdash; 6 RIDERS, ONE HIGHWAY, FISTS AND A CLUB.</p>
          <ul>
            <li><kbd>W/&uarr;</kbd>THROTTLE&nbsp;&nbsp;<kbd>S/&darr;</kbd>BRAKE</li>
            <li><kbd>A/&larr;</kbd><kbd>D/&rarr;</kbd>STEER (LEAN INTO CURVES)</li>
            <li><kbd>J</kbd>PUNCH LEFT&nbsp;&nbsp;<kbd>K</kbd>PUNCH RIGHT</li>
            <li><kbd>L</kbd>CLUB SWING (LONGER, HARDER, SLOWER)</li>
            <li><kbd>ESC</kbd>PAUSE&nbsp;&nbsp;<kbd>M</kbd>MUTE&nbsp;&nbsp;<kbd>R</kbd>RESTART AFTER FINISH</li>
          </ul>
          <p>WATCH THE ONCOMING LANE &mdash; HEAD-ON HITS AT SPEED WILL THROW YOU OFF.</p>
          <button class="btn" id="btn-start">START ENGINE</button>
        </div>
      </div>
      <div class="screen hidden" id="screen-countdown"><div id="countdown-num">3</div></div>
      <div class="screen hidden" id="screen-pause">
        <div class="box"><h2>PAUSED</h2><p>PRESS <kbd>ESC</kbd> TO RESUME</p></div>
      </div>
      <div class="screen hidden" id="screen-finish">
        <div class="box">
          <h2 id="finish-title">FINISH</h2>
          <p id="finish-time"></p>
          <div id="finish-results"></div>
          <p>PRESS <kbd>R</kbd> TO RACE AGAIN</p>
          <button class="btn" id="btn-restart">RESTART</button>
        </div>
      </div>
      <div id="scanlines"></div>`;
    this.elRank = root.querySelector('#v-rank')!;
    this.elTime = root.querySelector('#v-time')!;
    this.elProgFill = root.querySelector('#hud-progress-fill')!;
    this.elSpeed = root.querySelector('#v-speed')!;
    this.elHp = root.querySelector('#v-hp')!;
    this.elPunch = root.querySelector('#v-punch')!;
    this.elClub = root.querySelector('#v-club')!;
    this.elMute = root.querySelector('#btn-mute')!;
    this.elCount = root.querySelector('#countdown-num')!;
    this.elResults = root.querySelector('#finish-results')!;
    this.elFinishTime = root.querySelector('#finish-time')!;
    for (const id of ['menu', 'countdown', 'pause', 'finish']) {
      this.screens[id] = root.querySelector(`#screen-${id}`)!;
    }
    const fl = root.querySelector('#floaters')!;
    for (let i = 0; i < 5; i++) {
      const d = document.createElement('div');
      d.className = 'floater';
      d.style.display = 'none';
      d.innerHTML = `<span class="fname"></span> <span class="bang"></span><div class="fbar"><div></div></div>`;
      fl.appendChild(d);
      this.floaters.push(d);
    }
    this.elMute.addEventListener('click', () => {
      onMute();
      this.elMute.blur();
    });
    root.querySelector('#btn-start')!.addEventListener('click', () => onStart());
    root.querySelector('#btn-restart')!.addEventListener('click', () => onRestart());
  }

  setMuteLabel(muted: boolean) {
    this.elMute.textContent = muted ? 'SOUND: OFF [M]' : 'SOUND: ON [M]';
  }

  show(screen: 'menu' | 'countdown' | 'pause' | 'finish' | null) {
    for (const [k, el] of Object.entries(this.screens)) {
      el.classList.toggle('hidden', k !== screen);
    }
  }

  setCountdown(text: string) {
    this.elCount.textContent = text;
  }

  update(d: HudData) {
    this.elSpeed.textContent = Math.round(d.speedKmh).toString();
    this.elHp.style.width = `${Math.max(0, d.hp01) * 100}%`;
    this.elRank.textContent = `${d.rank} / ${d.total}`;
    this.elTime.textContent = fmtTime(d.time);
    this.elProgFill.style.width = `${clamp01(d.progress01) * 100}%`;
    this.elPunch.style.transform = `scaleX(${1 - Math.min(1, d.punchCd01)})`;
    this.elClub.style.transform = `scaleX(${1 - Math.min(1, d.clubCd01)})`;
  }

  setFloaters(list: FloaterData[]) {
    for (let i = 0; i < this.floaters.length; i++) {
      const el = this.floaters[i];
      const f = list[i];
      if (!f || !f.visible) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = 'block';
      el.style.left = `${f.x}px`;
      el.style.top = `${f.y}px`;
      el.classList.toggle('warn', f.warn);
      (el.querySelector('.fname') as HTMLElement).textContent = f.name;
      (el.querySelector('.bang') as HTMLElement).textContent = f.warn ? '!' : '';
      (el.querySelector('.fbar > div') as HTMLElement).style.width = `${Math.max(0, f.hp01) * 100}%`;
    }
  }

  showResults(rows: ResultRow[], playerTime: number, playerPos: number) {
    const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    this.elResults.innerHTML = `<table><tr><th>POS</th><th>RIDER</th><th>TIME</th></tr>${rows
      .map((r) => `<tr class="${r.me ? 'me' : ''}"><td>${ord[r.pos - 1]}</td><td>${r.name}</td><td>${r.time}</td></tr>`)
      .join('')}</table>`;
    this.elFinishTime.textContent = `YOU FINISHED ${ord[playerPos - 1]} IN ${fmtTime(playerTime)}`;
  }
}
