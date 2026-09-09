/**
 * HUD：血量、弹药、击杀数、武器栏、提示、受伤晕染、命中标记。
 * 全是 DOM，配合 CSS 里的手绘样式。
 */

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.el = {
      hud: $('hud'),
      hpFill: $('hp-fill'),
      hpNum: $('hp-num'),
      hpState: $('hp-state'),
      ammoMag: $('ammo-mag'),
      ammoReserve: $('ammo-reserve'),
      ammoLine: document.querySelector('.ammo-line'),
      weaponName: $('weapon-name'),
      weaponHint: $('weapon-hint'),
      kills: $('kill-count'),
      threat: $('threat-count'),
      toast: $('hud-toast'),
      crosshair: $('crosshair'),
      hitmark: document.querySelector('.ch-hitmark'),
      damage: $('damage-vignette'),
      ink: $('ink-vignette'),
      overlay: $('overlay'),
      card: $('overlay-card'),
      title: $('overlay-title'),
      sub: $('overlay-sub'),
      btn: $('overlay-btn'),
      keymap: document.querySelector('.keymap'),
      loading: $('loading'),
      rack: $('weapon-rack'),
    };
    this.toastT = 0;
    this.damageT = 0;
    this.inkT = 0;
  }

  hideLoading() {
    this.el.loading.classList.add('hidden');
    setTimeout(() => this.el.loading.remove(), 500);
  }

  show() {
    this.el.hud.classList.remove('hidden');
    this.el.crosshair.classList.add('on');
  }

  hide() {
    this.el.hud.classList.add('hidden');
    this.el.crosshair.classList.remove('on');
  }

  setHealth(hp, max) {
    const shown = Math.max(0, Math.ceil(hp));
    if (shown === this._hpShown) return; // 血量没变就不碰 DOM
    this._hpShown = shown;
    const pct = Math.max(0, Math.min(1, hp / max));
    this.el.hpFill.style.width = `${pct * 100}%`;
    this.el.hpNum.textContent = shown;
    this.el.hpState.textContent =
      hp > 70 ? '状态：正常' : hp > 35 ? '状态：渗墨' : '状态：快被涂掉了';
  }

  setWeapon(def, ammo) {
    this.el.weaponName.textContent = def.name;
    this.el.weaponHint.textContent = def.hint;
    if (def.melee) {
      this.el.ammoMag.textContent = '∞';
      this.el.ammoReserve.textContent = '—';
      this.el.ammoLine.classList.remove('low');
    } else {
      this.el.ammoMag.textContent = ammo.mag;
      this.el.ammoReserve.textContent = ammo.reserve;
      this.el.ammoLine.classList.toggle('low', ammo.mag <= Math.ceil(def.magSize * 0.25));
    }
  }

  setWeaponIndex(i) {
    const slots = this.el.rack.querySelectorAll('.slot');
    slots.forEach((s, k) => s.classList.toggle('active', k === i));
  }

  setKills(n) {
    this.el.kills.textContent = n;
  }

  setThreat(n) {
    this.el.threat.textContent = n;
  }

  hitmark(killed) {
    this.el.hitmark.classList.remove('on');
    // 强制重排，让动画能重复播放
    void this.el.hitmark.offsetWidth;
    this.el.hitmark.classList.add('on');
    if (killed) this.el.hitmark.style.filter = 'drop-shadow(0 0 6px #d8402f)';
  }

  shotKick() {
    this.el.crosshair.classList.add('shot');
    clearTimeout(this._shotT);
    this._shotT = setTimeout(() => this.el.crosshair.classList.remove('shot'), 70);
  }

  toast(msg, dur = 1.3) {
    this.el.toast.textContent = msg;
    this.el.toast.classList.add('on');
    this.toastT = dur;
  }

  damageFlash() {
    this.damageT = 1;
  }

  inkFlash() {
    this.inkT = 1;
  }

  update(dt) {
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.el.toast.classList.remove('on');
    }
    if (this.damageT > 0) {
      this.damageT = Math.max(0, this.damageT - dt * 2.2);
      this.el.damage.style.opacity = this.damageT;
    }
    if (this.inkT > 0) {
      this.inkT = Math.max(0, this.inkT - dt * 1.6);
      this.el.ink.style.opacity = this.inkT;
    }
  }

  // ------------------------------------------------------ 遮罩

  showStart() {
    this.el.card.classList.remove('dead');
    this.el.title.textContent = '横格纸涂鸦 · FPS';
    this.el.sub.innerHTML =
      '整个世界画在一页横格笔记本上。<br />你是被蓝圆珠笔画出来的一支笔，红色火柴人正在纸面上游荡。';
    this.el.keymap.style.display = '';
    this.el.btn.textContent = '点击开始';
    this.el.btn.classList.remove('dead');
    this.el.overlay.classList.remove('hidden');
  }

  showPause() {
    this.el.card.classList.remove('dead');
    this.el.title.textContent = '暂停中';
    this.el.sub.innerHTML = '鼠标已解锁。纸面上的时间也停住了。';
    this.el.keymap.style.display = 'none';
    this.el.btn.textContent = '继续游戏';
    this.el.btn.classList.remove('dead');
    this.el.overlay.classList.remove('hidden');
  }

  showDead(stats) {
    this.hide(); // 结算时收起 HUD，别让计数器透在卡片后面
    this.el.card.classList.add('dead');
    this.el.title.textContent = '你被红笔画掉了';
    this.el.keymap.style.display = 'none';
    this.el.sub.innerHTML = `<div class="death-stats">
      <div><strong>${stats.kills}</strong><span>击杀</span></div>
      <div><strong>${Math.floor(stats.time)}s</strong><span>存活</span></div>
      <div><strong>${stats.accuracy}%</strong><span>命中率</span></div>
    </div>`;
    this.el.btn.textContent = '再画一局';
    this.el.btn.classList.add('dead');
    this.el.overlay.classList.remove('hidden');
    this.inkFlash();
  }

  hideOverlay() {
    this.el.overlay.classList.add('hidden');
  }

  onStart(fn) {
    this.el.btn.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
  }
}
