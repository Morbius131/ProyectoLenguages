export type State = string;
export type Symbol = 'W' | 'S' | 'A' | 'D';
export type MazeMap = string[] | number[][];

export class AFD {
  readonly rows: number;
  readonly cols: number;
  readonly states = new Set<State>();
  readonly alphabet: Symbol[] = ['W', 'S', 'A', 'D'];
  readonly startState: State;
  readonly finalState: State;

  constructor(private mapa: MazeMap) {
    this.rows = mapa.length;
    this.cols = mapa[0].length;

    let startState = '';
    let finalState = '';

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cell(r, c);
        if (!this.isWall(cell)) {
          const key = `${r},${c}`;
          this.states.add(key);
          if (cell === 'P' || cell === 2) startState = key;
          if (cell === 'E' || cell === 3) finalState = key;
        }
      }
    }

    this.startState = startState;
    this.finalState = finalState;
  }

  delta(state: State, symbol: Symbol): State {
    const [r, c] = state.split(',').map(Number);
    const moves: Record<Symbol, [number, number]> = {
      W: [-1, 0],
      S: [1, 0],
      A: [0, -1],
      D: [0, 1],
    };
    const [dr, dc] = moves[symbol];
    const nr = r + dr;
    const nc = c + dc;

    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) return state;
    if (this.isWall(this.cell(nr, nc))) return state;
    return `${nr},${nc}`;
  }

  isValid(r: number, c: number): boolean {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols && !this.isWall(this.cell(r, c));
  }

  isFinal(state: State): boolean {
    return state === this.finalState;
  }

  getCell(r: number, c: number): string | number {
    return this.cell(r, c);
  }

  getMapa(): MazeMap {
    return this.mapa;
  }

  minimize(): Map<State, number> {
    const stateList = Array.from(this.states);
    const finals = new Set([this.finalState]);
    let partition: Set<State>[] = [
      new Set(stateList.filter((state) => finals.has(state))),
      new Set(stateList.filter((state) => !finals.has(state))),
    ].filter((group) => group.size > 0);

    let changed = true;
    while (changed) {
      changed = false;
      const nextPartition: Set<State>[] = [];
      for (const group of partition) {
        const subgroups = this.refine(group, partition);
        if (subgroups.length > 1) changed = true;
        nextPartition.push(...subgroups);
      }
      partition = nextPartition;
    }

    const stateToGroup = new Map<State, number>();
    partition.forEach((group, index) => group.forEach((state) => stateToGroup.set(state, index)));
    return stateToGroup;
  }

  private refine(group: Set<State>, partition: Set<State>[]): Set<State>[] {
    const representative = Array.from(group)[0];
    const subgroups: Set<State>[] = [new Set([representative])];

    for (const state of group) {
      if (state === representative) continue;
      let merged = false;

      for (const subgroup of subgroups) {
        const rep = Array.from(subgroup)[0];
        if (this.equivalent(state, rep, partition)) {
          subgroup.add(state);
          merged = true;
          break;
        }
      }
      if (!merged) subgroups.push(new Set([state]));
    }

    return subgroups;
  }

  private equivalent(a: State, b: State, partition: Set<State>[]): boolean {
    for (const sym of this.alphabet) {
      const t1 = this.delta(a, sym);
      const t2 = this.delta(b, sym);
      const g1 = partition.findIndex((group) => group.has(t1));
      const g2 = partition.findIndex((group) => group.has(t2));
      if (g1 !== g2) return false;
    }
    return true;
  }

  private cell(r: number, c: number): string | number {
    return Array.isArray(this.mapa[r]) ? (this.mapa as number[][])[r][c] : (this.mapa as string[])[r][c];
  }

  private isWall(cell: string | number): boolean {
    return cell === '#' || cell === 0;
  }
}
