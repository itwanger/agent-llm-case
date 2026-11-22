import {
  ZETA_ZEROS,
  EULER_PRIMES,
  piExact,
  liOffset,
  riemannR,
  analyzeEulerSubset,
  singleZeroOscillation,
  createExplicitCache,
  createCriticalStripCache,
} from './math.js';

const COLORS = {
  surface: '#FFFFFF',
  surfaceSub: '#F6F8FB',
  border: '#D8DEE6',
  grid: '#E8EDF3',
  ink: '#0F172A',
  muted: '#475569',
  blue: '#1D4ED8',
  blueSoft: '#93C5FD',
  red: '#DC2626',
  teal: '#0F766E',
  tintTeal: 'rgba(15, 118, 110, 0.11)',
  tintBlue: 'rgba(29, 78, 216, 0.08)',
  tintRed: 'rgba(220, 38, 38, 0.12)',
};

const FONT_SANS = '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
const FONT_MONO = '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

const SUP_DIGITS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function toSup(num) {
  return String(num)
    .split('')
    .map((ch) => SUP_DIGITS[ch] || ch)
    .join('');
}

function syncSliderStyle(input) {
  if (!input) return;
  input.style.setProperty('--attr-min', String(Number(input.min || 0)));
  input.style.setProperty('--attr-max', String(Number(input.max || 100)));
  input.style.setProperty('--control-value', String(Number(input.value || 0)));
}

const liveAnnouncer = document.getElementById('live-announcer');
let announceTimer = null;
function announce(msg) {
  if (!liveAnnouncer) return;
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    liveAnnouncer.textContent = msg;
  }, 150);
}

function setupCanvas(canvas) {
  const parent = canvas.parentElement;
  const w = Math.max(240, Math.round(parent ? parent.clientWidth : canvas.clientWidth || 600));
  const h = Math.max(120, Math.round(parent ? parent.clientHeight : canvas.clientHeight || 240));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const tw = Math.round(w * dpr);
  const th = Math.round(h * dpr);
  if (canvas.width !== tw || canvas.height !== th) {
    canvas.width = tw;
    canvas.height = th;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function niceAxisScale(rawMax, targetTicks = 5) {
  const safeMax = Math.max(4, rawMax);
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 150, 200, 250];
  let step = candidates[candidates.length - 1];
  for (const c of candidates) {
    if (safeMax / c <= targetTicks + 1.05) {
      step = c;
      break;
    }
  }
  const yMax = Math.ceil(safeMax / step) * step;
  const ticks = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);
  return { yMax, step, ticks };
}

function niceSymScale(rawAbsMax) {
  const safe = Math.max(0.2, rawAbsMax);
  const candidates = [0.2, 0.5, 1, 2, 5, 10, 20, 25, 40, 50, 80, 100];
  let bound = candidates[candidates.length - 1];
  for (const c of candidates) {
    if (c >= safe) {
      bound = c;
      break;
    }
  }
  const step = bound / 2;
  return { bound, ticks: [-bound, -step, 0, step, bound] };
}

