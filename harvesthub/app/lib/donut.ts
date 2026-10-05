// Geometry for components/customer/DonutChart.tsx — kept free of React/
// React Native imports so it can be tested on its own.
//
// There's no SVG library in this app (adding react-native-svg would mean
// rebuilding the dev client), so the ring is drawn as DONUT_TICKS thin
// radial marks, 2° each, colored by segment. One tick at the start of each
// segment is left empty: that's the ~2px gap between neighboring segments.

export const DONUT_TICKS = 180;
export const DONUT_STEP_DEG = 360 / DONUT_TICKS;

// Ticks per segment, proportional to value (largest-remainder rounding),
// summing to `ticks`. With more than one segment, any non-zero segment gets
// at least 2 ticks (its gap + one visible mark) so a tiny slice never
// disappears.
export function allocateTicks(values: number[], ticks: number = DONUT_TICKS): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const nonZero = values.filter((v) => v > 0).length;
  const minTicks = nonZero > 1 ? 2 : 1;

  const raw = values.map((v) => (v > 0 ? (v / total) * ticks : 0));
  const counts = raw.map((r, i) => (values[i] > 0 ? Math.max(minTicks, Math.floor(r)) : 0));
  let remaining = ticks - counts.reduce((a, b) => a + b, 0);

  const byRemainder = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .filter((o) => values[o.i] > 0)
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; remaining > 0 && byRemainder.length > 0; k++, remaining--) {
    counts[byRemainder[k % byRemainder.length].i]++;
  }
  // Over-allocated only because of the minimum — take back from the largest.
  while (remaining < 0) {
    const largest = counts.indexOf(Math.max(...counts));
    counts[largest]--;
    remaining++;
  }
  return counts;
}

// Which segment a tap at (x, y) inside a size×size chart lands on, or null
// if it's off the ring. The hit area extends past the drawn ring on both
// sides so it's easy to hit with a finger.
export function segmentAtPoint(
  x: number,
  y: number,
  size: number,
  thickness: number,
  counts: number[],
  slack = 14
): number | null {
  const center = size / 2;
  const dx = x - center;
  const dy = y - center;
  const r = Math.hypot(dx, dy);
  if (r < center - thickness - slack || r > center + slack) return null;
  const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360; // clockwise from 12 o'clock
  const tick = Math.min(DONUT_TICKS - 1, Math.floor(angle / DONUT_STEP_DEG));
  let end = 0;
  for (let i = 0; i < counts.length; i++) {
    end += counts[i];
    if (tick < end) return i;
  }
  return null;
}

export function percentLabel(value: number, total: number): string {
  if (total <= 0) return '0%';
  const pct = (value / total) * 100;
  if (pct > 0 && pct < 1) return '<1%';
  return `${Math.round(pct)}%`;
}
