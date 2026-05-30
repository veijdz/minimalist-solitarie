import type { Card, GameEvent, GameState, Move, MoveResult, PileRef } from './types';

/** Structural clone: every pile array and card object is fresh, so callers may
 * mutate the returned state without touching the input. */
function cloneState(state: GameState): GameState {
  return {
    ...state,
    stock: state.stock.map((c) => ({ ...c })),
    waste: state.waste.map((c) => ({ ...c })),
    foundations: state.foundations.map((f) => f.map((c) => ({ ...c }))) as GameState['foundations'],
    tableau: state.tableau.map((t) => t.map((c) => ({ ...c }))) as GameState['tableau'],
  };
}

/** Returns the (mutable) card array for `ref` within `state`. */
function pileArray(state: GameState, ref: PileRef): Card[] {
  if (ref.kind === 'tableau') return state.tableau[ref.index] as Card[];
  if (ref.kind === 'foundation') return state.foundations[ref.index] as Card[];
  // A card move never targets the stock; only waste remains.
  return state.waste;
}

/** Applies an already-validated card move, returning a new state and the events
 * it produced. Never mutates `state`. */
function applyCardMove(state: GameState, move: Extract<Move, { type: 'move' }>): MoveResult {
  const next = cloneState(state);
  const from = pileArray(next, move.from);
  const to = pileArray(next, move.to);

  const moved = from.splice(from.length - move.count, move.count);
  to.push(...moved);

  const events: GameEvent[] = [{ kind: 'moved', from: move.from, to: move.to, count: move.count }];

  if (move.from.kind === 'tableau' && from.length > 0) {
    const exposed = from[from.length - 1] as Card;
    if (!exposed.faceUp) {
      from[from.length - 1] = { ...exposed, faceUp: true };
      events.push({ kind: 'flip', pile: move.from });
    }
  }

  return { state: next, events };
}

/** Pure transition: applies `move` to `state` and returns `{ state, events }`.
 * Assumes the move is legal (callers validate via rules.ts). */
export function applyMove(state: GameState, move: Move): MoveResult {
  if (move.type === 'move') return applyCardMove(state, move);
  throw new Error(`applyMove: '${move.type}' not implemented`);
}
