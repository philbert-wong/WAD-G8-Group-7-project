/**
 * Ordinary least squares, written out so there is no dependency to install and
 * nothing hidden. Pure functions — no database, no network.
 * OWNER: Data pipeline & QA
 */

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;

/** Solve A·x = b by Gaussian elimination with partial pivoting. Null if singular. */
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];

    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let k = i + 1; k < n; k++) s -= M[i][k] * x[k];
    x[i] = s / M[i][i];
  }
  return x;
}

/**
 * Fit y ≈ intercept + Σ coefficients[j]·X[.][j].
 *
 * Columns with no variation (e.g. floor area within a single flat type) are
 * dropped automatically and get a coefficient of 0. Columns are standardised
 * internally and a tiny ridge term keeps near-collinear dummies solvable, then
 * the coefficients are converted back to the original units.
 *
 * Returns null when there are not enough rows to say anything.
 */
export function fitOls(X, y, { ridge = 1e-8 } = {}) {
  const n = y.length;
  if (n === 0) return null;
  const p = X[0].length;

  const means = [], sds = [], keep = [];
  for (let j = 0; j < p; j++) {
    const col = X.map((r) => r[j]);
    const m = mean(col);
    const sd = Math.sqrt(col.reduce((s, v) => s + (v - m) ** 2, 0) / n);
    means.push(m); sds.push(sd);
    if (sd > 1e-9) keep.push(j);
  }

  const k = keep.length;
  if (n <= k + 1) return null;

  const meanY = mean(y);
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);

  for (let i = 0; i < n; i++) {
    const z = keep.map((j) => (X[i][j] - means[j]) / sds[j]);
    const yc = y[i] - meanY;
    for (let a = 0; a < k; a++) {
      b[a] += z[a] * yc;
      for (let c = 0; c < k; c++) A[a][c] += z[a] * z[c];
    }
  }
  for (let d = 0; d < k; d++) A[d][d] += ridge * n;

  const beta = k ? solve(A, b) : [];
  if (!beta) return null;

  const coefficients = new Array(p).fill(0);
  keep.forEach((j, idx) => { coefficients[j] = beta[idx] / sds[j]; });
  const intercept = meanY - coefficients.reduce((s, c, j) => s + c * means[j], 0);

  let sse = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + coefficients.reduce((s, c, j) => s + c * X[i][j], 0);
    sse += (y[i] - pred) ** 2;
    sst += (y[i] - meanY) ** 2;
  }

  return {
    intercept,
    coefficients,
    r2: sst > 0 ? Math.max(0, 1 - sse / sst) : 0,
    n,
    dropped: [...Array(p).keys()].filter((j) => !keep.includes(j)),
    means,
  };
}

/** Pearson correlation. 0 when either column is constant. */
export function correlation(a, b) {
  const ma = mean(a), mb = mean(b);
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}
