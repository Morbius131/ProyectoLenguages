export interface Portal {
  a: string;
  b: string;
  colorIdx: number;
}

export interface GeneratedLevel {
  grid: number[][];
  portals: Portal[];
  rows: number;
  cols: number;
}

export const PORTAL_COLORS = [
  { hex: 0xcc44ff, css: '#cc44ff', dark: 0x440066 },
  { hex: 0xff3388, css: '#ff3388', dark: 0x660022 },
  { hex: 0x3399ff, css: '#3399ff', dark: 0x003366 },
  { hex: 0xff6600, css: '#ff6600', dark: 0x662200 },
  { hex: 0x00ffaa, css: '#00ffaa', dark: 0x005533 },
  { hex: 0xffee00, css: '#ffee00', dark: 0x665500 },
];

export class GLC {
  constructor(private state: number) {}

  private rng(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0xffffffff;
  }

  private ri(a: number, b: number): number {
    return a + Math.floor(this.rng() * (b - a + 1));
  }

  private pick<T>(items: T[]): T {
    return items[Math.floor(this.rng() * items.length)];
  }

  generate(level: number, portalCount: number, sizeBonus = 0): GeneratedLevel {
    const grow = Math.min(level - 1, 9);
    const rows = 9 + Math.floor(grow) + sizeBonus;
    const cols = 11 + Math.floor(grow * 1.2) + Math.floor(sizeBonus * 1.3);
    const grid = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) grid[r][c] = 1;
    }

    const blockCount = this.ri(2 + Math.floor(level / 2), 5 + Math.floor(level / 1.5));
    for (let i = 0; i < blockCount; i++) this.block(grid, rows, cols);

    const midR = Math.floor(rows / 2);
    const midC = Math.floor(cols / 2);
    for (let c = 1; c < cols - 1; c++) if (grid[midR][c] === 0) grid[midR][c] = 1;
    for (let r = 1; r < rows - 1; r++) if (grid[r][midC] === 0) grid[r][midC] = 1;

    const portals = this.portalPairs(grid, rows, cols, portalCount);
    let start: [number, number] | null = null;
    let exit: [number, number] | null = null;

    outer: for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r][c] === 1) {
          start = [r, c];
          grid[r][c] = 2;
          break outer;
        }
      }
    }

    outer2: for (let r = rows - 2; r >= 1; r--) {
      for (let c = cols - 2; c >= 1; c--) {
        if (grid[r][c] === 1) {
          exit = [r, c];
          grid[r][c] = 3;
          break outer2;
        }
      }
    }

    this.fixConnectivity(grid, rows, cols, start, exit);
    return { grid, portals, rows, cols };
  }

  private block(grid: number[][], rows: number, cols: number): void {
    const r = this.ri(2, rows - 3);
    const c = this.ri(2, cols - 3);
    const len = this.ri(2, Math.min(5, rows - 3, cols - 3));
    const direction = this.pick(['h', 'v', 'l', 't'] as const);
    const wall = (rr: number, cc: number) => {
      if (rr > 0 && rr < rows - 1 && cc > 0 && cc < cols - 1) grid[rr][cc] = 0;
    };

    if (direction === 'h') for (let i = 0; i < len; i++) wall(r, c + i);
    else if (direction === 'v') for (let i = 0; i < len; i++) wall(r + i, c);
    else if (direction === 'l') {
      for (let i = 0; i < len; i++) wall(r, c + i);
      for (let i = 1; i < len; i++) wall(r + i, c);
    } else {
      for (let i = 0; i < len; i++) wall(r, c + i);
      const mid = Math.floor(len / 2);
      for (let i = 1; i < len; i++) wall(r + i, c + mid);
    }
  }

  private portalPairs(grid: number[][], rows: number, cols: number, count: number): Portal[] {
    const free: Array<[number, number]> = [];
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) if (grid[r][c] === 1) free.push([r, c]);
    }

    const portals: Portal[] = [];
    for (let i = 0; i < count && free.length >= 2; i++) {
      const ai = Math.floor(this.rng() * free.length);
      const [ar, ac] = free.splice(ai, 1)[0];
      let bi = Math.floor(this.rng() * free.length);
      let tries = 0;

      while (
        free.length > 1 &&
        Math.abs(free[bi % free.length][0] - ar) + Math.abs(free[bi % free.length][1] - ac) < 4 &&
        tries++ < 12
      ) {
        bi = (bi + 1) % free.length;
      }

      const [br, bc] = free.splice(bi % free.length, 1)[0];
      const colorIdx = i % PORTAL_COLORS.length;
      grid[ar][ac] = 10 + colorIdx;
      grid[br][bc] = 10 + colorIdx;
      portals.push({ a: `${ar},${ac}`, b: `${br},${bc}`, colorIdx });
    }
    return portals;
  }

  private fixConnectivity(
    grid: number[][],
    rows: number,
    cols: number,
    start: [number, number] | null,
    exit: [number, number] | null
  ): void {
    if (!start || !exit) return;

    const visited = new Set([`${start[0]},${start[1]}`]);
    const queue: Array<[number, number]> = [[start[0], start[1]]];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let found = false;

    while (queue.length && !found) {
      const [r, c] = queue.shift()!;
      if (r === exit[0] && c === exit[1]) {
        found = true;
        break;
      }
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && !visited.has(key) && grid[nr][nc] !== 0) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }

    if (!found) {
      let [r, c] = start;
      const [er, ec] = exit;
      while (r !== er) {
        r += r < er ? 1 : -1;
        if (grid[r][c] === 0) grid[r][c] = 1;
      }
      while (c !== ec) {
        c += c < ec ? 1 : -1;
        if (grid[r][c] === 0) grid[r][c] = 1;
      }
    }
  }
}
