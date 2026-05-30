import { describe, expect, test } from 'vitest';
import type { Card, GameState, Rank, Suit } from '$lib/engine';
import {
  applyMove,
  canMoveToFoundation,
  canMoveToTableau,
  deal,
  isValidSequence,
  legalTargets,
} from '$lib/engine';

const card = (suit: Suit, rank: Rank, faceUp = true): Card => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
  faceUp,
});

const emptyState = (): GameState => ({
  seed: 0,
  draw: 1,
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  passes: 0,
  maxPasses: null,
  startedAt: null,
});

describe('canMoveToTableau', () => {
  test('King is accepted on an empty pile', () => {
    expect(canMoveToTableau(card('spades', 13), [])).toBe(true);
  });

  test('a non-King is rejected on an empty pile', () => {
    expect(canMoveToTableau(card('spades', 5), [])).toBe(false);
  });

  test('red 5 on black 6 is accepted', () => {
    expect(canMoveToTableau(card('hearts', 5), [card('spades', 6)])).toBe(true);
  });

  test('same-color (black on black) is rejected', () => {
    expect(canMoveToTableau(card('spades', 5), [card('clubs', 6)])).toBe(false);
  });

  test('non-consecutive rank is rejected', () => {
    expect(canMoveToTableau(card('hearts', 5), [card('spades', 7)])).toBe(false);
  });

  test('placing onto a face-down top card is rejected', () => {
    expect(canMoveToTableau(card('hearts', 5), [card('spades', 6, false)])).toBe(false);
  });

  test('Ace on an alternating 2 is accepted; on a same-color 2 rejected', () => {
    expect(canMoveToTableau(card('hearts', 1), [card('spades', 2)])).toBe(true);
    expect(canMoveToTableau(card('clubs', 1), [card('spades', 2)])).toBe(false);
  });
});

describe('canMoveToFoundation', () => {
  test('Ace is accepted on an empty foundation', () => {
    expect(canMoveToFoundation(card('hearts', 1), [])).toBe(true);
  });

  test('a non-Ace is rejected on an empty foundation', () => {
    expect(canMoveToFoundation(card('hearts', 5), [])).toBe(false);
  });

  test('2 of the same suit on an Ace is accepted', () => {
    expect(canMoveToFoundation(card('spades', 2), [card('spades', 1)])).toBe(true);
  });

  test('2 of a different suit on an Ace is rejected', () => {
    expect(canMoveToFoundation(card('hearts', 2), [card('spades', 1)])).toBe(false);
  });

  test('a non-sequential rank (3 on Ace) is rejected', () => {
    expect(canMoveToFoundation(card('spades', 3), [card('spades', 1)])).toBe(false);
  });

  test('King on Queen of the same suit is accepted', () => {
    expect(canMoveToFoundation(card('spades', 13), [card('spades', 12)])).toBe(true);
  });
});

describe('isValidSequence', () => {
  test('an empty array is trivially valid', () => {
    expect(isValidSequence([])).toBe(true);
  });

  test('a single face-up card is valid; a single face-down card is not', () => {
    expect(isValidSequence([card('spades', 5)])).toBe(true);
    expect(isValidSequence([card('spades', 5, false)])).toBe(false);
  });

  test('a descending, alternating, all-face-up run is valid', () => {
    expect(isValidSequence([card('spades', 8), card('hearts', 7), card('clubs', 6)])).toBe(true);
  });

  test('a face-down card anywhere makes it invalid', () => {
    expect(isValidSequence([card('spades', 8), card('hearts', 7, false), card('clubs', 6)])).toBe(
      false,
    );
  });

  test('a non-descending run is invalid', () => {
    expect(isValidSequence([card('spades', 8), card('hearts', 6)])).toBe(false);
  });

  test('adjacent same-color cards make it invalid', () => {
    expect(isValidSequence([card('spades', 8), card('clubs', 7)])).toBe(false);
  });
});

