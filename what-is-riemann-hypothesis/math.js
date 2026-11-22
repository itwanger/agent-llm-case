/**
 * Real mathematical computations for "质数里藏着一首歌 · 黎曼猜想互动游乐场".
 * Zero external runtime dependencies. All curves come from true prime sieving,
 * Riemann's Gram series R(x), and the Riemann explicit formula with the first
 * 30 verified nontrivial zeta zeros.
 */

/**
 * First 30 nontrivial Riemann zeta zero imaginary parts (gamma_1 .. gamma_30),
 * verified against mpmath.zetazero(k) to 6 decimal places.
 */
export const ZETA_ZEROS = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832,
  52.970321, 56.446248, 59.347044, 60.831779, 65.112544,
  67.079811, 69.546402, 72.067158, 75.704691, 77.144840,
  79.337375, 82.910381, 84.735493, 87.425275, 88.809111,
  92.491899, 94.651344, 95.870634, 98.831194, 101.317851,
];

export const MAX_PRIME_N = 2050;

export const IS_PRIME = new Uint8Array(MAX_PRIME_N + 1);
export const PI_TABLE = new Int32Array(MAX_PRIME_N + 1);

// Sieve of Eratosthenes + prefix sum pi(n) for 0..MAX_PRIME_N
(() => {
  IS_PRIME.fill(1, 2);
  const limit = Math.floor(Math.sqrt(MAX_PRIME_N));
  for (let p = 2; p <= limit; p++) {
    if (IS_PRIME[p]) {
      for (let m = p * p; m <= MAX_PRIME_N; m += p) {
        IS_PRIME[m] = 0;
      }
    }
  }
  let count = 0;
  for (let n = 0; n <= MAX_PRIME_N; n++) {
    if (IS_PRIME[n]) count += 1;
    PI_TABLE[n] = count;
  }
})();

export const PRIMES_UP_TO_30 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

/**
 * Exact prime counting function pi(x) for x in [0, MAX_PRIME_N].
 */
export function piExact(x) {
  if (!Number.isFinite(x) || x < 2) return 0;
  const idx = Math.floor(x);
  if (idx >= MAX_PRIME_N) return PI_TABLE[MAX_PRIME_N];
  return PI_TABLE[idx];
}

// Precomputed zeta(k + 1) for k = 1..24 (zeta(2)..zeta(25)); for k >= 25, zeta(k+1) ~= 1.
const ZETA_INT = [
  1.64493407, 1.20205690, 1.08232323, 1.03692776, 1.01734306,
  1.00834928, 1.00407736, 1.00200839, 1.00099458, 1.00049419,
  1.00024609, 1.00012271, 1.00006125, 1.00003059, 1.00001528,
  1.00000764, 1.00000382, 1.00000191, 1.00000095, 1.00000048,
  1.00000024, 1.00000012, 1.00000006, 1.00000003,
];

/**
 * Riemann's smooth prime-counting approximation R(x) via the Gram series:
 *   R(x) = 1 + sum_{k=1..} (ln x)^k / (k * k! * zeta(k + 1))
 */
export function riemannR(x) {
  if (!Number.isFinite(x) || x <= 1) return 0;
  const lnx = Math.log(x);
  let sum = 1;
  let term = 1;
  for (let k = 1; k <= 40; k++) {
    term *= lnx / k;
    const z = k <= ZETA_INT.length ? ZETA_INT[k - 1] : 1;
    const add = term / (k * z);
    sum += add;
    if (add < 1e-10) break;
  }
  return sum;
}

/**
 * 2 * Re(Ei((sigma + i * gamma) * u)) using 3-term asymptotic expansion.
 */
function eiPair(sigma, gamma, u) {
  const a = sigma * u;
  const b = gamma * u;
  const r2 = a * a + b * b;
  if (r2 === 0) return 0;
  const izRe = a / r2;
  const izIm = -b / r2;
  const iz2Re = izRe * izRe - izIm * izIm;
  const iz2Im = 2 * izRe * izIm;
  const pRe = 1 + izRe + 2 * iz2Re;
  const pIm = izIm + 2 * iz2Im;
  const sRe = izRe * pRe - izIm * pIm;
  const sIm = izRe * pIm + izIm * pRe;
  const ea = Math.exp(a);
  const c = Math.cos(b);
  const s = Math.sin(b);
  return 2 * ea * (c * sRe - s * sIm);
}

