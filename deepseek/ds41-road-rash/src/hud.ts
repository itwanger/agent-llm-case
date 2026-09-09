/* ============================================================
 * hud.ts — retro instrument panel (canvas speedometer + DOM)
 * ============================================================ */

import { clamp, formatTime } from './utils';

export interface ResultRow {
  name: string;
  time: number;
  dnf: boolean;
  isPlayer: boolean;
  hits: number;
}

const DPR = Math.min(2, window.devicePixelRatio || 1);

export class HUD {
  private speedo: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rankValue = document.getElementById('rank-value')!;
  private lapValue = document.getElementById('lap-value')!;
  private timeValue = document.getElementById('time-value')!;
  private bestValue = document.getElementById('best-value')!;
  private healthFill = document.getElementById('health-fill')!;
  private comboEl = document.getElementById('combo')!;
  private centerMsg = document.getElementById('center-msg')!;
  private subMsg = document.getElementById('sub-msg')!;
  private flashEl = document.getElementById('flash')!;
  private results = document.getElementById('results')!;
  private resultsTitle = document.getElementById('results-title')!;
  private resultsTable = document.getElementById('results-table')!;
  private loading = document.getElementById('loading')!;

  private dispSpeed = 0;
  private dispNeedle = -225;
  private msgTimer = 0;
  private subTimer = 0;
  private flashAmount = 0;

  constructor() {
    this.speedo = document.getElementById('speedo') as HTMLCanvasElement;
    const size = 230;
    this.speedo.width = size * DPR;
    this.speedo.height = size * DPR;
    this.ctx = this.speedo.getContext('2d')!;
    this.ctx.scale(DPR, DPR);
  }

  /* ---------------------------------------------------------------
   * speedometer
   * ------------------------------------------------------------- */
  drawSpeedo(kmh: number, dt: number, gear: number, redline: boolean): void {
    this.dispSpeed += (kmh - this.dispSpeed) * clamp(dt * 9, 0, 1);
    const max = 260;
    const frac = clamp(this.dispSpeed / max, 0, 1.04);
    const start = -225;
    const sweep = 270;
    const target = start + frac * sweep;
    this.dispNeedle += (target - this.dispNeedle) * clamp(dt * 14, 0, 1);

    const c = this.ctx;
    const S = 230;
    const cx = S / 2;
    const cy = S / 2;
    const r = 98;
    c.clearRect(0, 0, S, S);

    /* dial face */
    c.beginPath();
    c.arc(cx, cy, r + 8, 0, Math.PI * 2);
    const face = c.createRadialGradient(cx, cy - 20, 10, cx, cy, r + 8);
    face.addColorStop(0, 'rgba(22,18,28,0.92)');
    face.addColorStop(1, 'rgba(6,5,10,0.95)');
    c.fillStyle = face;
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255,179,32,0.85)';
    c.stroke();

    /* redline arc */
    const rl0 = start + (220 / max) * sweep;
    const rl1 = start + sweep;
    c.beginPath();
    c.arc(cx, cy, r + 2, (rl0 * Math.PI) / 180, (rl1 * Math.PI) / 180);
    c.lineWidth = 6;
    c.strokeStyle = redline ? '#ff3b2f' : 'rgba(255,59,47,0.55)';
    c.stroke();

    /* speed arc */
    if (frac > 0.001) {
      c.beginPath();
      c.arc(cx, cy, r + 2, (start * Math.PI) / 180, (this.dispNeedle * Math.PI) / 180);
      c.lineWidth = 6;
      const grad = c.createLinearGradient(0, 0, S, S);
      grad.addColorStop(0, '#37f0ff');
      grad.addColorStop(0.55, '#ffb320');
      grad.addColorStop(1, '#ff2d2d');
      c.strokeStyle = grad;
      c.stroke();
    }

    /* ticks */
    for (let i = 0; i <= 13; i++) {
      const a = ((start + (i / 13) * sweep) * Math.PI) / 180;
      const major = i % 1 === 0;
      const inner = major ? r - 16 : r - 9;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      c.lineTo(cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1));
      c.lineWidth = major ? 3 : 1.5;
      c.strokeStyle = i >= 11 ? '#ff3b2f' : 'rgba(255,255,255,0.82)';
      c.stroke();

