/**
 * Máquina de Mealy — IA del Enemigo
 *
 *   M = (Q, Σ, Λ, δ, λ, q0)
 *
 *   Q = { patrullando, persiguiendo, atacando }
 *   Σ = { lejos, cerca, adyacente }           distancia al jugador
 *   Λ = { patrullar, perseguir, atacar }     acciones de output
 *   δ: Q × Σ → Q                             función de transición
 *   λ: Q × Σ → Λ                            función de output (Mealy)
 *   q0 = patrullando
 *
 * Tabla de transiciones + outputs:
 *   δ(patrullando,  lejos)      → patrullando   / λ = patrullar
 *   δ(patrullando,  cerca)      → persiguiendo  / λ = perseguir
 *   δ(patrullando,  adyacente)  → atacando      / λ = atacar
 *   δ(persiguiendo, lejos)      → patrullando   / λ = patrullar
 *   δ(persiguiendo, cerca)      → persiguiendo  / λ = perseguir
 *   δ(persiguiendo, adyacente)  → atacando      / λ = atacar
 *   δ(atacando,     lejos)      → patrullando   / λ = patrullar
 *   δ(atacando,     cerca)      → persiguiendo  / λ = perseguir
 *   δ(atacando,     adyacente)  → atacando      / λ = atacar
 */

export type MealyState = "patrullando" | "persiguiendo" | "atacando";
export type MealyInput = "lejos" | "cerca" | "adyacente";
export type MealyOutput = "patrullar" | "perseguir" | "atacar";

export interface MealyResult {
  newState: MealyState;
  action: MealyOutput;
  input: MealyInput;
}

export class EnemyMealy {
  state: MealyState = "patrullando";

  /** Tabla de transición */
  private readonly transitions: Record<
    MealyState,
    Record<MealyInput, MealyState>
  > = {
    patrullando: {
      lejos: "patrullando",
      cerca: "persiguiendo",
      adyacente: "atacando",
    },
    persiguiendo: {
      lejos: "patrullando",
      cerca: "persiguiendo",
      adyacente: "atacando",
    },
    atacando: {
      lejos: "patrullando",
      cerca: "persiguiendo",
      adyacente: "atacando",
    },
  };

  /** Función de output λ */
  private readonly outputs: Record<
    MealyState,
    Record<MealyInput, MealyOutput>
  > = {
    patrullando: {
      lejos: "patrullar",
      cerca: "perseguir",
      adyacente: "atacar",
    },
    persiguiendo: {
      lejos: "patrullar",
      cerca: "perseguir",
      adyacente: "atacar",
    },
    atacando: {
      lejos: "patrullar",
      cerca: "perseguir",
      adyacente: "atacar",
    },
  };

  /**
   * Clasifica la distancia Manhattan como símbolo de entrada Σ
   */
  classify(
    dist: number,
    nearThreshold: number,
    adjThreshold: number = 1.5
  ): MealyInput {
    if (dist <= adjThreshold) return "adyacente";
    if (dist <= nearThreshold) return "cerca";
    return "lejos";
  }

  /**
   * Ejecuta un paso de la máquina de Mealy:
   * 1. Clasifica la distancia → símbolo de entrada
   * 2. Aplica λ → output (acción)
   * 3. Aplica δ → nuevo estado
   * Retorna el resultado con estado, acción e input clasificado.
   */
  step(
    dist: number,
    nearThreshold: number,
    adjThreshold: number = 1.5
  ): MealyResult {
    const input = this.classify(dist, nearThreshold, adjThreshold);
    const action = this.outputs[this.state][input];
    const newState = this.transitions[this.state][input];
    this.state = newState;
    return { newState, action, input };
  }

  reset(): void {
    this.state = "patrullando";
  }
}
