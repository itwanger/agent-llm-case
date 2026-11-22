import {
  ZETA_ZEROS,
  IS_PRIME,
  PRIMES_UP_TO_30,
  piExact,
  riemannR,
  getFactorPairs,
  createChapter3Cache,
  createChapter4Cache,
} from './math.js';

import {
  isSoundEnabled,
  setSoundEnabled,
  playZeroTone,
  playUiFeedback,
} from './audio.js';

const COLORS = {
  surface: '#FFFFFF',
  bgStudio: '#FAF9F5',
  surfaceAlt: '#F2F4F8',
  ink: '#141C2B',
  muted: '#475569',
  grid: '#E2E8F0',
  cobalt: '#1D4ED8',
  cobaltSoft: '#60A5FA',
  coral: '#D93821',
  marigold: '#E09600',
  marigoldText: '#8F5C00',
  emerald: '#0C8568',
  tintEmerald: 'rgba(12, 133, 104, 0.13)',
  tintCoral: 'rgba(217, 56, 33, 0.14)',
  tintCobalt: 'rgba(29, 78, 216, 0.12)',
  tintMarigold: 'rgba(224, 150, 0, 0.20)',
};

const FONT_SANS = '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
const FONT_MONO = '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function syncSliderStyle(input) {
  if (!input) return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const val = Number(input.value || 0);
  input.style.setProperty('--attr-min', String(min));
  input.style.setProperty('--attr-max', String(max));
  input.style.setProperty('--control-value', String(val));
}

let announceTimer = null;
const liveAnnouncer = document.getElementById('live-announcer');
function announce(text) {
  if (!liveAnnouncer) return;
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    liveAnnouncer.textContent = text;
  }, 160);
}

function setupCanvas(canvas) {
  const parent = canvas.parentElement;
  const w = Math.max(240, Math.round(parent ? parent.clientWidth : canvas.clientWidth || 600));
  const h = Math.max(100, Math.round(parent ? parent.clientHeight : canvas.clientHeight || 280));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(w * dpr);
  const targetH = Math.round(h * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function niceAxisScale(rawMax, targetTicks = 5) {
  const safeMax = Math.max(4, rawMax);
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200];
  let step = candidates[candidates.length - 1];
  for (const c of candidates) {
    if (safeMax / c <= targetTicks + 1.1) {
      step = c;
      break;
    }
  }
  const yMax = Math.ceil(safeMax / step) * step;
  const ticks = [];
  for (let v = 0; v <= yMax; v += step) {
    ticks.push(v);
  }
  return { yMax, step, ticks };
}

/* =========================================================
   PROGRESS MAP & GLOBAL SOUND SWITCH SYNC
   ========================================================= */
const navPills = new Map();
document.querySelectorAll('.nav-pill[data-chapter]').forEach((el) => {
  navPills.set(el.dataset.chapter, el);
});

function markChapterVisited(chapterId) {
  const pill = navPills.get(chapterId);
  if (pill) pill.classList.add('is-visited');
}

function initScrollSpy() {
  const sections = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!('IntersectionObserver' in window) || sections.length === 0) return;

  const setCurrent = (id) => {
    navPills.forEach((pill, key) => {
      pill.classList.toggle('is-current', key === id);
      if (key === id) {
        pill.setAttribute('aria-current', 'location');
      } else {
        pill.removeAttribute('aria-current');
      }
    });
  };

  setCurrent('ch1');

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length > 0) {
        setCurrent(visible[0].target.id);
      }
    },
    { rootMargin: '-18% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] }
  );

  sections.forEach((sec) => observer.observe(sec));
}

const soundSwitches = [
  document.getElementById('header-sound-switch'),
  document.getElementById('ch3-sound-switch'),
].filter(Boolean);

function updateSoundSwitchUI(enabled) {
  soundSwitches.forEach((btn) => {
    btn.setAttribute('aria-checked', enabled ? 'true' : 'false');
  });
}

soundSwitches.forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    updateSoundSwitchUI(next);
    if (next) {
      playZeroTone(ZETA_ZEROS[0]);
      announce('柔和木琴音效已开启');
    } else {
      announce('柔和木琴音效已关闭');
    }
  });
});

/* =========================================================
   CHAPTER 1: WOODEN BLOCKS + 2-30 SIEVE TRAY
   ========================================================= */
