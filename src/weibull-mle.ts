export type WeibullParams = {
  k: number;
  c: number;
};

function gamma(x: number): number {
  // https://stackoverflow.com/a/6701288/11571888
  // Lanczos approximation
  // https://en.wikipedia.org/wiki/Lanczos_approximation
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let g = 7;
  if (x < 0.5) {
    return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  }
  x -= 1;
  let a = p[0];
  const t = x + g + 0.5;
  for (let i = 1; i < p.length; i++) {
    a += p[i] / (x + i);
  }
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

export function weibullMLE(values: number[]): WeibullParams {
  const n = values.length;
  const sum = values.reduce((acc, value) => acc + value, 0);
  const mean = sum / n;
  const sumOfSquares = values.reduce((acc, value) => acc + value ** 2, 0);
  const meanOfSquares = sumOfSquares / n;
  const variance = meanOfSquares - mean ** 2;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = standardDeviation / mean;
  const k = 1.086 / coefficientOfVariation;
  const c = mean / gamma(1 + 1 / k);
  return { k, c };
}
