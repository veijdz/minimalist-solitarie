import { describe, expect, test } from 'vitest';
import type { Card } from '$lib/engine';
import { createDeck, deal } from '$lib/engine';

const allCards = (state: ReturnType<typeof deal>): Card[] => [
  ...state.tableau.flat(),
  ...state.stock,
  ...state.waste,
  ...state.foundations.flat(),
];

describe('deal', () => {
  const state = deal(7, 1);

  test('distributes all 52 cards across tableau and stock', () => {
    const tableauCount = state.tableau.reduce((sum, pile) => sum + pile.length, 0);
    expect(tableauCount + state.stock.length).toBe(52);
  });

  test('has exactly 7 tableau piles with i+1 cards each', () => {
    expect(state.tableau).toHaveLength(7);
    state.tableau.forEach((pile, i) => {
      expect(pile).toHaveLength(i + 1);
    });
  });

  test('only the top card of each tableau pile is face-up', () => {
    state.tableau.forEach((pile, i) => {
      pile.forEach((card, j) => {
        expect(card.faceUp).toBe(j === i);
      });
    });
  });

  test('stock holds 24 face-down cards', () => {
    expect(state.stock).toHaveLength(24);
    expect(state.stock.every((c) => c.faceUp === false)).toBe(true);
  });

  test('waste starts empty', () => {
    expect(state.waste).toHaveLength(0);
  });

  test('foundations are four empty piles', () => {
    expect(state.foundations).toHaveLength(4);
    expect(state.foundations.every((f) => f.length === 0)).toBe(true);
  });

  test('passes is 0, maxPasses unlimited, startedAt null', () => {
    expect(state.passes).toBe(0);
    expect(state.maxPasses).toBeNull();
    expect(state.startedAt).toBeNull();
  });

  test('contains exactly the 52 canonical deck ids (none missing, foreign, or duplicated)', () => {
    const ids = allCards(state).map((c) => c.id);
    expect(ids).toHaveLength(52);
    expect(new Set(ids)).toEqual(new Set(createDeck().map((c) => c.id)));
  });
});

describe('deal determinism', () => {
  test('same seed produces identical card order', () => {
    const a = deal(7, 1);
    const b = deal(7, 1);
    expect(allCards(a).map((c) => c.id)).toEqual(allCards(b).map((c) => c.id));
  });

  test('different seeds produce different deals', () => {
    expect(allCards(deal(1, 1)).map((c) => c.id)).not.toEqual(
      allCards(deal(2, 1)).map((c) => c.id),
    );
  });

  test('draw mode is preserved in the returned state', () => {
    expect(deal(1, 1).draw).toBe(1);
    expect(deal(1, 3).draw).toBe(3);
  });

  test('successive deals return independent card objects (no shared references)', () => {
    const first = deal(5, 1);
    const second = deal(5, 1);
    expect(first.tableau[6]?.[6]?.faceUp).toBe(true);
    expect(second.tableau[6]?.[6]?.faceUp).toBe(true);
    // Same seed, same layout, but the card objects must not be aliased —
    // undo/redo snapshots rely on each deal producing fresh objects.
    expect(first.tableau[6]?.[6]).not.toBe(second.tableau[6]?.[6]);
  });
});
