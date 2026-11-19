export interface SeededRng {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, maxInclusive: number) => number;
}

export function createRng(seed: number): SeededRng {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, maxInclusive: number) =>
      Math.floor(min + (maxInclusive - min + 1) * next()),
  };
}

export function getSeedFromUrl(search: string = typeof window !== 'undefined' ? window.location.search : ''): number {
  const params = new URLSearchParams(search);
  const raw = params.get('seed');
  if (!raw) return 20261113;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 20261113;
}
