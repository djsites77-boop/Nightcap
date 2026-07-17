/**
 * Largest-remainder allocation: splits `totalCents` proportionally to
 * `weights`, guaranteeing the shares sum to exactly `totalCents` (plain
 * `total * w / sumWeights` per share would round independently and can drift
 * by a cent or two — unacceptable for a tax ledger).
 */
export function allocateProportional(totalCents: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return weights.map(() => 0);

  const raw = weights.map((w) => (totalCents * w) / totalWeight);
  const floors = raw.map(Math.floor);
  const distributed = floors.reduce((a, b) => a + b, 0);
  let remainder = totalCents - distributed;

  const byFractionDesc = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (let k = 0; k < remainder; k++) {
    result[byFractionDesc[k % byFractionDesc.length].i] += 1;
  }
  return result;
}