function formatTick(v) {
  if (Math.abs(v) < 1e-9) return '0';
  if (Number.isInteger(v)) return v > 0 ? `+${v}` : String(v);
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

/* =========================================================
   SCROLL SPY FOR TOP NAV
   ========================================================= */
function initScrollSpy() {
  const links = new Map();
  document.querySelectorAll('.nav-link[data-sec]').forEach((el) => {
    links.set(el.dataset.sec, el);
  });
  const sections = ['m1', 'm2', 'm3', 'm4']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  const setActive = (id) => {
    links.forEach((a, key) => {
      a.classList.toggle('is-current', key === id);
      if (key === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };
  setActive('m1');

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length > 0) setActive(visible[0].target.id);
    },
    { rootMargin: '-16% 0px -56% 0px', threshold: [0.1, 0.35, 0.6] }
  );
  sections.forEach((s) => io.observe(s));
}

/* =========================================================
   MODULE 01: PRIME COUNTING pi(x) & RESIDUAL ERROR
   ========================================================= */
function initModule1() {
  const countCanvas = document.getElementById('m1-count-canvas');
  const errorCanvas = document.getElementById('m1-error-canvas');
  const presetsEl = document.getElementById('m1-range-presets');
  const toggleLi = document.getElementById('m1-toggle-li');
  const toggleR = document.getElementById('m1-toggle-r');
  const probeSlider = document.getElementById('m1-probe-slider');
  const probeLabel = document.getElementById('m1-probe-label');

  const outX = document.getElementById('m1-out-x');
  const outPi = document.getElementById('m1-out-pi');
  const outLi = document.getElementById('m1-out-li');
  const outR = document.getElementById('m1-out-r');
  const outErr = document.getElementById('m1-out-err');
  const outRel = document.getElementById('m1-out-rel');
  const topCap = document.getElementById('m1-top-caption');

  const state = {
    xMax: 200,
    probeX: 100,
    showLi: true,
    showR: true,
    dragging: false,
  };

  let sharedPadL = 52;
  let sharedPlotW = 600;

  function updateReadouts() {
    const x = Math.max(2, Math.min(state.xMax, Math.round(state.probeX)));
    state.probeX = x;

    const pi = piExact(x);
    const li = liOffset(x);
    const rx = riemannR(x);
    const err = pi - li;
    const rel = pi > 0 ? (Math.abs(err) / pi) * 100 : 0;

    probeSlider.max = String(state.xMax);
    probeSlider.value = String(x);
    probeSlider.setAttribute('aria-valuetext', `x = ${x}，素数计数 ${pi}，误差 ${err.toFixed(2)}`);
    syncSliderStyle(probeSlider);

    probeLabel.textContent = `x = ${x}`;
    outX.textContent = String(x);
    outPi.textContent = String(pi);
    outLi.textContent = li.toFixed(2);
    outR.textContent = rx.toFixed(2);
    outErr.textContent = `${err >= 0 ? '+' : '−'}${Math.abs(err).toFixed(2)}`;
    outRel.textContent = `${rel.toFixed(1)}%`;

    presetsEl.querySelectorAll('button[data-xmax]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.xmax) === state.xMax);
    });

    topCap.textContent = `素数计数函数 π(x) 与 Li(x)、R(x) 在区间 2 到 ${state.xMax} 的对比。当前 x = ${x}，π(${x}) = ${pi}，Li(${x}) = ${li.toFixed(2)}，R(${x}) = ${rx.toFixed(2)}。`;
  }

  function drawTop() {
    const { ctx, w, h } = setupCanvas(countCanvas);
    const padL = w < 440 ? 42 : 52;
    const padR = 18;
    const padT = 16;
    const padB = 30;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(70, h - padT - padB);
    sharedPadL = padL;
    sharedPlotW = plotW;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMax = state.xMax;
    const rawYMax = Math.max(piExact(xMax), liOffset(xMax)) * 1.1;
    const { yMax, ticks } = niceAxisScale(rawYMax, w < 440 ? 4 : 5);

    const toX = (x) => padL + ((x - 2) / (xMax - 2)) * plotW;
    const toY = (y) => padT + plotH - (y / yMax) * plotH;

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = `600 10.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ticks.forEach((yv) => {
      const yy = toY(yv);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(String(yv), padL - 7, yy);
    });

    const xTickCount = w < 440 ? 4 : 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= xTickCount; i++) {
      const xv = i === 0 ? 2 : Math.round((xMax * i) / xTickCount);
      const xx = toX(xv);
      ctx.beginPath();
      ctx.moveTo(xx, padT);
      ctx.lineTo(xx, padT + plotH);
      ctx.stroke();
      ctx.fillText(String(xv), xx, padT + plotH + 7);
    }

    // Li(x) dashed analytical blue
    if (state.showLi) {
      ctx.save();
      ctx.strokeStyle = COLORS.blue;
      ctx.lineWidth = 2.1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      const samples = 240;
      for (let i = 0; i <= samples; i++) {
        const xv = 2 + ((xMax - 2) * i) / samples;
        const px = toX(xv);
        const py = toY(liOffset(xv));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // R(x) solid teal
    if (state.showR) {
      ctx.save();
      ctx.strokeStyle = COLORS.teal;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const samples = 240;
      for (let i = 0; i <= samples; i++) {
        const xv = 2 + ((xMax - 2) * i) / samples;
        const px = toX(xv);
        const py = toY(riemannR(xv));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Exact pi(x) step function
    ctx.save();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = xMax <= 200 ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(toX(2), toY(1));
    let prev = 1;
    for (let n = 3; n <= xMax; n++) {
      const cur = piExact(n);
      if (cur !== prev) {
        ctx.lineTo(toX(n), toY(prev));
        ctx.lineTo(toX(n), toY(cur));
        prev = cur;
      }
    }
    ctx.lineTo(toX(xMax), toY(prev));
    ctx.stroke();
    ctx.restore();

    // Probe vertical line & markers
    const px = toX(state.probeX);
    ctx.save();
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, padT);
    ctx.lineTo(px, padT + plotH);
    ctx.stroke();
    ctx.restore();

    if (state.showLi) {
      ctx.fillStyle = COLORS.surface;
      ctx.strokeStyle = COLORS.blue;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, toY(liOffset(state.probeX)), 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.arc(px, toY(piExact(state.probeX)), 4.8, 0, Math.PI * 2);
    ctx.fill();

    // Frame border
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }

  function drawBottom() {
    const { ctx, w, h } = setupCanvas(errorCanvas);
    const padL = w < 440 ? 42 : 52;
    const padR = 18;
    const padT = 14;
    const padB = 28;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(60, h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMax = state.xMax;
    const envMax = Math.sqrt(xMax);
    const { bound, ticks } = niceSymScale(envMax * 1.1);

    const toX = (x) => padL + ((x - 2) / (xMax - 2)) * plotW;
    const toY = (y) => padT + plotH / 2 - (y / bound) * (plotH / 2);

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = `600 10.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ticks.forEach((yv) => {
      const yy = toY(yv);
      ctx.strokeStyle = yv === 0 ? '#CBD5E1' : COLORS.grid;
      ctx.lineWidth = yv === 0 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(formatTick(yv), padL - 7, yy);
    });

    const xTickCount = w < 440 ? 4 : 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= xTickCount; i++) {
      const xv = i === 0 ? 2 : Math.round((xMax * i) / xTickCount);
      ctx.fillText(String(xv), toX(xv), padT + plotH + 7);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    // ±sqrt(x) reference envelope
    const samples = 240;
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    for (const sign of [1, -1]) {
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const xv = 2 + ((xMax - 2) * i) / samples;
        const px = toX(xv);
        const py = toY(sign * Math.sqrt(xv));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Residual pi(x) - Li(x)
    if (state.showLi) {
      ctx.strokeStyle = COLORS.blue;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const xv = 2 + ((xMax - 2) * i) / samples;
        const px = toX(xv);
        const py = toY(piExact(xv) - liOffset(xv));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Residual pi(x) - R(x)
    if (state.showR) {
      ctx.strokeStyle = COLORS.teal;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const xv = 2 + ((xMax - 2) * i) / samples;
        const px = toX(xv);
        const py = toY(piExact(xv) - riemannR(xv));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Probe line
    const px = toX(state.probeX);
    ctx.save();
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, padT);
    ctx.lineTo(px, padT + plotH);
    ctx.stroke();
    ctx.restore();

    if (state.showLi) {
      const errLi = piExact(state.probeX) - liOffset(state.probeX);
      ctx.fillStyle = COLORS.blue;
      ctx.beginPath();
      ctx.arc(px, toY(errLi), 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }

  function render() {
    updateReadouts();
    drawTop();
    drawBottom();
  }

  function pointerToX(canvas, clientX) {
    const rect = canvas.getBoundingClientRect();
    const lx = clientX - rect.left;
    const t = Math.max(0, Math.min(1, (lx - sharedPadL) / sharedPlotW));
    return Math.max(2, Math.min(state.xMax, Math.round(2 + t * (state.xMax - 2))));
  }

  presetsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-xmax]');
    if (!btn) return;
    const nextMax = Number(btn.dataset.xmax);
    state.xMax = nextMax;
    if (nextMax === 50) state.probeX = 31;
    else if (nextMax === 200) state.probeX = 100;
    else if (nextMax === 1000) state.probeX = 600;
    else state.probeX = 3000;
    render();
  });

  toggleLi.addEventListener('click', () => {
    state.showLi = !state.showLi;
    toggleLi.setAttribute('aria-checked', state.showLi ? 'true' : 'false');
    toggleLi.classList.toggle('is-on', state.showLi);
    render();
  });

  toggleR.addEventListener('click', () => {
    state.showR = !state.showR;
    toggleR.setAttribute('aria-checked', state.showR ? 'true' : 'false');
    toggleR.classList.toggle('is-on', state.showR);
    render();
  });

  probeSlider.addEventListener('input', () => {
    state.probeX = Number(probeSlider.value);
    render();
  });

  [countCanvas, errorCanvas].forEach((cv) => {
    cv.addEventListener('pointerdown', (e) => {
      state.dragging = true;
      state.probeX = pointerToX(cv, e.clientX);
      render();
    });
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || state.dragging) {
        const next = pointerToX(cv, e.clientX);
        if (next !== state.probeX) {
          state.probeX = next;
          render();
        }
      }
    });
  });

  window.addEventListener('pointerup', () => {
    state.dragging = false;
  });

  const ro = new ResizeObserver(() => {
    drawTop();
    drawBottom();
  });
  ro.observe(countCanvas.parentElement);
  ro.observe(errorCanvas.parentElement);

  render();
}