describe('legalTargets', () => {
  test('every returned target for a real dealt state is actually legal', () => {
    const state = deal(1, 1);
    for (let i = 0; i < 7; i++) {
      const from = { kind: 'tableau', index: i } as const;
      const top = state.tableau[i]?.[i];
      for (const target of legalTargets(state, from)) {
        if (target.kind === 'tableau') {
          expect(canMoveToTableau(top as Card, state.tableau[target.index] as Card[])).toBe(true);
        } else {
          expect(canMoveToFoundation(top as Card, state.foundations[target.index] as Card[])).toBe(
            true,
          );
        }
      }
    }
  });

  test('a red 5 finds the black-6 tableau pile and the matching foundation', () => {
    const state = emptyState();
    state.tableau[0] = [card('hearts', 5)];
    state.tableau[1] = [card('spades', 6)];
    state.tableau[2] = [];
    state.foundations[0] = [card('hearts', 4)];
    const targets = legalTargets(state, { kind: 'tableau', index: 0 });
    expect(targets).toContainEqual({ kind: 'tableau', index: 1 });
    expect(targets).toContainEqual({ kind: 'foundation', index: 0 });
    expect(targets).not.toContainEqual({ kind: 'tableau', index: 2 });
  });

  test('no legal destination yields an empty array', () => {
    const state = emptyState();
    state.tableau[0] = [card('hearts', 5)];
    expect(legalTargets(state, { kind: 'tableau', index: 0 })).toEqual([]);
  });

  test('an Ace on top of the waste targets only the matching empty foundation', () => {
    const state = emptyState();
    state.waste = [card('hearts', 1)];
    state.foundations[0] = [];
    state.foundations[1] = [card('spades', 1)];
    state.foundations[2] = [card('clubs', 1)];
    state.foundations[3] = [card('diamonds', 1)];
    expect(legalTargets(state, { kind: 'waste', index: 0 })).toEqual([
      { kind: 'foundation', index: 0 },
    ]);
  });

  test('a stock source is never movable', () => {
    const state = deal(3, 1);
    expect(legalTargets(state, { kind: 'stock', index: 0 })).toEqual([]);
  });

  test('a foundation card can move back to a tableau pile (worrying back)', () => {
    const state = emptyState();
    state.foundations[0] = [card('hearts', 1), card('hearts', 2), card('hearts', 3)];
    state.tableau[0] = [card('spades', 4)];
    const targets = legalTargets(state, { kind: 'foundation', index: 0 });
    expect(targets).toContainEqual({ kind: 'tableau', index: 0 });
  });

  test('an empty source pile (tableau, waste, or foundation) yields no targets', () => {
    const state = emptyState();
    expect(legalTargets(state, { kind: 'tableau', index: 0 })).toEqual([]);
    expect(legalTargets(state, { kind: 'waste', index: 0 })).toEqual([]);
    expect(legalTargets(state, { kind: 'foundation', index: 0 })).toEqual([]);
  });

  test('a multi-card face-up run offers tableau targets but never a foundation', () => {
    const state = emptyState();
    state.tableau[0] = [card('spades', 8), card('hearts', 7)];
    state.tableau[1] = [card('diamonds', 9)];
    state.foundations[0] = [];
    const targets = legalTargets(state, { kind: 'tableau', index: 0 });
    expect(targets).toContainEqual({ kind: 'tableau', index: 1 });
    expect(targets.some((t) => t.kind === 'foundation')).toBe(false);
  });

  test('an unordered face-up pair only moves its top card, not the pair', () => {
    const state = emptyState();
    state.tableau[0] = [card('spades', 7), card('hearts', 5)]; // 7♠,5♥ is not an ordered run
    state.tableau[1] = [card('hearts', 8)]; // 7♠ would build here IF the pair were movable
    state.tableau[2] = [card('spades', 6)]; // 5♥ (the real block) builds onto 6♠
    const targets = legalTargets(state, { kind: 'tableau', index: 0 });
    expect(targets).not.toContainEqual({ kind: 'tableau', index: 1 });
    expect(targets).toContainEqual({ kind: 'tableau', index: 2 });
    expect(targets.some((t) => t.kind === 'tableau' && t.index === 0)).toBe(false);
  });
});

