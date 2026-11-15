/**
 * Computes the Y-axis domain for the composure trend chart.
 * Domain is [min - 3, max + 3] clamped to [0, 100].
 * If all values are equal, expands symmetrically by 3.
 */
export function computeTrendYDomain(scores: number[]): [number, number] {
  if (!scores || scores.length === 0) {
    return [0, 100];
  }

  let min = scores[0];
  let max = scores[0];

  for (let i = 1; i < scores.length; i++) {
    const s = scores[i];
    if (s < min) min = s;
    if (s > max) max = s;
  }

  const domainMin = Math.max(0, Math.floor(min - 3));
  const domainMax = Math.min(100, Math.ceil(max + 3));

  // If min and max were equal and clamped to the same boundary (e.g. 0 or 100)
  if (domainMin >= domainMax) {
    if (domainMin === 0) return [0, 6];
    if (domainMax === 100) return [94, 100];
    return [Math.max(0, domainMin - 3), Math.min(100, domainMax + 3)];
  }

  return [domainMin, domainMax];
}

export interface TrendSessionPoint {
  index: number;
  score: number;
  title: string;
  date: string;
  isLatest: boolean;
}