function initChapter1() {
  const readoutEl = document.getElementById('ch1-readout');
  const rowButtonsWrap = document.getElementById('ch1-row-buttons');
  const autoTestBtn = document.getElementById('ch1-auto-test');
  const stampEl = document.getElementById('ch1-stamp');
  const altHintEl = document.getElementById('ch1-alt-hint');
  const stageEl = document.getElementById('ch1-stage');
  const sieveGridEl = document.getElementById('ch1-sieve-grid');
  const sieveCountEl = document.getElementById('ch1-sieve-count');
  const sieveResetBtn = document.getElementById('ch1-sieve-reset');
  const sieveNoteEl = document.getElementById('ch1-sieve-note');
  const noteTextEl = document.getElementById('ch1-note-text');
  const stampBtns = Array.from(document.querySelectorAll('.stamp-btn[data-sieve]'));

  const state = {
    n: 7,
    rows: 2,
    confirmedPrimeN: null,
    discoveredPrimes: new Set(),
    stampedFactors: new Set(),
    autoTimer: null,
  };

  function stopAutoTest() {
    if (state.autoTimer !== null) {
      clearTimeout(state.autoTimer);
      state.autoTimer = null;
    }
  }

  function buildSieveGrid() {
    sieveGridEl.innerHTML = '';
    for (let num = 1; num <= 30; num++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sieve-tile';
      btn.dataset.num = String(num);
      if (num === 1) {
        btn.classList.add('is-one');
        btn.disabled = true;
        btn.innerHTML = '<span>1</span><span class="tile-sub">不算</span>';
      } else {
        btn.innerHTML = `<span class="tile-num">${num}</span><span class="tile-sub"></span>`;
        btn.addEventListener('click', () => {
          stopAutoTest();
          state.n = num;
          state.confirmedPrimeN = null;
          state.rows = num === 2 ? 1 : 2;
          markChapterVisited('ch1');
          renderAll();
          if (IS_PRIME[num] === 1 && num === 2) {
            playUiFeedback('prime');
          } else if (num % state.rows === 0 && state.rows > 1) {
            playUiFeedback('composite');
          }
        });
      }
      sieveGridEl.appendChild(btn);
    }
  }

  function getStampedFactor(num) {
    for (const p of [2, 3, 5]) {
      if (state.stampedFactors.has(p) && num > p && num % p === 0) {
        return p;
      }
    }
    return null;
  }

  function renderSieve() {
    const allThreeStamped =
      state.stampedFactors.has(2) &&
      state.stampedFactors.has(3) &&
      state.stampedFactors.has(5);

    let crossedCount = 0;
    const tiles = sieveGridEl.querySelectorAll('.sieve-tile[data-num]');
    tiles.forEach((tile) => {
      const num = Number(tile.dataset.num);
      if (num === 1) return;
      const factor = getStampedFactor(num);
      const isStamped = factor !== null;
      if (isStamped) crossedCount++;

      const showPrimeStar =
        IS_PRIME[num] === 1 && (state.discoveredPrimes.has(num) || allThreeStamped);

      tile.classList.toggle('is-selected', num === state.n);
      tile.classList.toggle('is-stamped', isStamped);
      tile.classList.toggle('is-prime-marked', showPrimeStar && !isStamped);
      tile.setAttribute('aria-pressed', num === state.n ? 'true' : 'false');

      const subEl = tile.querySelector('.tile-sub');
      if (subEl) {
        subEl.textContent = isStamped ? `×${factor}` : showPrimeStar ? '质数' : '';
      }

      const existingStar = tile.querySelector('.prime-star');
      if (showPrimeStar && !existingStar) {
        const star = document.createElement('span');
        star.className = 'prime-star';
        star.setAttribute('aria-hidden', 'true');
        star.textContent = '★';
        tile.appendChild(star);
      } else if (!showPrimeStar && existingStar) {
        existingStar.remove();
      }
    });

    sieveCountEl.textContent = allThreeStamped
      ? '已筛出质数：10 / 10'
      : `已盖掉合数：${crossedCount} / 19`;
    sieveNoteEl.hidden = !allThreeStamped;

    stampBtns.forEach((btn) => {
      const p = Number(btn.dataset.sieve);
      const on = state.stampedFactors.has(p);
      btn.classList.toggle('is-stamped-on', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function renderStage() {
    const { n, rows } = state;
    const isPrime = IS_PRIME[n] === 1;
    const cols = Math.floor(n / rows);
    const rem = n % rows;
    const isExactRect = rows > 1 && rem === 0;
    const isConfirmedPrime = isPrime && (state.confirmedPrimeN === n || n === 2);

    readoutEl.textContent = `当前数字：${n} · 试排 ${rows} 行`;

    // Row buttons state
    rowButtonsWrap.querySelectorAll('button[data-rows]').forEach((btn) => {
      const r = Number(btn.dataset.rows);
      const disabled = r > 1 && r >= n;
      btn.disabled = disabled;
      btn.classList.toggle('is-active', r === rows);
    });

    // Stamp & alternative factor hints
    const pairs = getFactorPairs(n);
    altHintEl.textContent = '';

    if (isExactRect) {
      stampEl.className = 'status-stamp stamp-emerald';
      stampEl.textContent = `✓ 排整齐了！${n} = ${rows} × ${cols}（合数）`;

      // Prioritize a genuinely different factor pair first (e.g. 12: 2×6 -> 3×4),
      // falling back to transpose (e.g. 6: 2×3 -> 3×2) only when there is 1 pair.
      const distinctPairOpts = [];
      const transposeOpts = [];
      pairs.forEach(([a, b]) => {
        if (a !== rows && b !== rows) {
          if (a <= 6) distinctPairOpts.push(`${a} × ${b}`);
          else if (b <= 6) distinctPairOpts.push(`${b} × ${a}`);
        } else {
          if (a !== rows && a <= 6) transposeOpts.push(`${a} × ${b}`);
          if (b !== a && b !== rows && b <= 6) transposeOpts.push(`${b} × ${a}`);
        }
      });
      const altOptions = distinctPairOpts.length > 0 ? distinctPairOpts : transposeOpts;
      if (altOptions.length > 0) {
        altHintEl.textContent = `${n} 还能排成 ${altOptions[0]}，点上面换个行数看看。`;
      } else {
        altHintEl.textContent = `合数可以拆成多行多列的整齐队列。`;
      }
      noteTextEl.textContent = `${n} 可以排成 ${rows} 行 × ${cols} 列，没有零头，所以它是合数。再点寻宝盘里的 7、11、13、17 试一试，看看哪些数怎么排都会多出零头。`;
    } else if (rows === 1) {
      if (isConfirmedPrime) {
        stampEl.className = 'status-stamp stamp-coral';
        stampEl.textContent = `★ 拆不散！${n} 是质数，只能排成 1 × ${n}`;
        altHintEl.textContent = n === 2
          ? '2 是最小的质数，也是唯一的偶质数。'
          : '2 行、3 行……全部试过了，每次都会多出零头。';
        noteTextEl.textContent = `2、3、5、7、11、13……这些“拆不散的积木”藏在所有数字里。它们什么时候冒出来，看起来毫无规律。下一关，我们把它们叠成楼梯看看。`;
      } else {
        stampEl.className = 'status-stamp stamp-cobalt';
        stampEl.textContent = `排成 1 长排（1 × ${n}），任何数都能这样排`;
        altHintEl.textContent = '试试点上面的 2 行、3 行，或点“自动全部试一遍”。';
      }
    } else {
      stampEl.className = 'status-stamp stamp-coral';
      stampEl.textContent = `排成 ${rows} 行，每行 ${cols} 块，还多出 ${rem} 块！再换别的行数试试`;
      altHintEl.textContent = isPrime
        ? '提示：点一下“自动全部试一遍”，验证它是不是拆不散的质数。'
        : `别灰心，${n} 换个行数就能排整齐，试试别的行数吧！`;
      noteTextEl.textContent = `2、3、5、7、11、13……这些“拆不散的积木”藏在所有数字里。它们什么时候冒出来，看起来毫无规律。下一关，我们把它们叠成楼梯看看。`;
    }

    // Build tactile wooden blocks inside stageEl
    stageEl.innerHTML = '';

    // Adaptive block size so up to 30 blocks fit cleanly without horizontal overflow
    let blkPx = 42;
    let fontRem = 0.92;
    if (rows === 1) {
      blkPx = n <= 8 ? 42 : n <= 16 ? 34 : 30;
      fontRem = n <= 8 ? 0.92 : 0.78;
    } else {
      if (cols >= 12) {
        blkPx = 24;
        fontRem = 0.68;
      } else if (cols >= 8) {
        blkPx = 31;
        fontRem = 0.78;
      } else if (cols >= 6) {
        blkPx = 36;
        fontRem = 0.85;
      }
    }

    const rectFrame = document.createElement('div');
    rectFrame.className = 'block-rect-frame';
    rectFrame.style.setProperty('--blk-size', `${blkPx}px`);
    rectFrame.style.setProperty('--blk-font', `${fontRem}rem`);

    if (rows === 1) {
      rectFrame.classList.add('is-single');
      const colsInRow = Math.min(n, 10);
      rectFrame.style.gridTemplateColumns = `repeat(${colsInRow}, var(--blk-size))`;
      for (let i = 1; i <= n; i++) {
        const blk = document.createElement('div');
        blk.className = `wood-block ${isConfirmedPrime ? 'is-prime-row' : 'is-aligned'}`;
        blk.textContent = String(i);
        rectFrame.appendChild(blk);
      }
      stageEl.appendChild(rectFrame);
    } else {
      if (isExactRect) rectFrame.classList.add('is-composite');
      rectFrame.style.gridTemplateColumns = `repeat(${cols}, var(--blk-size))`;
      const mainCount = rows * cols;
      for (let i = 1; i <= mainCount; i++) {
        const blk = document.createElement('div');
        blk.className = `wood-block ${isExactRect ? 'is-composite' : 'is-aligned'}`;
        blk.textContent = String(i);
        rectFrame.appendChild(blk);
      }
      stageEl.appendChild(rectFrame);

      if (rem > 0) {
        const strayZone = document.createElement('div');
        strayZone.className = 'block-stray-zone';
        strayZone.style.setProperty('--blk-size', `${blkPx}px`);
        strayZone.style.setProperty('--blk-font', `${fontRem}rem`);

        const lbl = document.createElement('span');
        lbl.className = 'stray-label';
        lbl.textContent = `+${rem} 零头`;
        strayZone.appendChild(lbl);

        const stack = document.createElement('div');
        stack.className = 'stray-stack';
        for (let i = mainCount + 1; i <= n; i++) {
          const blk = document.createElement('div');
          blk.className = 'wood-block is-stray';
          blk.textContent = String(i);
          stack.appendChild(blk);
        }
        strayZone.appendChild(stack);
        stageEl.appendChild(strayZone);
      }
    }
  }

  function renderAll() {
    renderStage();
    renderSieve();
  }

  rowButtonsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-rows]');
    if (!btn || btn.disabled) return;
    stopAutoTest();
    state.rows = Number(btn.dataset.rows);
    state.confirmedPrimeN = null;
    markChapterVisited('ch1');
    renderAll();
    if (state.rows > 1 && state.n % state.rows === 0) {
      playUiFeedback('composite');
    }
  });

  autoTestBtn.addEventListener('click', () => {
    stopAutoTest();
    markChapterVisited('ch1');
    const n = state.n;
    if (n === 2) {
      state.rows = 1;
      state.confirmedPrimeN = 2;
      state.discoveredPrimes.add(2);
      renderAll();
      playUiFeedback('prime');
      return;
    }

    const maxTry = Math.min(6, Math.max(2, Math.floor(Math.sqrt(n))));
    const tryRows = [];
    for (let r = 2; r <= maxTry; r++) {
      if (r < n) tryRows.push(r);
    }

    if (prefersReducedMotion()) {
      const factor = tryRows.find((r) => n % r === 0);
      if (factor) {
        state.rows = factor;
        state.confirmedPrimeN = null;
        renderAll();
        playUiFeedback('composite');
      } else {
        state.rows = 1;
        state.confirmedPrimeN = n;
        state.discoveredPrimes.add(n);
        renderAll();
        playUiFeedback('prime');
      }
      return;
    }

    let stepIdx = 0;
    const runStep = () => {
      if (stepIdx >= tryRows.length) {
        state.rows = 1;
        state.confirmedPrimeN = n;
        state.discoveredPrimes.add(n);
        state.autoTimer = null;
        renderAll();
        playUiFeedback('prime');
        announce(`${n} 是拆不散的质数，只能排成 1 行`);
        return;
      }
      const r = tryRows[stepIdx];
      state.rows = r;
      state.confirmedPrimeN = null;
      renderAll();
      if (n % r === 0) {
        state.autoTimer = null;
        playUiFeedback('composite');
        announce(`${n} 排整齐了，等于 ${r} 乘 ${n / r}，是合数`);
        return;
      }
      stepIdx++;
      state.autoTimer = setTimeout(runStep, 430);
    };
    runStep();
  });

  stampBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.sieve);
      if (state.stampedFactors.has(p)) {
        state.stampedFactors.delete(p);
      } else {
        state.stampedFactors.add(p);
        playUiFeedback('stamp');
      }
      markChapterVisited('ch1');
      renderSieve();
      if (
        state.stampedFactors.has(2) &&
        state.stampedFactors.has(3) &&
        state.stampedFactors.has(5)
      ) {
        announce('三步筛选完成，30 以内共有 10 个质数');
      }
    });
  });

  sieveResetBtn.addEventListener('click', () => {
    state.stampedFactors.clear();
    renderSieve();
    playUiFeedback('reset');
  });

  buildSieveGrid();
  renderAll();
}