/* =========================================================
   MODULE 02: EULER PRODUCT FORMULA & 1-60 FACTORIZATION GRID
   ========================================================= */
function initModule2() {
  const sPresetsEl = document.getElementById('m2-s-presets');
  const sSlider = document.getElementById('m2-s-slider');
  const sValEl = document.getElementById('m2-s-val');
  const primeTogglesEl = document.getElementById('m2-prime-toggles');
  const preset23Btn = document.getElementById('m2-preset-23');
  const presetAllBtn = document.getElementById('m2-preset-all');
  const presetClearBtn = document.getElementById('m2-preset-clear');

  const outProd = document.getElementById('m2-out-prod');
  const outSum = document.getElementById('m2-out-sum');
  const outZeta = document.getElementById('m2-out-zeta');
  const outCov = document.getElementById('m2-out-cov');
  const factorGridEl = document.getElementById('m2-factor-grid');

  const state = {
    s: 2.0,
    selected: new Set([2, 3]),
  };

  function buildPrimeButtons() {
    primeTogglesEl.innerHTML = '';
    EULER_PRIMES.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prime-btn';
      btn.dataset.p = String(p);
      btn.textContent = String(p);
      btn.setAttribute('aria-label', `素数因子 ${p}`);
      btn.addEventListener('click', () => {
        if (state.selected.has(p)) state.selected.delete(p);
        else state.selected.add(p);
        render();
      });
      primeTogglesEl.appendChild(btn);
    });
  }

  function formatFactorsHtml(item) {
    if (item.n === 1) return '空积';
    return item.factors
      .map(({ p, exp }) => {
        const piece = exp > 1 ? `${p}${toSup(exp)}` : `${p}`;
        const isMissing = !state.selected.has(p);
        return isMissing ? `<span class="factor-miss">${piece}</span>` : piece;
      })
      .join('·');
  }

  function render() {
    const selectedArr = EULER_PRIMES.filter((p) => state.selected.has(p));
    const res = analyzeEulerSubset(selectedArr, state.s, 60);

    sSlider.value = state.s.toFixed(2);
    sSlider.setAttribute('aria-valuetext', `参数 s = ${state.s.toFixed(2)}，黎曼 ζ(s) = ${res.zetaTrue.toFixed(6)}`);
    syncSliderStyle(sSlider);
    sValEl.textContent = `s = ${state.s.toFixed(2)}`;

    sPresetsEl.querySelectorAll('button[data-s]').forEach((btn) => {
      btn.classList.toggle('is-active', Math.abs(Number(btn.dataset.s) - state.s) < 0.001);
    });

    primeTogglesEl.querySelectorAll('.prime-btn').forEach((btn) => {
      const p = Number(btn.dataset.p);
      const on = state.selected.has(p);
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    const pct = (res.ratioToZeta * 100).toFixed(1);
    outProd.textContent = res.eulerProduct.toFixed(6);
    outSum.textContent = res.coveredSum.toFixed(6);
    outZeta.textContent = `${res.zetaTrue.toFixed(6)} (${pct}%)`;
    outCov.textContent = `${res.coveredCount} / 60`;

    factorGridEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    res.items.forEach((item) => {
      const cell = document.createElement('div');
      cell.className = `factor-cell${item.covered ? ' is-covered' : ''}`;
      cell.innerHTML = `<span class="factor-n">${item.n}</span><span class="factor-expr">${formatFactorsHtml(item)}</span>`;
      frag.appendChild(cell);
    });
    factorGridEl.appendChild(frag);
  }

  sSlider.addEventListener('input', () => {
    state.s = Number(sSlider.value);
    render();
  });

  sPresetsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-s]');
    if (!btn) return;
    state.s = Number(btn.dataset.s);
    render();
  });

  preset23Btn.addEventListener('click', () => {
    state.selected = new Set([2, 3]);
    render();
  });

  presetAllBtn.addEventListener('click', () => {
    state.selected = new Set(EULER_PRIMES);
    render();
  });

  presetClearBtn.addEventListener('click', () => {
    state.selected = new Set();
    render();
  });

  buildPrimeButtons();
  render();
}