/**
 * Single conjugate-zero pair wave contribution to pi(x) via Mobius inversion
 * (retaining m = 1, 2, 3 terms where x^(1/m) >= 2).
 */
export function primeWaveTerm(x, sigma, gamma) {
  if (!Number.isFinite(x) || x <= 1) return 0;
  const lnx = Math.log(x);
  let w = -eiPair(sigma, gamma, lnx);
  if (x >= 4) w += 0.5 * eiPair(sigma, gamma, lnx * 0.5);
  if (x >= 8) w += (1 / 3) * eiPair(sigma, gamma, lnx / 3);
  return w;
}

/**
 * Safe corridor half-width around R(x) when all zeros lie on sigma = 1/2:
 *   rail(x) = 0.60 + 0.72 * sqrt(x) / ln(x)   (for x >= 2)
 */
export function safeRail(x) {
  const safeX = !Number.isFinite(x) || x < 2 ? 2 : x;
  return 0.60 + (0.72 * Math.sqrt(safeX)) / Math.log(safeX);
}

/**
 * Returns unique rectangular factor pairs [rows, cols] with
 * rows >= 2, cols >= 2, rows <= cols, and rows * cols === n.
 * Returns [] for primes and n < 4.
 */
export function getFactorPairs(n) {
  const pairs = [];
  if (!Number.isInteger(n) || n < 4) return pairs;
  const limit = Math.floor(Math.sqrt(n));
  for (let rows = 2; rows <= limit; rows++) {
    if (n % rows === 0) {
      pairs.push([rows, n / rows]);
    }
  }
  return pairs;
}

/**
 * Precomputed cache for Chapter 3 (x in [2, 32], N = 360 points):
 * - xs: Float64Array(360)
 * - rVals: Float64Array(360) - smooth R(x)
 * - piVals: Float64Array(360) - exact staircase pi(x)
 * - waves: 30 Float64Arrays - individual wave W(x; 0.5, gamma_k)
 * - prefixSums: 31 Float64Arrays (K = 0..30) - combined pi_K(x) = R(x) + sum_{j=0..K-1} waves[j]
 * - fitScores: 31 rounded integer percentages (0..100) derived from real MAE vs piExact
 */
export function createChapter3Cache() {
  const N = 360;
  const xMin = 2;
  const xMax = 32;
  const numZeros = ZETA_ZEROS.length;

  const xs = new Float64Array(N);
  const rVals = new Float64Array(N);
  const piVals = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    const x = xMin + ((xMax - xMin) * i) / (N - 1);
    xs[i] = x;
    rVals[i] = riemannR(x);
    piVals[i] = piExact(x);
  }

  const waves = new Array(numZeros);
  for (let k = 0; k < numZeros; k++) {
    const gamma = ZETA_ZEROS[k];
    const arr = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      arr[i] = primeWaveTerm(xs[i], 0.5, gamma);
    }
    waves[k] = arr;
  }

  const prefixSums = new Array(numZeros + 1);
  prefixSums[0] = new Float64Array(rVals);
  for (let k = 1; k <= numZeros; k++) {
    const prev = prefixSums[k - 1];
    const wave = waves[k - 1];
    const cur = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      cur[i] = prev[i] + wave[i];
    }
    prefixSums[k] = cur;
  }

  // Real MAE for each K = 0..30 against exact staircase pi(x)
  const maes = new Float64Array(numZeros + 1);
  for (let k = 0; k <= numZeros; k++) {
    const approx = prefixSums[k];
    let errSum = 0;
    for (let i = 0; i < N; i++) {
      errSum += Math.abs(approx[i] - piVals[i]);
    }
    maes[k] = errSum / N;
  }

  // Map real MAE cleanly onto a smoothly non-decreasing integer percentage (~48% at K=0 to ~90% at K=30)
  const mae0 = maes[0];
  const mae30 = maes[numZeros];
  const span = Math.max(mae0 - mae30, 1e-6);
  const fitScores = new Array(numZeros + 1);
  let bestMae = mae0;
  for (let k = 0; k <= numZeros; k++) {
    if (maes[k] < bestMae) bestMae = maes[k];
    const progress = (mae0 - bestMae) / span;
    const rawPct = 48 + progress * 42;
    fitScores[k] = Math.max(0, Math.min(99, Math.round(rawPct)));
  }

  return {
    xs,
    rVals,
    piVals,
    waves,
    prefixSums,
    fitScores,
  };
}