      if (major) {
        const lr = r - 30;
        c.save();
        c.translate(cx + Math.cos(a) * lr, cy + Math.sin(a) * lr);
        c.rotate(a + Math.PI / 2);
        c.fillStyle = i >= 11 ? '#ff6b5f' : 'rgba(255,255,255,0.86)';
        c.font = 'bold 12px Menlo, monospace';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(i * 20), 0, 0);
        c.restore();
      }
    }

    /* needle */
    const na = (this.dispNeedle * Math.PI) / 180;
    c.save();
    c.translate(cx, cy);
    c.rotate(na);
    c.beginPath();
    c.moveTo(-8, 0);
    c.lineTo(0, -4.5);
    c.lineTo(r - 22, 0);
    c.lineTo(0, 4.5);
    c.closePath();
    c.fillStyle = '#ff3b2f';
    c.shadowColor = '#ff3b2f';
    c.shadowBlur = 14;
    c.fill();
    c.restore();

    c.beginPath();
    c.arc(cx, cy, 11, 0, Math.PI * 2);
    c.fillStyle = '#141019';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = 'rgba(255,179,32,0.9)';
    c.stroke();

    /* digital readout */
    c.textAlign = 'center';
    c.fillStyle = '#ffb320';
    c.font = 'bold 26px Menlo, monospace';
    c.shadowColor = 'rgba(255,179,32,0.8)';
    c.shadowBlur = 12;
    c.fillText(String(Math.round(this.dispSpeed)), cx, cy + 52);
    c.shadowBlur = 0;
    c.font = 'bold 10px Menlo, monospace';
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillText('KM/H', cx, cy + 66);

    c.font = 'bold 13px Menlo, monospace';
    c.fillStyle = '#37f0ff';
    c.fillText(`G${gear}`, cx, cy - 46);
  }

  /* ---------------------------------------------------------------
   * panels
   * ------------------------------------------------------------- */
  private lastRank = -1;
  private lastLap = -1;
  private lastTimeStr = '';
  private lastHealth = -1;

  setRank(rank: number, total: number): void {
    if (rank === this.lastRank) return;
    this.lastRank = rank;
    this.rankValue.innerHTML = `${rank}<span class="small">/${total}</span>`;
  }

  setLap(lap: number, laps: number): void {
    const v = Math.min(lap, laps);
    if (v === this.lastLap) return;
    this.lastLap = v;
    this.lapValue.textContent = `LAP ${v}/${laps}`;
  }

  setTime(t: number): void {
    const str = formatTime(t);
    if (str === this.lastTimeStr) return;
    this.lastTimeStr = str;
    this.timeValue.textContent = str;
  }

  setBest(t: number | null): void {
    this.bestValue.textContent = `BEST ${t === null ? '--:--.--' : formatTime(t)}`;
  }

  setHealth(frac: number): void {
    const f = clamp(frac, 0, 1);
    if (Math.abs(f - this.lastHealth) < 0.002) return;
    this.lastHealth = f;
    this.healthFill.style.transform = `scaleX(${f})`;
    this.healthFill.classList.toggle('warn', f <= 0.6 && f > 0.3);
    this.healthFill.classList.toggle('crit', f <= 0.3);
  }

  setCombo(n: number): void {
    if (n > 1) {
      this.comboEl.textContent = `${n}x COMBO`;
      this.comboEl.classList.add('on');
    } else {
      this.comboEl.classList.remove('on');
    }
  }

  message(text: string, cls = '', dur = 1.1): void {
    this.centerMsg.textContent = text;
    this.centerMsg.className = 'show' + (cls ? ' ' + cls : '');
    this.msgTimer = dur;
  }

  subMessage(text: string, dur = 1.4): void {
    this.subMsg.textContent = text;
    this.subMsg.classList.add('show');
    this.subTimer = dur;
  }

  flash(amount = 0.55): void {
    this.flashAmount = Math.max(this.flashAmount, amount);
  }

  update(dt: number): void {
    if (this.msgTimer > 0) {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.centerMsg.className = '';
    }
    if (this.subTimer > 0) {
      this.subTimer -= dt;
      if (this.subTimer <= 0) this.subMsg.classList.remove('show');
    }
    if (this.flashAmount > 0.001) {
      this.flashEl.style.opacity = String(this.flashAmount);
      this.flashAmount *= Math.exp(-9 * dt);
    } else if (this.flashEl.style.opacity !== '0') {
      this.flashEl.style.opacity = '0';
    }
  }

  /* ---------------------------------------------------------------
   * results / loading
   * ------------------------------------------------------------- */
  showResults(title: string, rows: ResultRow[]): void {
    this.resultsTitle.textContent = title;
    this.resultsTable.innerHTML = rows
      .map((r, i) => {
        const cls = ['rrow', r.isPlayer ? 'player' : '', r.dnf ? 'dnf' : ''].join(' ').trim();
        return `<div class="${cls}">
          <div class="pos">${r.dnf ? '--' : i + 1}</div>
          <div class="name">${r.name}${r.isPlayer ? ' (YOU)' : ''}</div>
          <div class="time">${r.dnf ? 'DNF' : formatTime(r.time)}</div>
          <div class="pts">${r.hits} HIT</div>
        </div>`;
      })
      .join('');
    this.results.classList.remove('hidden');
  }

  hideResults(): void {
    this.results.classList.add('hidden');
  }

  hideLoading(): void {
    this.loading.classList.add('done');
    setTimeout(() => {
      this.loading.style.display = 'none';
    }, 520);
  }
}
