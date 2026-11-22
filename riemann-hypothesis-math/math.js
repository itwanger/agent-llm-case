/**
 * Pure-mathematics computation engine for "黎曼猜想：纯数学交互图解".
 * Zero external runtime dependencies.
 * Provides exact prime sieving up to 5050, offset/full logarithmic integral Li(x),
 * Riemann's Gram series R(x), Euler-Maclaurin real zeta(s), prime factorization &
 * Euler product subset analysis, explicit-formula oscillatory terms + envelopes,
 * and precomputed caches for Modules 3 and 4.
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

export const MAX_PRIME_N = 5050;

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

export const EULER_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

/**
 * Exact prime counting function pi(x) for x <= MAX_PRIME_N (5050).
 */
export function piExact(x) {
  if (!Number.isFinite(x) || x < 2) return 0;
  const idx = Math.floor(x);
  if (idx >= MAX_PRIME_N) return PI_TABLE[MAX_PRIME_N];
  return PI_TABLE[idx];
}

// 5-point Gauss-Legendre quadrature nodes and weights on [-1, 1]
const GL5_X = [
  -0.906179845938664,
  -0.5384693101056831,
  0,
  0.5384693101056831,
  0.906179845938664,
];
const GL5_W = [
  0.23692688505618908,
  0.47862867049936647,
  0.5688888888888889,
  0.47862867049936647,
  0.23692688505618908,
];

const LN2 = Math.LN2;
const LI_2 = 1.0451637801174928;

/**
 * Offset logarithmic integral Li(x) = integral_2^x dt / ln(t)
 * computed via composite 5-point Gauss-Legendre on u in [ln 2, ln x]
 * of e^u / u (accuracy < 1e-12 for x in [2, 5050]).
 */
export function liOffset(x) {
  if (!Number.isFinite(x) || x <= 2) return 0;
  const a = LN2;
  const b = Math.log(x);
  const panels = Math.max(8, Math.ceil((b - a) * 3));
  const h = (b - a) / panels;
  let total = 0;

  for (let i = 0; i < panels; i++) {
    const left = a + i * h;
    const mid = left + 0.5 * h;
    const half = 0.5 * h;
    let panelSum = 0;
    for (let j = 0; j < 5; j++) {
      const u = mid + half * GL5_X[j];
      panelSum += GL5_W[j] * (Math.exp(u) / u);
    }
    total += half * panelSum;
  }

  return total;
}

/**
 * Full logarithmic integral li(x) = Li(x) + li(2), where li(2) ~= 1.0451637801174928.
 */