/* =========================================================
   MODULE 03: SINGLE ZERO LAB + EXPLICIT FORMULA SUM
   ========================================================= */
function initModule3() {
  const explicitCache = createExplicitCache();

  // Part A elements
  const singleCanvas = document.getElementById('m3-single-canvas');
  const rhoPill = document.getElementById('m3a-rho-pill');
  const aPresetsEl = document.getElementById('m3a-presets');
  const sigmaSlider = document.getElementById('m3a-sigma-slider');
  const sigmaValEl = document.getElementById('m3a-sigma-val');
  const tSlider = document.getElementById('m3a-t-slider');
  const tValEl = document.getElementById('m3a-t-val');
  const envFormulaEl = document.getElementById('m3a-env-formula');
  const envAt120El = document.getElementById('m3a-env-at120');

  // Part B elements
  const sumCanvas = document.getElementById('m3-sum-canvas');
  const maePill = document.getElementById('m3b-mae-pill');
  const playBtn = document.getElementById('m3b-play-btn');
  const bPresetsEl = document.getElementById('m3b-presets');
  const kSlider = document.getElementById('m3b-k-slider');
  const kValEl = document.getElementById('m3b-k-val');
  const maeValEl = document.getElementById('m3b-mae-val');
  const gammaValEl = document.getElementById('m3b-gamma-val');
  const bCaptionEl = document.getElementById('m3b-caption');

  const stateA = {
    sigma: 0.5,
    t: 14.134725,
  };

  const stateB = {
    K: 5,
    playing: false,
    timer: null,
  };

  function updateA() {
    sigmaSlider.value = stateA.sigma.toFixed(2);
    sigmaSlider.setAttribute('aria-valuetext', `实部 σ = ${stateA.sigma.toFixed(2)}`);
    syncSliderStyle(sigmaSlider);

    tSlider.value = stateA.t.toFixed(1);
    tSlider.setAttribute('aria-valuetext', `虚部 t = ${stateA.t.toFixed(2)}`);
    syncSliderStyle(tSlider);

    sigmaValEl.textContent = `σ = ${stateA.sigma.toFixed(2)}`;
    tValEl.textContent = `t = ${stateA.t.toFixed(2)}`;
    rhoPill.textContent = `ρ = ${stateA.sigma.toFixed(2)} + ${stateA.t.toFixed(2)}i`;
    rhoPill.classList.toggle('text-red', stateA.sigma > 0.505);

    envFormulaEl.textContent = `±2·x^${stateA.sigma.toFixed(2)} / (|ρ|·ln x)`;
    const sample120 = singleZeroOscillation(120, stateA.sigma, stateA.t);
    envAt120El.textContent = `±${sample120.envelope.toFixed(3)}`;
    envAt120El.classList.toggle('text-red', stateA.sigma > 0.505);

    aPresetsEl.querySelectorAll('button[data-gamma]').forEach((btn) => {
      btn.classList.toggle('is-active', Math.abs(Number(btn.dataset.gamma) - stateA.t) < 0.08);
    });

    drawSingle();
  }

  function drawSingle() {
    const { ctx, w, h } = setupCanvas(singleCanvas);
    const padL = 44;
    const padR = 14;
    const padT = 14;
    const padB = 28;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(80, h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMin = 2;
    const xMax = 120;
    const N = 260;
    const xs = new Float64Array(N);
    const vals = new Float64Array(N);
    const envs = new Float64Array(N);
    let maxEnv = 0.2;

    for (let i = 0; i < N; i++) {
      const xv = xMin + ((xMax - xMin) * i) / (N - 1);
      xs[i] = xv;
      const res = singleZeroOscillation(xv, stateA.sigma, stateA.t);
      vals[i] = res.value;
      envs[i] = res.envelope;
      if (res.envelope > maxEnv) maxEnv = res.envelope;
    }

    const { bound, ticks } = niceSymScale(Math.max(0.45, maxEnv * 1.1));
    const toX = (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = (y) => padT + plotH / 2 - (y / bound) * (plotH / 2);

    // Grid
    ctx.font = `600 10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ticks.forEach((yv) => {
      const yy = toY(yv);
      ctx.strokeStyle = yv === 0 ? '#CBD5E1' : COLORS.grid;
      ctx.lineWidth = yv === 0 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(formatTick(yv), padL - 6, yy);
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [2, 30, 60, 90, 120].forEach((xv) => {
      ctx.fillText(String(xv), toX(xv), padT + plotH + 6);
    });

    const isHighSigma = stateA.sigma > 0.505;
    const strokeColor = isHighSigma ? COLORS.red : COLORS.blue;

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    // Envelope fill
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = toX(xs[i]);
      const py = toY(envs[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    for (let i = N - 1; i >= 0; i--) {
      ctx.lineTo(toX(xs[i]), toY(-envs[i]));
    }
    ctx.closePath();
    ctx.fillStyle = isHighSigma ? COLORS.tintRed : COLORS.tintBlue;
    ctx.fill();

    // Dashed upper/lower envelope
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    for (const sign of [1, -1]) {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const px = toX(xs[i]);
        const py = toY(sign * envs[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Oscillation curve
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = toX(xs[i]);
      const py = toY(vals[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }

  function stopPlayback() {
    if (stateB.timer !== null) {
      clearInterval(stateB.timer);
      stateB.timer = null;
    }
    stateB.playing = false;
    playBtn.textContent = '▶ 逐项叠加';
  }

  function updateB() {
    const K = stateB.K;
    const mae = explicitCache.maes[K];
    const mae0 = explicitCache.maes[0];

    kSlider.value = String(K);
    kSlider.setAttribute('aria-valuetext', `叠加前 ${K} 对零点，平均绝对误差 ${mae.toFixed(3)}`);
    syncSliderStyle(kSlider);

    kValEl.textContent = K === 0 ? 'K = 0（纯 R(x)）' : `K = ${K} · γ${K} = ${ZETA_ZEROS[K - 1].toFixed(2)}`;
    maePill.textContent = `MAE = ${mae.toFixed(3)}`;
    maeValEl.textContent = `${mae.toFixed(3)}（K=0 为 ${mae0.toFixed(3)}）`;
    gammaValEl.textContent = K === 0 ? '—' : ZETA_ZEROS[K - 1].toFixed(6);

    bPresetsEl.querySelectorAll('button[data-k]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.k) === K);
    });

    bCaptionEl.textContent =
      K === 0
        ? `黑色阶梯为真实 π(x)，当前未叠加零点项，曲线即光滑项 R(x)（MAE = ${mae.toFixed(3)}）。`
        : `黑色阶梯为真实 π(x)，浅灰虚线为 R(x)，实线为叠加前 ${K} 对零点后的 π_${K}(x)（MAE 降至 ${mae.toFixed(3)}）。`;

    drawSum();
  }

  function drawSum() {
    const { ctx, w, h } = setupCanvas(sumCanvas);
    const padL = 40;
    const padR = 14;
    const padT = 14;
    const padB = 28;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(80, h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMin = 2;
    const xMax = 32;
    const yMin = 0;
    const yMax = 12;

    const toX = (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = (y) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = `600 10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [0, 2, 4, 6, 8, 10, 12].forEach((yv) => {
      const yy = toY(yv);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(String(yv), padL - 6, yy);
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [2, 7, 13, 19, 23, 29].forEach((p) => {
      const px = toX(p);
      ctx.save();
      ctx.strokeStyle = 'rgba(29, 78, 216, 0.12)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(String(p), px, padT + plotH + 6);
    });

    // R(x) baseline dashed
    ctx.save();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i < explicitCache.xs.length; i++) {
      const px = toX(explicitCache.xs[i]);
      const py = toY(explicitCache.rVals[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // True pi(x) step function
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(toX(2), toY(1));
    let prev = 1;
    for (let n = 3; n <= 32; n++) {
      const cur = piExact(n);
      if (cur !== prev) {
        ctx.lineTo(toX(n), toY(prev));
        ctx.lineTo(toX(n), toY(cur));
        prev = cur;
      }
    }
    ctx.lineTo(toX(32), toY(prev));
    ctx.stroke();

    // Explicit formula pi_K(x)
    const curve = explicitCache.prefixSums[stateB.K];
    ctx.strokeStyle = stateB.K >= 25 ? COLORS.teal : COLORS.blue;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < explicitCache.xs.length; i++) {
      const px = toX(explicitCache.xs[i]);
      const py = toY(curve[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }

  sigmaSlider.addEventListener('input', () => {
    stateA.sigma = Number(sigmaSlider.value);
    updateA();
  });

  tSlider.addEventListener('input', () => {
    stateA.t = Number(tSlider.value);
    updateA();
  });

  aPresetsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-gamma]');
    if (!btn) return;
    stateA.t = Number(btn.dataset.gamma);
    updateA();
  });

  kSlider.addEventListener('input', () => {
    stopPlayback();
    stateB.K = Number(kSlider.value);
    updateB();
  });

  bPresetsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-k]');
    if (!btn) return;
    stopPlayback();
    stateB.K = Number(btn.dataset.k);
    updateB();
  });

  playBtn.addEventListener('click', () => {
    if (stateB.playing) {
      stopPlayback();
      return;
    }
    if (stateB.K >= 30) stateB.K = 0;
    stateB.playing = true;
    playBtn.textContent = '⏸ 暂停';
    updateB();
    stateB.timer = setInterval(() => {
      if (stateB.K >= 30) {
        stopPlayback();
        announce('显式公式已叠加至前 30 对零点');
        return;
      }
      stateB.K += 1;
      updateB();
    }, 240);
  });

  const ro = new ResizeObserver(() => {
    drawSingle();
    drawSum();
  });
  ro.observe(singleCanvas.parentElement);
  ro.observe(sumCanvas.parentElement);

  updateA();
  updateB();
}

/* =========================================================
   MODULE 04: CRITICAL STRIP 2D DRAG & SYMMETRIC BOUND CHECK
   ========================================================= */
function initModule4() {
  const cache = createCriticalStripCache();

  const stripCanvas = document.getElementById('m4-strip-canvas');
  const errorCanvas = document.getElementById('m4-error-canvas');

  const pinPill = document.getElementById('m4-pin-pill');
  const pinButtonsEl = document.getElementById('m4-pin-buttons');
  const sigmaSlider = document.getElementById('m4-sigma-slider');
  const sigmaValEl = document.getElementById('m4-sigma-val');
  const gammaSlider = document.getElementById('m4-gamma-slider');
  const gammaValEl = document.getElementById('m4-gamma-val');

  const testRightBtn = document.getElementById('m4-test-right');
  const testLeftBtn = document.getElementById('m4-test-left');
  const testResetBtn = document.getElementById('m4-test-reset');

  const statusBadge = document.getElementById('m4-status-badge');
  const outTheta = document.getElementById('m4-out-theta');
  const outOrder = document.getElementById('m4-out-order');
  const outRatio = document.getElementById('m4-out-ratio');
  const diagnosticEl = document.getElementById('m4-diagnostic');

  const defaultPins = () => ZETA_ZEROS.slice(0, 6).map((gamma) => ({ sigma: 0.5, gamma }));

  const state = {
    pins: defaultPins(),
    selectedPin: 0,
    draggingPin: -1,
    hasInteracted: false,
  };

  let stripBox = { padL: 44, padR: 18, padT: 26, padB: 32, plotW: 340, plotH: 240 };
  const T_MIN = 10;
  const T_MAX = 44;

  // Teal diagonal hatch pattern for the σ = 1/2 reference bound
  const hatch = document.createElement('canvas');
  hatch.width = 12;
  hatch.height = 12;
  const hctx = hatch.getContext('2d');
  hctx.fillStyle = 'rgba(15, 118, 110, 0.09)';
  hctx.fillRect(0, 0, 12, 12);
  hctx.strokeStyle = 'rgba(15, 118, 110, 0.26)';
  hctx.lineWidth = 1.2;
  hctx.beginPath();
  hctx.moveTo(0, 12);
  hctx.lineTo(12, 0);
  hctx.moveTo(-6, 6);
  hctx.lineTo(6, -6);
  hctx.moveTo(6, 18);
  hctx.lineTo(18, 6);
  hctx.stroke();

  let result = cache.computeState(state.pins);

  function toPixel(sigma, gamma) {
    return {
      x: stripBox.padL + sigma * stripBox.plotW,
      y: stripBox.padT + stripBox.plotH - ((gamma - T_MIN) / (T_MAX - T_MIN)) * stripBox.plotH,
    };
  }

  function toCoords(lx, ly) {
    const rawS = (lx - stripBox.padL) / stripBox.plotW;
    const rawT = T_MIN + ((stripBox.padT + stripBox.plotH - ly) / stripBox.plotH) * (T_MAX - T_MIN);
    let sigma = Math.max(0.06, Math.min(0.94, rawS));
    if (Math.abs(sigma - 0.5) < 0.025) sigma = 0.5;
    else sigma = Math.round(sigma * 100) / 100;
    const gamma = Math.max(11, Math.min(43, Math.round(rawT * 10) / 10));
    return { sigma, gamma };
  }

  function updateAll() {
    result = cache.computeState(state.pins);
    const pin = state.pins[state.selectedPin];

    pinPill.textContent = `ρ${state.selectedPin + 1} = ${pin.sigma.toFixed(2)} + ${pin.gamma.toFixed(2)}i`;
    sigmaValEl.textContent = pin.sigma.toFixed(2);
    gammaValEl.textContent = pin.gamma.toFixed(1);

    sigmaSlider.value = pin.sigma.toFixed(2);
    sigmaSlider.setAttribute(
      'aria-valuetext',
      Math.abs(pin.sigma - 0.5) < 0.015
        ? '实部 0.50，位于临界线'
        : `实部 ${pin.sigma.toFixed(2)}，对称零点位于 ${(1 - pin.sigma).toFixed(2)}`
    );
    syncSliderStyle(sigmaSlider);

    gammaSlider.value = pin.gamma.toFixed(1);
    gammaSlider.setAttribute('aria-valuetext', `虚部 t = ${pin.gamma.toFixed(1)}`);
    syncSliderStyle(gammaSlider);

    pinButtonsEl.querySelectorAll('button[data-pin]').forEach((btn) => {
      const idx = Number(btn.dataset.pin);
      btn.classList.toggle('is-active', idx === state.selectedPin);
      btn.classList.toggle('pin-off', Math.abs(state.pins[idx].sigma - 0.5) >= 0.015);
    });

    const theta = result.thetaMax;
    const offLine = theta > 0.505;
    const domIdx = result.dominantPinIndex;
    const domPin = state.pins[domIdx];

    outTheta.textContent = theta.toFixed(2);
    outTheta.className = `metric-val mono ${offLine ? 'text-red' : 'text-teal'}`;

    outOrder.textContent = `O(x^${theta.toFixed(2)} · ln x)`;
    outOrder.className = `metric-val mono metric-sm ${offLine ? 'text-red' : ''}`;

    const ratioText = `${result.maxRatio.toFixed(2)}×（${result.breached ? '越界' : '界内'}）`;
    outRatio.textContent = ratioText;
    outRatio.className = `metric-val mono ${result.breached ? 'text-red' : 'text-teal'}`;

    if (result.breached) {
      statusBadge.className = 'mono status-badge is-breached';
      statusBadge.textContent = `越界 · Θ = ${theta.toFixed(2)}`;
      diagnosticEl.className = 'm4-diagnostic is-breached';
      diagnosticEl.textContent = `零点 ρ${domIdx + 1} 偏离至 σ = ${domPin.sigma.toFixed(2)}，对称点 1 − ρ̄${domIdx + 1} 位于 ${(1 - domPin.sigma).toFixed(2)}。主导指数 Θ = ${theta.toFixed(2)} > 0.50，误差峰值达到 σ = 1/2 参考界的 ${result.maxRatio.toFixed(2)} 倍。`;
    } else if (offLine) {
      statusBadge.className = 'mono status-badge is-breached';
      statusBadge.textContent = `偏离临界线 · Θ = ${theta.toFixed(2)}`;
      diagnosticEl.className = 'm4-diagnostic is-breached';
      diagnosticEl.textContent = `零点 ρ${domIdx + 1} 已偏离临界线（σ = ${domPin.sigma.toFixed(2)}，对称点 ${(1 - domPin.sigma).toFixed(2)}），主导指数 Θ 增至 ${theta.toFixed(2)}；继续增大偏移量将在 x ≤ 500 内突破参考界。`;
    } else {
      statusBadge.className = 'mono status-badge is-bounded';
      statusBadge.textContent = '界内 · σ = 1/2';
      diagnosticEl.className = 'm4-diagnostic';
      diagnosticEl.textContent = '全部 6 个可调零点均满足 Re(ρ) = 0.50，主导指数 Θ = 0.50 处于最小值，误差曲线位于 ±(0.60 + 0.72√x / ln x) 参考界内部。';
    }

    drawStrip();
    drawError();
  }

  function drawStrip() {
    const { ctx, w, h } = setupCanvas(stripCanvas);
    const padL = 42;
    const padR = 16;
    const padT = 26;
    const padB = 32;
    const plotW = Math.max(100, w - padL - padR);
    const plotH = Math.max(120, h - padT - padB);
    stripBox = { padL, padR, padT, padB, plotW, plotH };

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    // Subtle critical strip shading
    ctx.fillStyle = 'rgba(246, 248, 251, 0.75)';
    ctx.fillRect(padL, padT, plotW, plotH);

    // Horizontal grid lines for t
    ctx.font = `600 10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let tv = 15; tv <= 40; tv += 5) {
      const py = toPixel(0, tv).y;
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(padL + plotW, py);
      ctx.stroke();
      ctx.fillText(String(tv), padL - 6, py);
    }

    // Vertical grid lines & critical line σ = 1/2
    const xTicks = [
      { v: 0, label: '0' },
      { v: 0.25, label: '0.25' },
      { v: 0.5, label: '1/2' },
      { v: 0.75, label: '0.75' },
      { v: 1, label: '1' },
    ];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    xTicks.forEach(({ v, label }) => {
      const px = padL + v * plotW;
      ctx.strokeStyle = v === 0.5 ? COLORS.blue : COLORS.grid;
      ctx.lineWidth = v === 0.5 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();

      ctx.fillStyle = v === 0.5 ? COLORS.blue : COLORS.muted;
      ctx.font = v === 0.5 ? `700 11px ${FONT_MONO}` : `600 10px ${FONT_MONO}`;
      ctx.fillText(label, px, padT + plotH + 7);
    });

    // Top axis labels
    ctx.font = `700 10.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Im(s) = t ↑', 6, 6);

    const midX = padL + 0.5 * plotW;
    ctx.fillStyle = COLORS.blue;
    ctx.textAlign = 'center';
    ctx.fillText('Re(s) = 1/2', midX, 6);

    // Draw symmetric partners 1 - conj(rho) first
    state.pins.forEach((pin) => {
      if (Math.abs(pin.sigma - 0.5) >= 0.015) {
        const pMain = toPixel(pin.sigma, pin.gamma);
        const symSigma = 1 - pin.sigma;
        const pSym = toPixel(symSigma, pin.gamma);

        ctx.save();
        ctx.strokeStyle = COLORS.red;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(pMain.x, pMain.y);
        ctx.lineTo(pSym.x, pSym.y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(254, 242, 242, 0.9)';
        ctx.beginPath();
        ctx.arc(pSym.x, pSym.y, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();

        const symTag = `1−σ=${symSigma.toFixed(2)}`;
        ctx.font = `700 10px ${FONT_MONO}`;
        const tw = ctx.measureText(symTag).width + 10;
        let tx = pSym.x - tw / 2;
        tx = Math.max(padL + 3, Math.min(padL + plotW - tw - 3, tx));
        let ty = pSym.y + 13;
        if (ty + 18 > padT + plotH - 3) ty = pSym.y - 31;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        drawRoundedRect(ctx, tx, ty, tw, 18, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = COLORS.red;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symTag, tx + tw / 2, ty + 9.5);
      }
    });

    // Draw 6 draggable zeros
    state.pins.forEach((pin, idx) => {
      const pos = toPixel(pin.sigma, pin.gamma);
      const isSelected = idx === state.selectedPin;
      const isOff = Math.abs(pin.sigma - 0.5) >= 0.015;

      if (isSelected) {
        ctx.fillStyle = isOff ? 'rgba(220, 38, 38, 0.16)' : 'rgba(29, 78, 216, 0.16)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 15.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = isOff ? COLORS.red : COLORS.blue;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.surface;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 9.5px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ρ${idx + 1}`, pos.x, pos.y + 0.5);
    });

    // Subtle drag prompt before first move
    if (!state.hasInteracted) {
      const p0 = toPixel(state.pins[0].sigma, state.pins[0].gamma);
      const hint = '← 左右拖动 ρ₁ 检验对称性';
      ctx.font = `600 10.5px ${FONT_SANS}`;
      const hw = ctx.measureText(hint).width + 14;
      const hx = Math.min(padL + plotW - hw - 6, p0.x + 16);
      const hy = p0.y - 11;
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      drawRoundedRect(ctx, hx, hy, hw, 22, 5);
      ctx.fill();
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hint, hx + hw / 2, hy + 11.5);
    }

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }

  function drawError() {
    const { ctx, w, h } = setupCanvas(errorCanvas);
    const padL = 42;
    const padR = 16;
    const padT = 16;
    const padB = 30;
    const plotW = Math.max(100, w - padL - padR);
    const plotH = Math.max(100, h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMin = 2;
    const xMax = 500;
    const yBound = 6.5;

    const toX = (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = (y) => padT + plotH / 2 - (y / yBound) * (plotH / 2);

    // Grid
    ctx.font = `600 10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [-6, -3, 0, 3, 6].forEach((yv) => {
      const yy = toY(yv);
      ctx.strokeStyle = yv === 0 ? '#CBD5E1' : COLORS.grid;
      ctx.lineWidth = yv === 0 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(formatTick(yv), padL - 6, yy);
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [2, 100, 200, 300, 400, 500].forEach((xv) => {
      ctx.fillText(String(xv), toX(xv), padT + plotH + 7);
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    // Teal hatched reference bound ±railVals
    const pat = ctx.createPattern(hatch, 'repeat');
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(cache.railVals[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    for (let i = cache.xs.length - 1; i >= 0; i--) {
      ctx.lineTo(toX(cache.xs[i]), toY(-cache.railVals[i]));
    }
    ctx.closePath();
    ctx.fillStyle = pat || COLORS.tintTeal;
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = COLORS.teal;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    for (const sign of [1, -1]) {
      ctx.beginPath();
      for (let i = 0; i < cache.xs.length; i++) {
        const px = toX(cache.xs[i]);
        const py = toY(sign * cache.railVals[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Real pi(x) - R(x)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(cache.piDiffVals[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Simulated explicit error
    ctx.strokeStyle = result.breached ? COLORS.red : COLORS.blue;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(result.totalDiff[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Peak breach marker
    if (result.breached && result.breachedX !== null) {
      let peakIdx = 0;
      let bestR = 0;
      for (let i = 0; i < cache.xs.length; i++) {
        const r = Math.abs(result.totalDiff[i]) / cache.railVals[i];
        if (r > bestR) {
          bestR = r;
          peakIdx = i;
        }
      }
      const bx = toX(cache.xs[peakIdx]);
      const rawV = result.totalDiff[peakIdx];
      const clampedV = Math.max(-yBound + 0.55, Math.min(yBound - 0.55, rawV));
      const by = toY(clampedV);

      ctx.fillStyle = COLORS.red;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const tag = `突破 σ=1/2 参考界 (${result.maxRatio.toFixed(2)}×)`;
      ctx.font = `700 10.5px ${FONT_SANS}`;
      const tw = ctx.measureText(tag).width + 14;
      let tx = bx - tw / 2;
      tx = Math.max(padL + 6, Math.min(padL + plotW - tw - 6, tx));
      let ty = rawV >= 0 ? by + 10 : by - 32;
      ty = Math.max(padT + 6, Math.min(padT + plotH - 28, ty));

      ctx.fillStyle = COLORS.red;
      drawRoundedRect(ctx, tx, ty, tw, 22, 5);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, tx + tw / 2, ty + 11.5);
    }

    ctx.restore();

    // Bound label top-right
    ctx.font = `600 10px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.teal;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('±(0.60 + 0.72√x / ln x)', padL + plotW - 6, padT + 4);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }

  // Pointer Capture 2D Dragging
  stripCanvas.addEventListener('pointerdown', (e) => {
    const rect = stripCanvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const hitR = e.pointerType === 'touch' ? 34 : 26;

    let bestIdx = -1;
    let bestD = Infinity;
    state.pins.forEach((pin, idx) => {
      const pos = toPixel(pin.sigma, pin.gamma);
      const d = Math.hypot(lx - pos.x, ly - pos.y);
      if (d <= hitR && d < bestD) {
        bestD = d;
        bestIdx = idx;
      }
    });

    if (bestIdx === -1) bestIdx = state.selectedPin;
    state.selectedPin = bestIdx;
    state.draggingPin = bestIdx;
    state.hasInteracted = true;
    stripCanvas.classList.add('is-dragging');
    if (stripCanvas.setPointerCapture) {
      try {
        stripCanvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic event without active pointer
      }
    }

    const coords = toCoords(lx, ly);
    state.pins[bestIdx].sigma = coords.sigma;
    state.pins[bestIdx].gamma = coords.gamma;
    updateAll();
  });

  stripCanvas.addEventListener('pointermove', (e) => {
    if (state.draggingPin < 0) return;
    const rect = stripCanvas.getBoundingClientRect();
    const coords = toCoords(e.clientX - rect.left, e.clientY - rect.top);
    state.pins[state.draggingPin].sigma = coords.sigma;
    state.pins[state.draggingPin].gamma = coords.gamma;
    updateAll();
  });

  const endDrag = (e) => {
    if (state.draggingPin < 0) return;
    state.draggingPin = -1;
    stripCanvas.classList.remove('is-dragging');
    if (stripCanvas.releasePointerCapture && e && e.pointerId !== undefined) {
      try {
        stripCanvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
  };
  stripCanvas.addEventListener('pointerup', endDrag);
  stripCanvas.addEventListener('pointercancel', endDrag);

  pinButtonsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-pin]');
    if (!btn) return;
    state.selectedPin = Number(btn.dataset.pin);
    updateAll();
  });

  sigmaSlider.addEventListener('input', () => {
    state.hasInteracted = true;
    let v = Number(sigmaSlider.value);
    if (Math.abs(v - 0.5) < 0.025) v = 0.5;
    state.pins[state.selectedPin].sigma = v;
    updateAll();
  });

  gammaSlider.addEventListener('input', () => {
    state.hasInteracted = true;
    state.pins[state.selectedPin].gamma = Number(gammaSlider.value);
    updateAll();
  });

  testRightBtn.addEventListener('click', () => {
    state.hasInteracted = true;
    state.pins[state.selectedPin].sigma = 0.85;
    updateAll();
    announce(`已将 ρ${state.selectedPin + 1} 设为 σ = 0.85，误差曲线突破 σ = 1/2 参考界`);
  });

  testLeftBtn.addEventListener('click', () => {
    state.hasInteracted = true;
    state.pins[state.selectedPin].sigma = 0.15;
    updateAll();
    announce(`已将 ρ${state.selectedPin + 1} 设为 σ = 0.15，对称零点位于 0.85，误差曲线同样突破参考界`);
  });

  testResetBtn.addEventListener('click', () => {
    state.pins = defaultPins();
    updateAll();
    announce('已将全部 6 个零点重置到临界线 σ = 0.50');
  });

  const ro = new ResizeObserver(() => {
    drawStrip();
    drawError();
  });
  ro.observe(stripCanvas.parentElement);
  ro.observe(errorCanvas.parentElement);

  updateAll();
}

initScrollSpy();
initModule1();
initModule2();
initModule3();
initModule4();
