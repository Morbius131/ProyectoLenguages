import type { Portal } from './glc';

export type State = string;

export class LambdaTransitions {
  private readonly table = new Map<State, State>();
  private readonly colorMap = new Map<State, number>();

  constructor(portals: Portal[]) {
    for (const { a, b, colorIdx } of portals) {
      this.table.set(a, b);
      this.table.set(b, a);
      this.colorMap.set(a, colorIdx);
      this.colorMap.set(b, colorIdx);
    }
  }

  epsilonClosure(state: State): Set<State> {
    const closure = new Set<State>([state]);
    const queue: State[] = [state];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const destination = this.table.get(current);
      if (destination && !closure.has(destination)) {
        closure.add(destination);
        queue.push(destination);
      }
    }

    return closure;
  }

  applyLambda(state: State): State | null {
    return this.table.get(state) ?? null;
  }

  isPortal(state: State): boolean {
    return this.table.has(state);
  }

  colorOf(state: State): number {
    return this.colorMap.get(state) ?? 0;
  }

  getAllTransitions(): Array<{ from: State; to: State }> {
    const result: Array<{ from: State; to: State }> = [];
    const seen = new Set<string>();

    for (const [from, to] of this.table) {
      const key = [from, to].sort().join('->');
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ from, to });
      }
    }

    return result;
  }

  get portalCount(): number {
    return this.table.size / 2;
  }
}

export { LambdaTransitions as Lambda };