/* =========================================================
   CHAPTER 2: PRIME STAIRCASE vs SMOOTH SLIDE R(x)
   ========================================================= */
function initChapter2() {
  const canvas = document.getElementById('ch2-canvas');
  const zoomPresetsEl = document.getElementById('ch2-zoom-presets');
  const zoomSlider = document.getElementById('ch2-zoom-slider');
  const zoomValEl = document.getElementById('ch2-zoom-val');
  const probeSlider = document.getElementById('ch2-probe-slider');
  const probeValEl = document.getElementById('ch2-probe-val');
  const slideSwitch = document.getElementById('ch2-slide-switch');

  const outX = document.getElementById('ch2-probe-x');
  const outPi = document.getElementById('ch2-probe-pi');
  const outR = document.getElementById('ch2-probe-r');
  const outDiff = document.getElementById('ch2-probe-diff');
  const captionEl = document.getElementById('ch2-caption');
  const noteEl = document.getElementById('ch2-note-text');

  const state = {
    xMax: 30,
    probeX: 23,
    showSlide: true,
    dragging: false,
  };

  const sliderToXMax = (v) => Math.round(20 * Math.pow(100, v / 1000));
  const xMaxToSlider = (x) => Math.round((1000 * Math.log(x / 20)) / Math.log(100));

  function updateReadouts() {
    const px = Math.max(2, Math.min(state.xMax, Math.round(state.probeX)));
    state.probeX = px;

    const piVal = piExact(px);
    const rVal = riemannR(px);
    const diff = Math.abs(piVal - rVal);

    outX.textContent = String(px);
    outPi.textContent = String(piVal);
    outR.textContent = rVal.toFixed(1);
    outDiff.textContent = diff.toFixed(1);

    zoomValEl.textContent = `1 – ${state.xMax}`;
    probeValEl.textContent = `x = ${px}`;

    probeSlider.max = String(state.xMax);
    probeSlider.value = String(px);
    probeSlider.setAttribute('aria-valuetext', `位置 x = ${px}，共有 ${piVal} 个质数`);
    syncSliderStyle(probeSlider);

    zoomSlider.value = String(xMaxToSlider(state.xMax));
    zoomSlider.setAttribute('aria-valuetext', `当前视野 1 到 ${state.xMax}`);
    syncSliderStyle(zoomSlider);

    zoomPresetsEl.querySelectorAll('button[data-xmax]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.xmax) === state.xMax);
    });

    captionEl.textContent = `黑色实线为真实质数楼梯 π(x)，钴蓝色虚线为黎曼光滑滑梯 R(x)。当前视野 1–${state.xMax}，在 x = ${px} 处共有 ${piVal} 个质数，蓝色滑梯预测 ${rVal.toFixed(1)} 级。`;

    if (state.xMax <= 40) {
      noteEl.textContent = '凑近看，质数楼梯走得忽快忽慢：11 和 13 刚连爬两级，23 到 29 之间却平平地空了 5 格。试着点上面的“拉远 1–500”看看！';
    } else if (state.xMax <= 250) {
      noteEl.textContent = '拉远一点后，那些参差不齐的台阶，开始沿着蓝色光滑滑梯稳稳往上爬。再点“高空 1–2000”试试！';
    } else {
      noteEl.textContent = '从高空看，质数楼梯和蓝色滑梯几乎贴在了一起！可仔细看，楼梯还是在滑梯上下微微起伏。是什么在推动这些起伏？下一关揭晓！';
    }
  }

  let plotMetrics = { padL: 52, padR: 20, padT: 26, padB: 38, plotW: 600, plotH: 300 };

  function draw() {
    const { ctx, w, h } = setupCanvas(canvas);
    const padL = w < 440 ? 42 : 54;
    const padR = 18;
    const padT = 26;
    const padB = 38;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(80, h - padT - padB);
    plotMetrics = { padL, padR, padT, padB, plotW, plotH };

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMax = state.xMax;
    const rawYMax = Math.max(11, Math.max(piExact(xMax), riemannR(xMax)) * 1.12);
    const { yMax, ticks: yTickList } = niceAxisScale(rawYMax, w < 440 ? 4 : 5);

    const toX = (x) => padL + ((x - 1) / (xMax - 1)) * plotW;
    const toY = (y) => padT + plotH - (y / yMax) * plotH;

    // Grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = `600 11px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yTickList.forEach((val) => {
      const yy = toY(val);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(String(val), padL - 8, yy);
    });

    const xTickCount = w < 440 ? 4 : 6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= xTickCount; i++) {
      const xv = Math.round(1 + ((xMax - 1) * i) / xTickCount);
      const xx = toX(xv);
      ctx.beginPath();
      ctx.moveTo(xx, padT);
      ctx.lineTo(xx, padT + plotH);
      ctx.stroke();
      ctx.fillText(String(xv), xx, padT + plotH + 8);
    }

    // Axes border
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    // Axis titles
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 11px ${FONT_SANS}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('质数个数 π(x)', padL + 6, 6);
    ctx.textAlign = 'right';
    ctx.fillText('数字 x →', padL + plotW, padT + plotH + 22);

    // Smooth Riemann slide R(x)
    if (state.showSlide) {
      ctx.save();
      ctx.strokeStyle = COLORS.cobalt;
      ctx.lineWidth = 2.6;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      const samples = 240;
      for (let i = 0; i <= samples; i++) {
        const xv = 1.01 + ((xMax - 1.01) * i) / samples;
        const px = toX(xv);
        const py = toY(riemannR(xv));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Real prime staircase pi(x)
    ctx.save();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = xMax <= 120 ? 2.5 : 1.9;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(toX(1), toY(0));
    let prevPi = 0;
    for (let n = 2; n <= xMax; n++) {
      const currPi = piExact(n);
      if (currPi !== prevPi) {
        const xn = toX(n);
        ctx.lineTo(xn, toY(prevPi));
        ctx.lineTo(xn, toY(currPi));
        prevPi = currPi;
      }
    }
    ctx.lineTo(toX(xMax), toY(prevPi));
    ctx.stroke();
    ctx.restore();

    // Up-close coral dots & prime number labels
    if (xMax <= 45) {
      ctx.font = w < 440 ? `700 10px ${FONT_MONO}` : `700 11px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      let lastLabelX = -999;
      for (let n = 2; n <= xMax; n++) {
        if (IS_PRIME[n] === 1) {
          const xn = toX(n);
          const yn = toY(piExact(n));
          ctx.fillStyle = COLORS.coral;
          ctx.beginPath();
          ctx.arc(xn, yn, w < 440 ? 3.5 : 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = COLORS.ink;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          const minGap = w < 440 ? 17 : 12;
          if (xn - lastLabelX >= minGap) {
            ctx.fillStyle = COLORS.coral;
            ctx.fillText(String(n), xn, yn - 6);
            lastLabelX = xn;
          }
        }
      }
    }

    // Legend top-left inside plot (compact single-row bar on narrow screens)
    const isNarrow = w < 460;
    const legX = padL + 8;
    const legY = padT + 6;
    const legW = isNarrow ? 168 : 254;
    const legH = isNarrow ? 22 : 28;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    drawRoundedRect(ctx, legX, legY, legW, legH, 7);
    ctx.fill();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.font = isNarrow ? `700 10px ${FONT_SANS}` : `700 11px ${FONT_SANS}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const legMidY = legY + legH / 2 + 0.5;
    // Staircase item
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(legX + 8, legMidY);
    ctx.lineTo(legX + (isNarrow ? 18 : 24), legMidY);
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(isNarrow ? '真楼梯 π(x)' : '真实楼梯 π(x)', legX + (isNarrow ? 22 : 29), legMidY);

    // Slide item
    const slideItemX = isNarrow ? legX + 88 : legX + 124;
    ctx.save();
    ctx.strokeStyle = COLORS.cobalt;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(slideItemX, legMidY);
    ctx.lineTo(slideItemX + (isNarrow ? 10 : 16), legMidY);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.cobalt;
    ctx.fillText(isNarrow ? '滑梯 R(x)' : '光滑滑梯 R(x)', slideItemX + (isNarrow ? 14 : 21), legMidY);

    // Probe crosshair & marker
    const px = toX(state.probeX);
    const pPi = piExact(state.probeX);
    const pR = riemannR(state.probeX);
    const yPi = toY(pPi);
    const yR = toY(pR);

    ctx.save();
    ctx.strokeStyle = COLORS.coral;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, padT);
    ctx.lineTo(px, padT + plotH);
    ctx.stroke();
    ctx.restore();

    if (state.showSlide) {
      ctx.fillStyle = COLORS.surface;
      ctx.strokeStyle = COLORS.cobalt;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, yR, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.coral;
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, yPi, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Floating probe card only on wider canvases (mobile uses the telemetry strip right above)
    if (!isNarrow) {
      const tipW = 148;
      const tipH = 56;
      let tipX = px + 12;
      if (tipX + tipW > padL + plotW - 4) tipX = px - tipW - 12;
      tipX = Math.max(padL + 6, tipX);
      let tipY = Math.min(yPi, yR) - tipH - 10;
      if (tipY < padT + legH + 14) tipY = Math.max(yPi, yR) + 12;
      if (tipY + tipH > padT + plotH - 6) tipY = padT + plotH - tipH - 8;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      drawRoundedRect(ctx, tipX, tipY, tipW, tipH, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `800 11.5px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.ink;
      ctx.fillText(`x = ${state.probeX}`, tipX + 9, tipY + 7);
      ctx.font = `700 11px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.coral;
      ctx.fillText(`真实楼梯：${pPi} 级`, tipX + 9, tipY + 23);
      ctx.fillStyle = COLORS.cobalt;
      ctx.fillText(`蓝色滑梯：${pR.toFixed(1)} 级`, tipX + 9, tipY + 38);
    }
  }

  function setXMax(newMax) {
    const ratio = state.probeX / state.xMax;
    state.xMax = Math.max(20, Math.min(2000, Math.round(newMax)));
    state.probeX = Math.max(2, Math.min(state.xMax, Math.round(ratio * state.xMax)));
    if (state.xMax === 30 && Math.abs(ratio - 23 / 30) < 0.05) state.probeX = 23;
    updateReadouts();
    draw();
  }

  function pointerToProbeX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const t = Math.max(0, Math.min(1, (localX - plotMetrics.padL) / plotMetrics.plotW));
    return Math.max(2, Math.min(state.xMax, Math.round(1 + t * (state.xMax - 1))));
  }

  zoomPresetsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-xmax]');
    if (!btn) return;
    markChapterVisited('ch2');
    const targetMax = Number(btn.dataset.xmax);
    state.xMax = targetMax;
    if (targetMax === 30) state.probeX = 23;
    else if (targetMax === 100) state.probeX = 67;
    else if (targetMax === 500) state.probeX = 350;
    else state.probeX = 1400;
    updateReadouts();
    draw();
  });

  zoomSlider.addEventListener('input', () => {
    markChapterVisited('ch2');
    setXMax(sliderToXMax(Number(zoomSlider.value)));
  });

  probeSlider.addEventListener('input', () => {
    markChapterVisited('ch2');
    state.probeX = Number(probeSlider.value);
    updateReadouts();
    draw();
  });

  slideSwitch.addEventListener('click', () => {
    state.showSlide = !state.showSlide;
    slideSwitch.setAttribute('aria-checked', state.showSlide ? 'true' : 'false');
    draw();
  });

  canvas.addEventListener('pointerdown', (e) => {
    state.dragging = true;
    markChapterVisited('ch2');
    state.probeX = pointerToProbeX(e.clientX);
    updateReadouts();
    draw();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || state.dragging) {
      const next = pointerToProbeX(e.clientX);
      if (next !== state.probeX) {
        state.probeX = next;
        updateReadouts();
        draw();
      }
    }
  });

  window.addEventListener('pointerup', () => {
    state.dragging = false;
  });

  const ro = new ResizeObserver(() => draw());
  ro.observe(canvas.parentElement);

  updateReadouts();
  draw();
}