/**
 * Precomputed cache for Chapter 4 (x in [2, 500], N = 320 points):
 * - xs, rVals, piVals, piDiffVals, railVals, bgWaveVals (fixed zeros #7..#30 at sigma = 0.5)
 * - computeState(pins): computes live combined fluctuation & staircase for 6 draggable pins
 *   using mirror-symmetric sigmaDom = Math.max(pin.sigma, 1 - pin.sigma).
 */
export function createChapter4Cache() {
  const N = 320;
  const xMin = 2;
  const xMax = 500;

  const xs = new Float64Array(N);
  const rVals = new Float64Array(N);
  const piVals = new Float64Array(N);
  const piDiffVals = new Float64Array(N);
  const railVals = new Float64Array(N);
  const bgWaveVals = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    const x = xMin + ((xMax - xMin) * i) / (N - 1);
    xs[i] = x;
    const r = riemannR(x);
    const p = piExact(x);
    rVals[i] = r;
    piVals[i] = p;
    piDiffVals[i] = p - r;
    railVals[i] = safeRail(x);

    let bg = 0;
    for (let k = 6; k < ZETA_ZEROS.length; k++) {
      bg += primeWaveTerm(x, 0.5, ZETA_ZEROS[k]);
    }
    bgWaveVals[i] = bg;
  }

  function computeState(pins) {
    const totalDiff = new Float64Array(N);
    const totalPi = new Float64Array(N);
    const pinCount = Array.isArray(pins) ? pins.length : 0;

    // Determine dominant pin (largest deviation |sigma - 0.5|)
    let dominantPinIndex = 0;
    let maxDev = -1;
    const sigmaDoms = new Float64Array(pinCount);
    const gammas = new Float64Array(pinCount);

    for (let p = 0; p < pinCount; p++) {
      const sigma = pins[p].sigma;
      const gamma = pins[p].gamma;
      const dev = Math.abs(sigma - 0.5);
      if (dev > maxDev) {
        maxDev = dev;
        dominantPinIndex = p;
      }
      sigmaDoms[p] = Math.max(sigma, 1 - sigma);
      gammas[p] = gamma;
    }

    let maxRatio = 0;
    let maxExcess = 0;
    let breached = false;
    let breachedX = null;

    for (let i = 0; i < N; i++) {
      const x = xs[i];
      let diff = bgWaveVals[i];
      for (let p = 0; p < pinCount; p++) {
        diff += primeWaveTerm(x, sigmaDoms[p], gammas[p]);
      }
      totalDiff[i] = diff;
      totalPi[i] = rVals[i] + diff;

      const absDiff = Math.abs(diff);
      const rail = railVals[i];
      const ratio = absDiff / rail;
      if (ratio > maxRatio) {
        maxRatio = ratio;
      }
      const excess = absDiff - rail;
      if (excess > 0) {
        breached = true;
        if (excess > maxExcess) {
          maxExcess = excess;
          breachedX = x;
        }
      }
    }

    return {
      totalDiff,
      totalPi,
      maxRatio,
      maxExcess,
      breached,
      breachedX,
      dominantPinIndex,
    };
  }

  return {
    xs,
    rVals,
    piVals,
    piDiffVals,
    railVals,
    bgWaveVals,
    computeState,
  };
}