describe('applyMove', () => {
  test('returns a fresh state object and an events array', () => {
    const state = emptyState();
    state.tableau[0] = [card('hearts', 5)];
    state.tableau[1] = [card('spades', 6)];
    const result = applyMove(state, {
      type: 'move',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 1,
    });
    expect(result.state).not.toBe(state);
    expect(Array.isArray(result.events)).toBe(true);
  });

  test('a single tableau move flips the newly exposed face-down card', () => {
    const state = emptyState();
    state.tableau[0] = [card('clubs', 9, false), card('hearts', 5, true)];
    state.tableau[1] = [card('spades', 6)];
    const result = applyMove(state, {
      type: 'move',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 1,
    });
    expect(result.state.tableau[0]).toHaveLength(1);
    expect(result.state.tableau[0]?.[0]?.faceUp).toBe(true);
    expect(result.state.tableau[1]).toHaveLength(2);
    expect(result.events).toContainEqual({
      kind: 'moved',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 1,
    });
    expect(result.events).toContainEqual({ kind: 'flip', pile: { kind: 'tableau', index: 0 } });
    // original untouched
    expect(state.tableau[0]?.[0]?.faceUp).toBe(false);
    expect(state.tableau[0]).toHaveLength(2);
  });

  test('a move that exposes nothing emits no flip', () => {
    const state = emptyState();
    state.tableau[0] = [card('hearts', 5)];
    state.tableau[1] = [card('spades', 6)];
    const result = applyMove(state, {
      type: 'move',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 1,
    });
    expect(result.state.tableau[0]).toHaveLength(0);
    expect(result.events.some((e) => e.kind === 'flip')).toBe(false);
  });

  test('a tableau move leaving an already-face-up card on top emits no flip', () => {
    const state = emptyState();
    state.tableau[0] = [card('spades', 7), card('hearts', 6)];
    state.tableau[1] = [card('clubs', 7)];
    const result = applyMove(state, {
      type: 'move',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 1,
    });
    expect(result.state.tableau[0]).toHaveLength(1);
    expect(result.state.tableau[0]?.[0]?.faceUp).toBe(true);
    expect(result.events.some((e) => e.kind === 'flip')).toBe(false);
  });

  test('a 3-card supermove moves the whole block with count 3', () => {
    const state = emptyState();
    state.tableau[0] = [card('spades', 8), card('hearts', 7), card('clubs', 6)];
    state.tableau[1] = [card('hearts', 9)];
    const result = applyMove(state, {
      type: 'move',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 3,
    });
    expect(result.state.tableau[0]).toHaveLength(0);
    expect(result.state.tableau[1]).toHaveLength(4);
    expect(result.events).toContainEqual({
      kind: 'moved',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 3,
    });
  });

  test('moving a card to a foundation updates both piles', () => {
    const state = emptyState();
    state.tableau[0] = [card('hearts', 1)];
    const result = applyMove(state, {
      type: 'move',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'foundation', index: 0 },
      count: 1,
    });
    expect(result.state.tableau[0]).toHaveLength(0);
    expect(result.state.foundations[0]).toHaveLength(1);
    expect(result.state.foundations[0]?.[0]?.id).toBe('hearts-1');
  });

  test('moving the top of the waste onto a tableau pile works', () => {
    const state = emptyState();
    state.waste = [card('hearts', 5)];
    state.tableau[1] = [card('spades', 6)];
    const result = applyMove(state, {
      type: 'move',
      from: { kind: 'waste', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 1,
    });
    expect(result.state.waste).toHaveLength(0);
    expect(result.state.tableau[1]).toHaveLength(2);
    expect(result.events.some((e) => e.kind === 'flip')).toBe(false);
  });

  test('does not mutate the original state', () => {
    const state = emptyState();
    state.tableau[0] = [card('hearts', 5)];
    state.tableau[1] = [card('spades', 6)];
    const before = JSON.stringify(state);
    applyMove(state, {
      type: 'move',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 1,
    });
    expect(JSON.stringify(state)).toBe(before);
  });

  test('clones every pile (stock, waste, foundations included) into fresh objects', () => {
    const state = emptyState();
    state.stock = [card('clubs', 2, false), card('clubs', 3, false)];
    state.waste = [card('diamonds', 9)];
    state.foundations[0] = [card('hearts', 1)];
    state.tableau[0] = [card('hearts', 5)];
    state.tableau[1] = [card('spades', 6)];
    const before = JSON.stringify(state);
    const result = applyMove(state, {
      type: 'move',
      from: { kind: 'tableau', index: 0 },
      to: { kind: 'tableau', index: 1 },
      count: 1,
    });
    expect(JSON.stringify(state)).toBe(before);
    expect(result.state.stock).not.toBe(state.stock);
    expect(result.state.stock[0]).not.toBe(state.stock[0]);
    expect(result.state.waste).not.toBe(state.waste);
    expect(result.state.foundations[0]).not.toBe(state.foundations[0]);
    // An untouched tableau card must also be a fresh object (deep clone).
    expect(result.state.tableau[1]?.[0]).not.toBe(state.tableau[1]?.[0]);
  });

  test('an unimplemented move type throws', () => {
    expect(() => applyMove(emptyState(), { type: 'draw' })).toThrow(/not implemented/);
  });
});
