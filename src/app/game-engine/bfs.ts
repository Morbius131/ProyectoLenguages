import type { MazeMap } from './afd';

export type State = string;

const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function bfs(mapa: MazeMap, from: State, to: State): State[] {
  if (from === to) return [];

  const rows = mapa.length;
  const cols = mapa[0].length;
  const visited = new Set<State>([from]);
  const queue: [State, State[]][] = [[from, []]];

  while (queue.length > 0) {
    const [pos, path] = queue.shift()!;
    const [r, c] = pos.split(',').map(Number);

    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (isWall(cellAt(mapa, nr, nc))) continue;

      const next: State = `${nr},${nc}`;
      if (visited.has(next)) continue;

      const nextPath = [...path, next];
      if (next === to) return nextPath;

      visited.add(next);
      queue.push([next, nextPath]);
    }
  }

  return [];
}

export function manhattanDistance(a: State, b: State): number {
  const [r1, c1] = a.split(',').map(Number);
  const [r2, c2] = b.split(',').map(Number);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function cellAt(mapa: MazeMap, r: number, c: number): string | number {
  return Array.isArray(mapa[r]) ? (mapa as number[][])[r][c] : (mapa as string[])[r][c];
}

function isWall(cell: string | number): boolean {
  return cell === '#' || cell === 0;
}