/* =========================================================
   CHAPTER 3: ADDING RIEMANN WAVES (DEFAULTS TO K = 1)
   ========================================================= */
function initChapter3() {
  const cache = createChapter3Cache();

  const mainCanvas = document.getElementById('ch3-main-canvas');
  const soloCanvas = document.getElementById('ch3-solo-canvas');
  const playBtn = document.getElementById('ch3-play-btn');
  const presetsEl = document.getElementById('ch3-presets');
  const kSlider = document.getElementById('ch3-k-slider');
  const kValEl = document.getElementById('ch3-k-val');

  const kBadge = document.getElementById('ch3-k-badge');
  const gammaBadge = document.getElementById('ch3-gamma-badge');
  const fitBadge = document.getElementById('ch3-fit-badge');
  const fitFill = document.getElementById('ch3-fit-fill');

  const mainCaption = document.getElementById('ch3-main-caption');
  const soloTitle = document.getElementById('ch3-solo-title');
  const soloCaption = document.getElementById('ch3-solo-caption');
  const pegsWrap = document.getElementById('ch3-pegs');
  const noteEl = document.getElementById('ch3-note-text');

  const state = {
    K: 1,
    soloIdx: 0,
    playing: false,
    timer: null,
  };

  function buildPegs() {
    pegsWrap.innerHTML = '';
    const minG = ZETA_ZEROS[0];
    const maxG = ZETA_ZEROS[ZETA_ZEROS.length - 1];
    ZETA_ZEROS.forEach((gamma, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'peg-btn';
      btn.dataset.idx = String(idx);
      const pct = 34 + ((gamma - minG) / (maxG - minG)) * 66;
      btn.style.setProperty('--peg-h', `${pct.toFixed(1)}%`);
      btn.title = `第 ${idx + 1} 条波浪（t = ${gamma.toFixed(2)}）`;
      btn.setAttribute('aria-label', `单独查看第 ${idx + 1} 条波浪，音高刻度 t = ${gamma.toFixed(2)}`);
      btn.addEventListener('click', () => {
        state.soloIdx = idx;
        markChapterVisited('ch3');
        updateUI();
        drawSolo();
        playZeroTone(gamma);
      });
      pegsWrap.appendChild(btn);
    });
  }

  function stopPlayback() {
    if (state.timer !== null) {
      clearInterval(state.timer);
      state.timer = null;
    }
    state.playing = false;
    playBtn.textContent = '▶ 逐条叠加';
  }

  function updateUI() {
    const K = state.K;
    const fit = cache.fitScores[K];

    kSlider.value = String(K);
    kSlider.setAttribute('aria-valuetext', `已叠加 ${K} 条波浪，楼梯贴合度 ${fit}%`);
    syncSliderStyle(kSlider);

    kValEl.textContent = `${K} 条波浪`;
    kBadge.textContent = `${K} / 30`;
    gammaBadge.textContent = K === 0 ? '—' : `t = ${ZETA_ZEROS[K - 1].toFixed(2)}`;
    fitBadge.textContent = `${fit}%`;
    fitFill.style.inlineSize = `${fit}%`;

    presetsEl.querySelectorAll('button[data-k]').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.k) === K);
    });

    const soloGamma = ZETA_ZEROS[state.soloIdx];
    soloTitle.textContent = `单独看看第 ${state.soloIdx + 1} 条波浪（音高刻度 t = ${soloGamma.toFixed(2)}）— 刻度越大，波浪抖得越密`;
    soloCaption.textContent = `当前单独展示第 ${state.soloIdx + 1} 条波浪，音高刻度 t = ${soloGamma.toFixed(2)}。`;

    mainCaption.textContent = K === 0
      ? '细黑阶梯为真实质数楼梯 π(x)，淡蓝虚线为纯光滑滑梯 R(x)。当前尚未叠加任何波浪。'
      : `细黑阶梯为真实质数楼梯 π(x)，淡蓝虚线为纯光滑滑梯 R(x)，粗彩色实线为叠加前 ${K} 条波浪后的合成曲线（贴合度 ${fit}%）。`;

    pegsWrap.querySelectorAll('.peg-btn').forEach((btn) => {
      const idx = Number(btn.dataset.idx);
      btn.classList.toggle('is-included', idx < K);
      btn.classList.toggle('is-solo', idx === state.soloIdx);
    });

    if (K === 0) {
      noteEl.textContent = '现在一条波浪都没加，只是光溜溜的蓝色滑梯。点一下“▶ 逐条叠加”或向右拉滑块试试！';
    } else if (K < 10) {
      noteEl.textContent = `才加了 ${K} 条波浪，曲线已经开始在质数密集的地方往上拱了。继续向右加！`;
    } else if (K < 25) {
      noteEl.textContent = `叠加到 ${K} 条波浪后，台阶的棱角越来越清楚，11、13、17、19 这些质数位置已经被波浪推了出来。`;
    } else {
      noteEl.textContent = `${K} 条波浪叠在一起，滑梯几乎变成了真实的质数楼梯！每一条波浪背后都有一枚“指挥小圆点”（黎曼零点）。下一关，亲自去动一动这些小圆点！`;
    }
  }

  function drawMain() {
    const { ctx, w, h } = setupCanvas(mainCanvas);
    const padL = w < 440 ? 38 : 48;
    const padR = 18;
    const padT = 26;
    const padB = 34;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(80, h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMin = 2;
    const xMax = 32;
    const yMin = -0.2;
    const yMax = 11.4;

    const toX = (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = (y) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

    // Horizontal grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = `600 11px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let yv = 0; yv <= 10; yv += 2) {
      const yy = toY(yv);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(String(yv), padL - 8, yy);
    }

    // Vertical faint prime guidelines + bottom coral numbers
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    PRIMES_UP_TO_30.forEach((p) => {
      const px = toX(p);
      ctx.save();
      ctx.strokeStyle = 'rgba(217, 56, 33, 0.18)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();
      ctx.restore();

      // Avoid crowding 2 and 3 on very small screens
      if (w < 420 && p === 3) return;
      ctx.fillStyle = COLORS.coral;
      ctx.font = `700 10.5px ${FONT_MONO}`;
      ctx.fillText(String(p), px, padT + plotH + 8);
    });

    // Axes
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    // Reference staircase pi(x)
    ctx.save();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.8;
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
    ctx.restore();

    // Smooth slide R(x)
    ctx.save();
    ctx.strokeStyle = COLORS.cobaltSoft;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(cache.rVals[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Synthesized curve pi_K(x) (cache.prefixSums[K] already includes R(x))
    const synth = cache.prefixSums[state.K];
    ctx.save();
    ctx.strokeStyle = state.K >= 25 ? COLORS.emerald : COLORS.cobalt;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(synth[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Legend box top-left (compact single-row bar on mobile so it stays clear of 13/17 steps)
    const legX = padL + 6;
    const legY = padT + 5;
    const compact = w < 520;
    const legW = compact ? 198 : 352;
    const legH = compact ? 22 : 28;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    drawRoundedRect(ctx, legX, legY, legW, legH, 7);
    ctx.fill();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.font = compact ? `700 9.5px ${FONT_SANS}` : `700 11px ${FONT_SANS}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const legMidY = legY + legH / 2 + 0.5;

    // Item 1: real staircase
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX + 7, legMidY);
    ctx.lineTo(legX + (compact ? 16 : 23), legMidY);
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(compact ? '真楼梯' : '真实楼梯', legX + (compact ? 19 : 27), legMidY);

    // Item 2: smooth slide
    const i2x = compact ? legX + 58 : legX + 92;
    ctx.save();
    ctx.strokeStyle = COLORS.cobaltSoft;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(i2x, legMidY);
    ctx.lineTo(i2x + (compact ? 10 : 14), legMidY);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(compact ? '滑梯' : '纯滑梯', i2x + (compact ? 13 : 18), legMidY);

    // Item 3: wave synthesis
    const i3x = compact ? legX + 104 : legX + 168;
    ctx.strokeStyle = state.K >= 25 ? COLORS.emerald : COLORS.cobalt;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(i3x, legMidY);
    ctx.lineTo(i3x + (compact ? 11 : 16), legMidY);
    ctx.stroke();
    ctx.fillStyle = state.K >= 25 ? COLORS.emerald : COLORS.cobalt;
    ctx.fillText(compact ? `合成(+${state.K}波)` : `滑梯 + ${state.K} 条波浪`, i3x + (compact ? 14 : 21), legMidY);
  }

  function drawSolo() {
    const { ctx, w, h } = setupCanvas(soloCanvas);
    const padL = w < 440 ? 38 : 48;
    const padR = 18;
    const padT = 12;
    const padB = 18;
    const plotW = Math.max(80, w - padL - padR);
    const plotH = Math.max(40, h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const wave = cache.waves[state.soloIdx];
    let maxAbs = 0.28;
    for (let i = 0; i < wave.length; i++) {
      const a = Math.abs(wave[i]);
      if (a > maxAbs) maxAbs = a;
    }
    const yBound = maxAbs * 1.25;

    const toX = (x) => padL + ((x - 2) / 30) * plotW;
    const toY = (y) => padT + plotH / 2 - (y / yBound) * (plotH / 2);

    // Zero baseline
    const midY = toY(0);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(padL, midY);
    ctx.lineTo(padL + plotW, midY);
    ctx.stroke();

    // Soft prime ticks
    PRIMES_UP_TO_30.forEach((p) => {
      const px = toX(p);
      ctx.strokeStyle = 'rgba(217, 56, 33, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();
    });

    // Filled wave ribbon
    ctx.beginPath();
    ctx.moveTo(toX(cache.xs[0]), midY);
    for (let i = 0; i < cache.xs.length; i++) {
      ctx.lineTo(toX(cache.xs[i]), toY(wave[i]));
    }
    ctx.lineTo(toX(cache.xs[cache.xs.length - 1]), midY);
    ctx.closePath();
    ctx.fillStyle = COLORS.tintMarigold;
    ctx.fill();

    // Wave stroke
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(wave[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = COLORS.marigold;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Left zero label
    ctx.font = `700 10.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', padL - 8, midY);
    ctx.fillText(`+${maxAbs.toFixed(2)}`, padL - 6, padT + 6);
  }

  function setK(newK, withTone = false) {
    const clamped = Math.max(0, Math.min(30, Math.round(newK)));
    state.K = clamped;
    if (clamped > 0) {
      state.soloIdx = clamped - 1;
      if (withTone) playZeroTone(ZETA_ZEROS[clamped - 1]);
    }
    updateUI();
    drawMain();
    drawSolo();
  }

  playBtn.addEventListener('click', () => {
    markChapterVisited('ch3');
    if (state.playing) {
      stopPlayback();
      return;
    }
    if (state.K >= 30) {
      setK(0, false);
    }
    state.playing = true;
    playBtn.textContent = '⏸ 暂停';
    state.timer = setInterval(() => {
      if (state.K >= 30) {
        stopPlayback();
        announce('已叠加到 30 条波浪');
        return;
      }
      setK(state.K + 1, true);
    }, 260);
  });

  kSlider.addEventListener('input', () => {
    stopPlayback();
    markChapterVisited('ch3');
    setK(Number(kSlider.value), true);
  });

  presetsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-k]');
    if (!btn) return;
    stopPlayback();
    markChapterVisited('ch3');
    setK(Number(btn.dataset.k), true);
  });

  const ro = new ResizeObserver(() => {
    drawMain();
    drawSolo();
  });
  ro.observe(mainCanvas.parentElement);
  ro.observe(soloCanvas.parentElement);

  buildPegs();
  updateUI();
  drawMain();
  drawSolo();
}

/* =========================================================
   CHAPTER 4: 1/2 BALANCE LINE — 2D DRAG + MIRROR + DUAL SCOPE
   ========================================================= */
function initChapter4() {
  const cache = createChapter4Cache();

  const boardCanvas = document.getElementById('ch4-board-canvas');
  const waveCanvas = document.getElementById('ch4-wave-canvas');
  const stairCanvas = document.getElementById('ch4-stair-canvas');

  const pinReadoutEl = document.getElementById('ch4-pin-readout');
  const pinButtonsEl = document.getElementById('ch4-pin-buttons');
  const sigmaSlider = document.getElementById('ch4-sigma-slider');
  const sigmaValEl = document.getElementById('ch4-sigma-val');
  const gammaSlider = document.getElementById('ch4-gamma-slider');
  const gammaValEl = document.getElementById('ch4-gamma-val');

  const demoRightBtn = document.getElementById('ch4-demo-right');
  const demoLeftBtn = document.getElementById('ch4-demo-left');
  const demoResetBtn = document.getElementById('ch4-demo-reset');

  const ratioPillEl = document.getElementById('ch4-ratio-pill');
  const bannerEl = document.getElementById('ch4-balance-banner');
  const bannerBadgeEl = document.getElementById('ch4-banner-badge');
  const bannerMsgEl = document.getElementById('ch4-banner-msg');
  const stairTitleEl = document.getElementById('ch4-stair-title');
  const stairRangeEl = document.getElementById('ch4-stair-range');
  const waveCaptionEl = document.getElementById('ch4-wave-caption');
  const stairCaptionEl = document.getElementById('ch4-stair-caption');

  const defaultPins = () =>
    ZETA_ZEROS.slice(0, 6).map((gamma) => ({ sigma: 0.5, gamma }));

  const state = {
    pins: defaultPins(),
    selectedPin: 0,
    stairRange: 120,
    hasInteracted: false,
    draggingPin: -1,
    wasBreached: false,
  };

  let boardBox = { padL: 44, padR: 20, padT: 32, padB: 38, plotW: 360, plotH: 290 };
  const T_MIN = 10;
  const T_MAX = 44;

  // Create diagonal emerald stripe pattern for color-blind safe corridor
  const hatchCanvas = document.createElement('canvas');
  hatchCanvas.width = 12;
  hatchCanvas.height = 12;
  const hctx = hatchCanvas.getContext('2d');
  hctx.fillStyle = 'rgba(12, 133, 104, 0.11)';
  hctx.fillRect(0, 0, 12, 12);
  hctx.strokeStyle = 'rgba(12, 133, 104, 0.28)';
  hctx.lineWidth = 1.4;
  hctx.beginPath();
  hctx.moveTo(0, 12);
  hctx.lineTo(12, 0);
  hctx.moveTo(-6, 6);
  hctx.lineTo(6, -6);
  hctx.moveTo(6, 18);
  hctx.lineTo(18, 6);
  hctx.stroke();

  let cachedResult = cache.computeState(state.pins);

  function boardToPixel(sigma, gamma) {
    const x = boardBox.padL + sigma * boardBox.plotW;
    const y = boardBox.padT + boardBox.plotH - ((gamma - T_MIN) / (T_MAX - T_MIN)) * boardBox.plotH;
    return { x, y };
  }

  function pixelToBoard(localX, localY) {
    const rawSigma = (localX - boardBox.padL) / boardBox.plotW;
    const rawGamma = T_MIN + ((boardBox.padT + boardBox.plotH - localY) / boardBox.plotH) * (T_MAX - T_MIN);
    let sigma = Math.max(0.06, Math.min(0.94, rawSigma));
    if (Math.abs(sigma - 0.5) < 0.025) sigma = 0.5;
    else sigma = Math.round(sigma * 100) / 100;
    const gamma = Math.max(11, Math.min(43, Math.round(rawGamma * 10) / 10));
    return { sigma, gamma };
  }

  function recomputeAndUpdateUI() {
    cachedResult = cache.computeState(state.pins);
    const pin = state.pins[state.selectedPin];

    pinReadoutEl.textContent = `#${state.selectedPin + 1} · σ=${pin.sigma.toFixed(2)} · t=${pin.gamma.toFixed(2)}`;
    sigmaValEl.textContent = pin.sigma.toFixed(2);
    gammaValEl.textContent = pin.gamma.toFixed(1);

    sigmaSlider.value = pin.sigma.toFixed(2);
    sigmaSlider.setAttribute(
      'aria-valuetext',
      Math.abs(pin.sigma - 0.5) < 0.015
        ? '左右位置 0.50，稳稳站在二分之一平衡线上'
        : `左右位置 ${pin.sigma.toFixed(2)}，已偏离二分之一平衡线，镜像在 ${(1 - pin.sigma).toFixed(2)}`
    );
    syncSliderStyle(sigmaSlider);

    gammaSlider.value = pin.gamma.toFixed(1);
    gammaSlider.setAttribute('aria-valuetext', `上下音高 t = ${pin.gamma.toFixed(1)}`);
    syncSliderStyle(gammaSlider);

    pinButtonsEl.querySelectorAll('button[data-pin]').forEach((btn) => {
      const idx = Number(btn.dataset.pin);
      const off = Math.abs(state.pins[idx].sigma - 0.5) >= 0.015;
      btn.classList.toggle('is-active', idx === state.selectedPin);
      btn.classList.toggle('pin-off-line', off);
    });

    const ratioPct = Math.round(cachedResult.maxRatio * 100);
    ratioPillEl.textContent = `轨道占比：${ratioPct}%`;

    const domIdx = cachedResult.dominantPinIndex;
    const domPin = state.pins[domIdx];
    const domMaxSigma = Math.max(domPin.sigma, 1 - domPin.sigma);
    const anyOff = state.pins.some((p) => Math.abs(p.sigma - 0.5) >= 0.015);

    if (cachedResult.breached) {
      bannerEl.className = 'balance-banner is-breached';
      bannerBadgeEl.textContent = '✕ 平衡打破';
      bannerMsgEl.textContent = `零点 #${domIdx + 1} 偏到了 σ = ${domPin.sigma.toFixed(2)}（镜像在 ${(1 - domPin.sigma).toFixed(2)}），波浪按 x^${domMaxSigma.toFixed(2)} 越长越大，冲破了安全轨道！`;
      waveCaptionEl.textContent = `偏差浪潮示波图：零点 #${domIdx + 1} 偏离 1/2 线，珊瑚红波浪冲破了绿色安全轨道。`;
      stairCaptionEl.textContent = `质数楼梯对比图：由于零点偏离 1/2 线，预测曲线出现大幅晃动，偏离了真实质数楼梯。`;
      if (!state.wasBreached) {
        playUiFeedback('alert');
      }
    } else if (anyOff) {
      bannerEl.className = 'balance-banner is-breached';
      bannerBadgeEl.textContent = '! 开始摇晃';
      bannerMsgEl.textContent = `零点 #${domIdx + 1} 偏到了 σ = ${domPin.sigma.toFixed(2)}（镜像在 ${(1 - domPin.sigma).toFixed(2)}），再拖远一点就会冲破安全轨道！`;
      waveCaptionEl.textContent = `偏差浪潮示波图：零点 #${domIdx + 1} 已轻微偏离 1/2 线，波浪振幅开始变大。`;
      stairCaptionEl.textContent = `质数楼梯对比图：波浪轻微摇晃，继续拖离 1/2 线会看到曲线偏离真实楼梯。`;
    } else {
      bannerEl.className = 'balance-banner is-balanced';
      bannerBadgeEl.textContent = '✓ 平衡稳住';
      bannerMsgEl.textContent = '6 个零点都站在 1/2 线上，波浪稳稳守在绿色安全轨道里。';
      waveCaptionEl.textContent = '偏差浪潮示波图：6 个零点都在 1/2 平衡线上，合成波浪保持在绿色安全轨道内部。';
      stairCaptionEl.textContent = '质数楼梯对比图：蓝色合成曲线紧紧咬住黑色真实质数楼梯。';
    }
    state.wasBreached = cachedResult.breached;

    drawBoard();
    drawWaveScope();
    drawStairScope();
  }

  function drawBoard() {
    const { ctx, w, h } = setupCanvas(boardCanvas);
    const padL = 44;
    const padR = 18;
    const padT = 34;
    const padB = 36;
    const plotW = Math.max(100, w - padL - padR);
    const plotH = Math.max(120, h - padT - padB);
    boardBox = { padL, padR, padT, padB, plotW, plotH };

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    // Subtle soft safe strip around 0.5
    const midX = padL + 0.5 * plotW;
    ctx.fillStyle = 'rgba(12, 133, 104, 0.08)';
    ctx.fillRect(midX - plotW * 0.045, padT, plotW * 0.09, plotH);

    // Horizontal grid lines for t
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = `600 10.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let tv = 15; tv <= 40; tv += 5) {
      const py = boardToPixel(0, tv).y;
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(padL + plotW, py);
      ctx.stroke();
      ctx.fillText(String(tv), padL - 7, py);
    }

    // Vertical grid lines for sigma
    const sigmaTicks = [
      { v: 0, lbl: '0' },
      { v: 0.25, lbl: '0.25' },
      { v: 0.5, lbl: '1/2' },
      { v: 0.75, lbl: '0.75' },
      { v: 1, lbl: '1' },
    ];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    sigmaTicks.forEach(({ v, lbl }) => {
      const px = padL + v * plotW;
      ctx.strokeStyle = v === 0.5 ? COLORS.coral : COLORS.grid;
      ctx.lineWidth = v === 0.5 ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.stroke();

      ctx.fillStyle = v === 0.5 ? COLORS.coral : COLORS.muted;
      ctx.font = v === 0.5 ? `800 11.5px ${FONT_MONO}` : `600 10.5px ${FONT_MONO}`;
      ctx.fillText(lbl, px, padT + plotH + 8);
    });

    // Outer frame
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(padL, padT, plotW, plotH);

    // Axis title left top
    ctx.font = `700 11px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('音高 t ↑', 6, 8);

    // Top badge "1/2 平衡线"
    const badgeW = 86;
    const badgeH = 22;
    const badgeX = midX - badgeW / 2;
    const badgeY = 6;
    ctx.fillStyle = '#FDECE9';
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 11);
    ctx.fill();
    ctx.strokeStyle = COLORS.coral;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = COLORS.coral;
    ctx.font = `800 11px ${FONT_SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1/2 平衡线', midX, badgeY + badgeH / 2 + 0.5);

    // Draw Mirror Twins first so main pins stay cleanly on top
    state.pins.forEach((pin, idx) => {
      if (Math.abs(pin.sigma - 0.5) >= 0.015) {
        const mainPos = boardToPixel(pin.sigma, pin.gamma);
        const mirrorSigma = 1 - pin.sigma;
        const mirrorPos = boardToPixel(mirrorSigma, pin.gamma);

        // Horizontal coral dashed bar connecting main pin and mirror twin
        ctx.save();
        ctx.strokeStyle = COLORS.coral;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(mainPos.x, mainPos.y);
        ctx.lineTo(mirrorPos.x, mirrorPos.y);
        ctx.stroke();

        // Hollow dashed mirror ring
        ctx.fillStyle = 'rgba(253, 236, 233, 0.85)';
        ctx.beginPath();
        ctx.arc(mirrorPos.x, mirrorPos.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();

        // Mirror label
        const mLabel = `镜像 ${mirrorSigma.toFixed(2)}`;
        ctx.font = `700 10.5px ${FONT_SANS}`;
        const mW = ctx.measureText(mLabel).width + 12;
        const mH = 19;
        let mx = mirrorPos.x - mW / 2;
        mx = Math.max(padL + 4, Math.min(padL + plotW - mW - 4, mx));
        let my = mirrorPos.y + 15;
        if (my + mH > padT + plotH - 4) my = mirrorPos.y - 15 - mH;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        drawRoundedRect(ctx, mx, my, mW, mH, 6);
        ctx.fill();
        ctx.strokeStyle = COLORS.coral;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = COLORS.coral;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mLabel, mx + mW / 2, my + mH / 2 + 0.5);
      }
    });

    // Draw 6 draggable brass pins
    state.pins.forEach((pin, idx) => {
      const pos = boardToPixel(pin.sigma, pin.gamma);
      const isSelected = idx === state.selectedPin;
      const isOff = Math.abs(pin.sigma - 0.5) >= 0.015;

      if (isSelected) {
        ctx.save();
        ctx.fillStyle = isOff ? 'rgba(217, 56, 33, 0.18)' : 'rgba(29, 78, 216, 0.18)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Pin disk
      ctx.fillStyle = isOff ? COLORS.coral : COLORS.marigold;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Pin label (#1..#6)
      ctx.fillStyle = isOff ? '#FFFFFF' : COLORS.ink;
      ctx.font = `800 10.5px ${FONT_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`#${idx + 1}`, pos.x, pos.y + 0.5);
    });

    // Active pin growth-rate callout pill
    const activePin = state.pins[state.selectedPin];
    const activePos = boardToPixel(activePin.sigma, activePin.gamma);
    const activeOff = Math.abs(activePin.sigma - 0.5) >= 0.015;
    const sigmaDom = Math.max(activePin.sigma, 1 - activePin.sigma);
    const tagText = activeOff
      ? `x^${sigmaDom.toFixed(2)}（失控！）`
      : `x^0.50（稳）`;

    ctx.font = `800 11px ${FONT_MONO}`;
    const tagW = ctx.measureText(tagText).width + 14;
    const tagH = 22;
    let tx = activePos.x - tagW / 2;
    tx = Math.max(padL + 4, Math.min(padL + plotW - tagW - 4, tx));
    let ty = activePos.y - 36;
    if (ty < padT + 4) ty = activePos.y + 18;

    ctx.fillStyle = activeOff ? '#FDECE9' : '#E4F6F0';
    drawRoundedRect(ctx, tx, ty, tagW, tagH, 7);
    ctx.fill();
    ctx.strokeStyle = activeOff ? COLORS.coral : COLORS.emerald;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = activeOff ? COLORS.coral : COLORS.emerald;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, tx + tagW / 2, ty + tagH / 2 + 0.5);

    // Initial playful pointer guide next to pin #1 before first interaction
    if (!state.hasInteracted) {
      const p0 = boardToPixel(state.pins[0].sigma, state.pins[0].gamma);
      const guideText = '← 抓我往左或往右拖！';
      ctx.font = `800 11.5px ${FONT_SANS}`;
      const gw = ctx.measureText(guideText).width + 16;
      const gh = 26;
      const gx = Math.min(padL + plotW - gw - 6, p0.x + 18);
      const gy = p0.y - gh / 2;

      ctx.fillStyle = '#FFF6DB';
      drawRoundedRect(ctx, gx, gy, gw, gh, 8);
      ctx.fill();
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = COLORS.marigoldText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(guideText, gx + gw / 2, gy + gh / 2 + 0.5);
    }
  }

  function drawWaveScope() {
    const { ctx, w, h } = setupCanvas(waveCanvas);
    const padL = 42;
    const padR = 16;
    const padT = 18;
    const padB = 30;
    const plotW = Math.max(100, w - padL - padR);
    const plotH = Math.max(80, h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMin = 2;
    const xMax = 500;
    const yBound = 6.5;

    const toX = (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = (y) => padT + plotH / 2 - (y / yBound) * (plotH / 2);

    // Horizontal grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = `600 10.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [-6, -3, 0, 3, 6].forEach((yv) => {
      const yy = toY(yv);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(yv > 0 ? `+${yv}` : String(yv), padL - 7, yy);
    });

    // X ticks
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    [2, 100, 200, 300, 400, 500].forEach((xv) => {
      const xx = toX(xv);
      ctx.fillText(String(xv), xx, padT + plotH + 7);
    });

    // Clip inside plot area for waves & corridor
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    // Emerald hatched 1/2 safe corridor
    const pat = ctx.createPattern(hatchCanvas, 'repeat');
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
    ctx.fillStyle = pat || COLORS.tintEmerald;
    ctx.fill();

    // Upper & lower dashed emerald boundaries
    ctx.save();
    ctx.strokeStyle = COLORS.emerald;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(cache.railVals[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(-cache.railVals[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Real prime fluctuation pi(x) - R(x)
    ctx.strokeStyle = 'rgba(20, 28, 43, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(cache.piDiffVals[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Simulated wave totalDiff
    const breached = cachedResult.breached;
    ctx.strokeStyle = breached ? COLORS.coral : COLORS.cobalt;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < cache.xs.length; i++) {
      const px = toX(cache.xs[i]);
      const py = toY(cachedResult.totalDiff[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Highlight breach peak
    if (breached && cachedResult.breachedX !== null) {
      let peakIdx = 0;
      let peakRatio = 0;
      for (let i = 0; i < cache.xs.length; i++) {
        const r = Math.abs(cachedResult.totalDiff[i]) / cache.railVals[i];
        if (r > peakRatio) {
          peakRatio = r;
          peakIdx = i;
        }
      }
      const bx = toX(cache.xs[peakIdx]);
      const rawVal = cachedResult.totalDiff[peakIdx];
      const clampedVal = Math.max(-yBound + 0.55, Math.min(yBound - 0.55, rawVal));
      const by = toY(clampedVal);

      ctx.fillStyle = COLORS.coral;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const msg = '冲破安全轨道！';
      ctx.font = `800 11px ${FONT_SANS}`;
      const mw = ctx.measureText(msg).width + 14;
      const mh = 22;
      let mx = bx - mw / 2;
      mx = Math.max(padL + 6, Math.min(padL + plotW - mw - 6, mx));
      let my = rawVal >= 0 ? by + 10 : by - mh - 10;
      my = Math.max(padT + 6, Math.min(padT + plotH - mh - 6, my));

      ctx.fillStyle = COLORS.coral;
      drawRoundedRect(ctx, mx, my, mw, mh, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, mx + mw / 2, my + mh / 2 + 0.5);
    }

    ctx.restore();

    // Corridor label inside top-right
    ctx.font = `700 10.5px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.emerald;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('1/2 安全轨道', padL + plotW - 6, padT + 4);

    // Plot border
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }

  function drawStairScope() {
    const { ctx, w, h } = setupCanvas(stairCanvas);
    const padL = 42;
    const padR = 16;
    const padT = 16;
    const padB = 30;
    const plotW = Math.max(100, w - padL - padR);
    const plotH = Math.max(70, h - padT - padB);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, 0, w, h);

    const xMin = 2;
    const xMax = state.stairRange;
    const { yMax, ticks: yTickList } = niceAxisScale(piExact(xMax) * 1.16, 4);

    const toX = (x) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const toY = (y) => padT + plotH - (y / yMax) * plotH;

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.font = `600 10.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yTickList.forEach((yv) => {
      const yy = toY(yv);
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + plotW, yy);
      ctx.stroke();
      ctx.fillText(String(yv), padL - 7, yy);
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = xMax === 120 ? [2, 30, 60, 90, 120] : [2, 75, 150, 225, 300];
    xTicks.forEach((xv) => {
      ctx.fillText(String(xv), toX(xv), padT + plotH + 7);
    });

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, plotW, plotH);
    ctx.clip();

    // Exact staircase pi(x)
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.9;
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

    // Simulated staircase totalPi
    const offLine = cachedResult.breached || state.pins.some((p) => Math.abs(p.sigma - 0.5) >= 0.015);
    ctx.strokeStyle = offLine ? COLORS.coral : COLORS.cobalt;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < cache.xs.length; i++) {
      const xv = cache.xs[i];
      if (xv > xMax + 2) break;
      const px = toX(xv);
      const py = toY(cachedResult.totalPi[i]);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.restore();

    // Compact legend top-left
    const legX = padL + 8;
    const legY = padT + 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    drawRoundedRect(ctx, legX, legY, 198, 24, 6);
    ctx.fill();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = `700 10.5px ${FONT_SANS}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX + 8, legY + 12);
    ctx.lineTo(legX + 20, legY + 12);
    ctx.stroke();
    ctx.fillStyle = COLORS.ink;
    ctx.fillText('真实楼梯', legX + 24, legY + 12);

    ctx.strokeStyle = offLine ? COLORS.coral : COLORS.cobalt;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(legX + 84, legY + 12);
    ctx.lineTo(legX + 98, legY + 12);
    ctx.stroke();
    ctx.fillStyle = offLine ? COLORS.coral : COLORS.cobalt;
    ctx.fillText(offLine ? '跑偏预测曲线' : '平衡预测曲线', legX + 102, legY + 12);

    // Border
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(padL, padT, plotW, plotH);
  }

  // Pointer capture 2D dragging on boardCanvas
  boardCanvas.addEventListener('pointerdown', (e) => {
    const rect = boardCanvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const hitR = e.pointerType === 'touch' ? 36 : 28;

    let bestIdx = -1;
    let bestDist = Infinity;
    state.pins.forEach((pin, idx) => {
      const pos = boardToPixel(pin.sigma, pin.gamma);
      const d = Math.hypot(lx - pos.x, ly - pos.y);
      if (d <= hitR && d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });

    if (bestIdx === -1) {
      // Allow clicking anywhere near a pin's vertical height to select & move the selected pin
      bestIdx = state.selectedPin;
    }

    state.selectedPin = bestIdx;
    state.draggingPin = bestIdx;
    state.hasInteracted = true;
    markChapterVisited('ch4');
    boardCanvas.classList.add('is-dragging');
    if (boardCanvas.setPointerCapture) {
      try {
        boardCanvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if synthetic event has no active pointer
      }
    }

    const next = pixelToBoard(lx, ly);
    state.pins[bestIdx].sigma = next.sigma;
    state.pins[bestIdx].gamma = next.gamma;
    recomputeAndUpdateUI();
  });

  boardCanvas.addEventListener('pointermove', (e) => {
    if (state.draggingPin < 0) return;
    const rect = boardCanvas.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const prevGamma = state.pins[state.draggingPin].gamma;
    const next = pixelToBoard(lx, ly);
    state.pins[state.draggingPin].sigma = next.sigma;
    state.pins[state.draggingPin].gamma = next.gamma;
    if (Math.floor(prevGamma) !== Math.floor(next.gamma)) {
      playZeroTone(next.gamma);
    }
    recomputeAndUpdateUI();
  });

  const endDrag = (e) => {
    if (state.draggingPin < 0) return;
    const pin = state.pins[state.draggingPin];
    state.draggingPin = -1;
    boardCanvas.classList.remove('is-dragging');
    if (boardCanvas.releasePointerCapture && e && e.pointerId !== undefined) {
      try {
        boardCanvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
    playZeroTone(pin.gamma);
  };

  boardCanvas.addEventListener('pointerup', endDrag);
  boardCanvas.addEventListener('pointercancel', endDrag);

  // Synced accessible controls
  pinButtonsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-pin]');
    if (!btn) return;
    state.selectedPin = Number(btn.dataset.pin);
    markChapterVisited('ch4');
    recomputeAndUpdateUI();
    playZeroTone(state.pins[state.selectedPin].gamma);
  });

  sigmaSlider.addEventListener('input', () => {
    state.hasInteracted = true;
    markChapterVisited('ch4');
    let v = Number(sigmaSlider.value);
    if (Math.abs(v - 0.5) < 0.025) v = 0.5;
    state.pins[state.selectedPin].sigma = v;
    recomputeAndUpdateUI();
  });

  gammaSlider.addEventListener('input', () => {
    state.hasInteracted = true;
    markChapterVisited('ch4');
    const v = Number(gammaSlider.value);
    state.pins[state.selectedPin].gamma = v;
    playZeroTone(v);
    recomputeAndUpdateUI();
  });

  demoRightBtn.addEventListener('click', () => {
    state.hasInteracted = true;
    markChapterVisited('ch4');
    state.pins[state.selectedPin].sigma = 0.85;
    recomputeAndUpdateUI();
    announce(`已将零点 #${state.selectedPin + 1} 推到右侧 0.85，波浪冲破安全轨道`);
  });

  demoLeftBtn.addEventListener('click', () => {
    state.hasInteracted = true;
    markChapterVisited('ch4');
    state.pins[state.selectedPin].sigma = 0.15;
    recomputeAndUpdateUI();
    announce(`已将零点 #${state.selectedPin + 1} 推到左侧 0.15，右侧 0.85 出现镜像伙伴`);
  });

  demoResetBtn.addEventListener('click', () => {
    state.pins = defaultPins();
    markChapterVisited('ch4');
    playUiFeedback('reset');
    recomputeAndUpdateUI();
    announce('6 个零点已全部归位到 1/2 平衡线');
  });

  stairRangeEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-range]');
    if (!btn) return;
    state.stairRange = Number(btn.dataset.range);
    stairTitleEl.textContent = `质数楼梯对比（x = 2 到 ${state.stairRange}）`;
    stairRangeEl.querySelectorAll('button[data-range]').forEach((b) => {
      b.classList.toggle('is-active', Number(b.dataset.range) === state.stairRange);
    });
    drawStairScope();
  });

  const ro = new ResizeObserver(() => {
    drawBoard();
    drawWaveScope();
    drawStairScope();
  });
  ro.observe(boardCanvas.parentElement);
  ro.observe(waveCanvas.parentElement);
  ro.observe(stairCanvas.parentElement);

  recomputeAndUpdateUI();
}

/* =========================================================
   CHAPTER 5: 3 STAMP-CARD MINI-CHECKS
   ========================================================= */
function initChapter5() {
  const quizData = [
    {
      answer: 1,
      right: '没错！17 无论排成 2 行、3 行还是 4 行都会多出零头，它是拆不散的质数。',
      wrong: '再想想第 1 关的木块桌：这个数能排成整齐的长方形，所以它是合数哦。',
    },
    {
      answer: 0,
      right: '答对了！上下高度 t 管的是节奏快慢，就像琴弦越紧、声音越高。',
      wrong: '提示：往上拖改变的是节奏快慢，只有往左右拖离开 1/2 线才会让波浪失控。',
    },
    {
      answer: 1,
      right: '答对了！1/2 线像一面镜子，往左偏到 0.2，右边 0.8 的镜像伙伴立刻把波浪越推越大。',
      wrong: '回头试试第 4 关的“往左拖偏试试”按钮，看看 1/2 线右边冒出了什么！',
    },
  ];

  const cards = Array.from(document.querySelectorAll('.stamp-card[data-question]'));
  const scorePill = document.getElementById('ch5-score-pill');
  const completionBanner = document.getElementById('ch5-completion');
  const resetBtn = document.getElementById('ch5-reset-quiz');

  const solved = [false, false, false];

  function updateScore() {
    const count = solved.filter(Boolean).length;
    scorePill.textContent = `已收集印章：${count} / 3`;
    completionBanner.hidden = count < 3;
    if (count === 3) {
      markChapterVisited('ch5');
      announce('3 道小侦探题全部答对，通关印章已点亮');
    }
  }

  cards.forEach((card) => {
    const qIdx = Number(card.dataset.question);
    const meta = quizData[qIdx];
    const options = Array.from(card.querySelectorAll('.quiz-opt'));
    const fbEl = card.querySelector('.quiz-feedback');

    options.forEach((optBtn) => {
      optBtn.addEventListener('click', () => {
        const choice = Number(optBtn.dataset.choice);
        const isRight = choice === meta.answer;

        options.forEach((b) => {
          b.classList.remove('is-picked-right', 'is-picked-wrong');
          b.setAttribute('aria-pressed', b === optBtn ? 'true' : 'false');
        });

        if (isRight) {
          optBtn.classList.add('is-picked-right');
          card.classList.add('is-correct');
          card.classList.remove('is-wrong');
          fbEl.textContent = meta.right;
          solved[qIdx] = true;
          playUiFeedback('stamp');
        } else {
          optBtn.classList.add('is-picked-wrong');
          card.classList.remove('is-correct');
          card.classList.add('is-wrong');
          fbEl.textContent = meta.wrong;
          solved[qIdx] = false;
          playUiFeedback('alert');
        }

        updateScore();
      });
    });
  });

  resetBtn.addEventListener('click', () => {
    solved.fill(false);
    cards.forEach((card) => {
      card.classList.remove('is-correct', 'is-wrong');
      card.querySelectorAll('.quiz-opt').forEach((b) => {
        b.classList.remove('is-picked-right', 'is-picked-wrong');
        b.setAttribute('aria-pressed', 'false');
      });
      const fbEl = card.querySelector('.quiz-feedback');
      if (fbEl) fbEl.textContent = '';
    });
    updateScore();
    playUiFeedback('reset');
  });

  updateScore();
}

/* =========================================================
   BOOT ALL 5 CHAPTERS
   ========================================================= */
initScrollSpy();
initChapter1();
initChapter2();
initChapter3();
initChapter4();
initChapter5();
