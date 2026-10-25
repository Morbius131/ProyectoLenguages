export const CELL = 48;

export const PAL = {
  wall: 0x1a1a2e,
  wallEdge: 0x2a2a44,
  floor: 0x0d0d18,
  exit: 0x003322,
  exitBorder: 0x00cc66,
  start: 0x001122,
  player: 0x00ffcc,
  playerDark: 0x007755,
  playerEye: 0xffffff,
  eP: 0xffcc00,
  eC: 0xcc00ff,
  eA: 0xff3355,
};

export const DIFFS = {
  1: { name: 'FACIL', spd: 75, vr: 4, pr: 2, lv: 5, mult: 1, base: 1, every: 4, cap: 4, sizeBonus: 0 },
  2: { name: 'MEDIO', spd: 130, vr: 5, pr: 3, lv: 3, mult: 2, base: 2, every: 3, cap: 6, sizeBonus: 0 },
  3: { name: 'DIFICIL', spd: 190, vr: 7, pr: 4, lv: 3, mult: 3, base: 3, every: 2, cap: 8, sizeBonus: 3 },
  4: { name: 'IMPOSIBLE', spd: 250, vr: 99, pr: 6, lv: 2, mult: 5, base: 4, every: 2, cap: 10, sizeBonus: 5 },
} as const;

export type DifficultyId = keyof typeof DIFFS;
export type Difficulty = (typeof DIFFS)[DifficultyId];
export type State = string;
export type SymbolKey = 'W' | 'S' | 'A' | 'D';

export function normalizeDifficulty(difficulty: number): DifficultyId {
  return difficulty === 2 || difficulty === 3 || difficulty === 4 ? difficulty : 1;
}

export function portalsForLevel(level: number, maxPortals: number): number {
  return Math.min(2 + Math.floor(level / 2), maxPortals);
}

export function enemiesForLevel(level: number, diff: Difficulty, rows: number, cols: number): number {
  const interior = (rows - 2) * (cols - 2);
  const maxBySize = Math.max(1, Math.floor(interior / 18));
  const byLevel = diff.base + Math.floor((level - 1) / diff.every);
  return Math.min(byLevel, maxBySize, diff.cap);
}

export function manhattan(a: State, b: State): number {
  const [r1, c1] = a.split(',').map(Number);
  const [r2, c2] = b.split(',').map(Number);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

export function cellToPixel(state: State): { x: number; y: number } {
  const [r, c] = state.split(',').map(Number);
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
}