export function liFull(x) {
  if (!Number.isFinite(x) || x <= 1) return 0;
  if (x === 2) return LI_2;
  if (x < 2) {
    // Integrate from ln(x) to ln(2) and subtract from li(2)
    const a = Math.log(x);
    const b = LN2;
    const panels = 4;
    const h = (b - a) / panels;
    let sub = 0;
    for (let i = 0; i < panels; i++) {
      const mid = a + (i + 0.5) * h;
      const half = 0.5 * h;
      let panelSum = 0;
      for (let j = 0; j < 5; j++) {
        const u = mid + half * GL5_X[j];
        panelSum += GL5_W[j] * (Math.exp(u) / u);
      }
      sub += half * panelSum;
    }
    return LI_2 - sub;
  }
  return liOffset(x) + LI_2;
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
 * Riemann's smooth prime-counting function R(x) via the Gram series:
 *   R(x) = 1 + sum_{k=1..} (ln x)^k / (k * k! * zeta(k + 1))
 */
export function riemannR(x) {
  if (!Number.isFinite(x) || x <= 1) return 0;
  const lnx = Math.log(x);
  let sum = 1;
  let term = 1;
  for (let k = 1; k <= 50; k++) {
    term *= lnx / k;
    const z = k <= ZETA_INT.length ? ZETA_INT[k - 1] : 1;
    const add = term / (k * z);
    sum += add;
    if (add < 1e-12) break;
  }
  return sum;
}

/**
 * High-accuracy real Riemann zeta function zeta(s) for s > 1 (designed for s in [1.15, 5.0])
 * via Euler-Maclaurin summation (N = 24 + integral + B2, B4, B6, B8 Bernoulli corrections).
 */
export function zetaReal(s) {
  if (!Number.isFinite(s) || s <= 1) return Infinity;
  const N = 24;
  let sum = 0;
  for (let n = 1; n < N; n++) {
    sum += Math.pow(n, -s);
  }

  const nPowNegS = Math.pow(N, -s);
  const invN2 = 1 / (N * N);

  // Integral N^(1-s)/(s-1) + midpoint 0.5*N^(-s)
  sum += (N * nPowNegS) / (s - 1) + 0.5 * nPowNegS;

  // Bernoulli corrections:
  // k=1: B2/2! * s * N^(-s-1)                           = (1/12) * s * N^(-s-1)
  // k=2: B4/4! * s(s+1)(s+2) * N^(-s-3)                 = (-1/720) * ...
  // k=3: B6/6! * s(s+1)(s+2)(s+3)(s+4) * N^(-s-5)       = (1/30240) * ...
  // k=4: B8/8! * s(s+1)...(s+6) * N^(-s-7)              = (-1/1209600) * ...
  let p = s * (nPowNegS / N);
  sum += p / 12;

  p *= (s + 1) * (s + 2) * invN2;
  sum -= p / 720;

  p *= (s + 3) * (s + 4) * invN2;
  sum += p / 30240;

  p *= (s + 5) * (s + 6) * invN2;
  sum -= p / 1209600;

  return sum;
}

/**
 * Prime factorization of a positive integer n.
 * Returns [{ p, exp }, ...] for n >= 2, and [] for n === 1 (or invalid inputs).
 */
export function factorize(n) {
  const factors = [];
  if (!Number.isInteger(n) || n < 2) return factors;
  let rem = n;
  for (let d = 2; d * d <= rem; d++) {
    if (rem % d === 0) {
      let exp = 0;
      while (rem % d === 0) {
        rem /= d;
        exp += 1;
      }
      factors.push({ p: d, exp });
    }
  }
  if (rem > 1) {
    factors.push({ p: rem, exp: 1 });
  }
  return factors;
}

/**
 * Analyzes a finite subset of primes in the Euler product identity:
 *   prod_{p in S} 1 / (1 - p^(-s))  vs  sum_{n <= maxN, n is S-smooth} n^(-s)  vs  zeta(s).
 *
 * Returns:
 *   { eulerProduct, zetaTrue, ratioToZeta, coveredCount, coveredSum, allUpToMaxNSum, items }
 * where each item is { n, covered, factors, term, missingPrimes }.
 */
export function analyzeEulerSubset(selectedPrimes, s, maxN = 60) {
  const primeSet = new Set();
  if (Array.isArray(selectedPrimes) || selectedPrimes instanceof Set) {
    for (const p of selectedPrimes) {
      if (Number.isInteger(p) && p >= 2) {
        primeSet.add(p);
      }
    }
  }

  let eulerProduct = 1;
  for (const p of primeSet) {
    eulerProduct *= 1 / (1 - Math.pow(p, -s));
  }

  const zetaTrue = zetaReal(s);
  const ratioToZeta = Number.isFinite(zetaTrue) && zetaTrue > 0 ? eulerProduct / zetaTrue : 0;

  const items = new Array(maxN);
  let coveredCount = 0;
  let coveredSum = 0;
  let allUpToMaxNSum = 0;

  for (let n = 1; n <= maxN; n++) {
    const factors = factorize(n);
    const missingPrimes = [];
    for (let i = 0; i < factors.length; i++) {
      if (!primeSet.has(factors[i].p)) {
        missingPrimes.push(factors[i].p);
      }
    }
    const covered = missingPrimes.length === 0;
    const term = Math.pow(n, -s);
    allUpToMaxNSum += term;
    if (covered) {
      coveredCount += 1;
      coveredSum += term;
    }
    items[n - 1] = { n, covered, factors, term, missingPrimes };
  }

  return {
    eulerProduct,
    zetaTrue,
    ratioToZeta,
    coveredCount,
    coveredSum,
    allUpToMaxNSum,
    items,
  };
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
 * Single conjugate-zero pair contribution W(x; sigma, gamma) to pi(x)
 * via 3-term Mobius inversion (retaining m = 1, 2, 3 where x^(1/m) >= 2).
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
 * Leading explicit-formula oscillatory component for a conjugate pair sigma +/- i*gamma
 * together with its exact amplitude envelope +/- 2 * x^sigma / (|s| * ln(x)).
 *
 * Returns { value, envelope }.
 */
export function singleZeroOscillation(x, sigma, gamma) {
  if (!Number.isFinite(x) || x <= 1) {
    return { value: 0, envelope: 0 };
  }
  const lnx = Math.log(x);
  const value = -eiPair(sigma, gamma, lnx);
  const modS = Math.hypot(sigma, gamma);
  const envelope = modS > 0 && lnx > 0 ? (2 * Math.pow(x, sigma)) / (modS * lnx) : 0;
  return { value, envelope };
}

/**
 * Reference bound around R(x) when all nontrivial zeros satisfy sigma = 1/2:
 *   rail(x) = 0.60 + 0.72 * sqrt(x) / ln(x)   (for x >= 2)
 */
export function safeRail(x) {
  const safeX = !Number.isFinite(x) || x < 2 ? 2 : x;
  return 0.60 + (0.72 * Math.sqrt(safeX)) / Math.log(safeX);
}

/**
 * Precomputed cache for Module 3B (x in [2, 32], N = 360 points):
 * - xs: Float64Array(360)
 * - rVals: Float64Array(360) - R(x)
 * - piVals: Float64Array(360) - exact pi(x)
 * - waves: 30 Float64Arrays - individual W(x; 0.5, gamma_k)
 * - prefixSums: 31 Float64Arrays (K = 0..30) - pi_K(x) = R(x) + sum_{j=0..K-1} waves[j]
 * - maes: Float64Array(31) - real mean absolute error of prefixSums[K] vs piVals
 */
export function createExplicitCache() {
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

  const maes = new Float64Array(numZeros + 1);
  for (let k = 0; k <= numZeros; k++) {
    const approx = prefixSums[k];
    let errSum = 0;
    for (let i = 0; i < N; i++) {
      errSum += Math.abs(approx[i] - piVals[i]);
    }
    maes[k] = errSum / N;
  }

  return {
    xs,
    rVals,
    piVals,
    waves,
    prefixSums,
    maes,
  };
}

/**
 * Precomputed cache for Module 4 (x in [2, 500], N = 320 points):
 * - xs, rVals, piVals, piDiffVals, railVals, bgWaveVals (fixed zeros #7..#30 at sigma = 0.5)
 * - computeState(pins): computes live combined residual & staircase for 6 draggable pins
 *   using functional-equation symmetry sigmaDom = Math.max(pin.sigma, 1 - pin.sigma).
 *
 * Returns:
 *   { totalDiff, totalPi, maxRatio, maxExcess, breached, breachedX, dominantPinIndex, thetaMax }
 */
export function createCriticalStripCache() {
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

    let dominantPinIndex = 0;
    let maxDev = -1;
    let thetaMax = 0.5;
    const sigmaDoms = new Float64Array(pinCount);
    const gammas = new Float64Array(pinCount);

    for (let p = 0; p < pinCount; p++) {
      const sigma = pins[p].sigma;
      const gamma = pins[p].gamma;
      const sigmaDom = Math.max(sigma, 1 - sigma);
      const dev = Math.abs(sigma - 0.5);
      if (dev > maxDev) {
        maxDev = dev;
        dominantPinIndex = p;
      }
      if (sigmaDom > thetaMax) {
        thetaMax = sigmaDom;
      }
      sigmaDoms[p] = sigmaDom;
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
      thetaMax,
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
