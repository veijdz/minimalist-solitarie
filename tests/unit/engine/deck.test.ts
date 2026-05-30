import { describe, expect, test } from 'vitest';
import type { DrawMode, GameEvent, GameState, MoveResult, ScoringMode } from '$lib/engine';
import { createDeck, mulberry32, shuffle, suitColor } from '$lib/engine';

describe('createDeck', () => {
  const deck = createDeck();

  test('returns exactly 52 cards', () => {
    expect(deck).toHaveLength(52);
  });

  test('all ids are unique', () => {
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  test('ids follow the stable suit-rank pattern', () => {
    expect(deck.find((c) => c.suit === 'hearts' && c.rank === 1)?.id).toBe('hearts-1');
    expect(deck.find((c) => c.suit === 'spades' && c.rank === 13)?.id).toBe('spades-13');
    expect(deck.every((c) => c.id === `${c.suit}-${c.rank}`)).toBe(true);
  });

  test('each suit appears exactly 13 times', () => {
    for (const suit of ['clubs', 'diamonds', 'hearts', 'spades'] as const) {
      expect(deck.filter((c) => c.suit === suit)).toHaveLength(13);
    }
  });

  test('each rank appears exactly 4 times', () => {
    for (let rank = 1; rank <= 13; rank++) {
      expect(deck.filter((c) => c.rank === rank)).toHaveLength(4);
    }
  });

  test('each (suit, rank) combination appears exactly once', () => {
    expect(new Set(deck.map((c) => `${c.suit}-${c.rank}`)).size).toBe(52);
  });

  test('all cards are face-down', () => {
    expect(deck.every((c) => c.faceUp === false)).toBe(true);
  });
});

describe('suitColor', () => {
  test('red suits are red', () => {
    expect(suitColor('hearts')).toBe('red');
    expect(suitColor('diamonds')).toBe('red');
  });

  test('black suits are black', () => {
    expect(suitColor('clubs')).toBe('black');
    expect(suitColor('spades')).toBe('black');
  });
});

describe('mulberry32', () => {
  test('returns values in [0, 1)', () => {
    const rand = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('same seed produces an identical sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  test('different seeds produce different sequences', () => {
    const a = mulberry32(42);
    const b = mulberry32(1337);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe('shuffle', () => {
  test('is deterministic for the same seed', () => {
    const deck = createDeck();
    const s1 = shuffle(deck, 42).map((c) => c.id);
    const s2 = shuffle(deck, 42).map((c) => c.id);
    expect(s1).toEqual(s2);
  });

  test('varies by seed', () => {
    const deck = createDeck();
    const s1 = shuffle(deck, 42).map((c) => c.id);
    const s2 = shuffle(deck, 1337).map((c) => c.id);
    expect(s1).not.toEqual(s2);
  });

  test('does not mutate the input array', () => {
    const deck = createDeck();
    const snapshot = deck.map((c) => c.id);
    shuffle(deck, 42);
    expect(deck.map((c) => c.id)).toEqual(snapshot);
  });

  test('preserves all 52 ids, only reordered', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck, 99);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled.map((c) => c.id))).toEqual(new Set(deck.map((c) => c.id)));
  });

  test('empty and single-element arrays are returned unchanged', () => {
    expect(shuffle<number>([], 1)).toEqual([]);
    expect(shuffle([7], 1)).toEqual([7]);
  });
});

test('engine types accept the canonical values without `any`', () => {
  const events: GameEvent[] = [
    { kind: 'draw', count: 3 },
    { kind: 'recycle' },
    {
      kind: 'moved',
      from: { kind: 'waste', index: 0 },
      to: { kind: 'tableau', index: 2 },
      count: 1,
    },
    { kind: 'flip', pile: { kind: 'tableau', index: 0 } },
    { kind: 'toFoundation', from: { kind: 'tableau', index: 3 } },
    { kind: 'fromFoundation', to: { kind: 'tableau', index: 1 } },
  ];
  const state: GameState = {
    seed: 1,
    draw: 1,
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    passes: 0,
    maxPasses: null,
    startedAt: null,
  };
  const result: MoveResult = { state, events };
  const draw: DrawMode = 3;
  const scoring: ScoringMode = 'vegas';

  expect(result.events).toHaveLength(6);
  expect(result.state.maxPasses).toBeNull();
  expect(draw).toBe(3);
  expect(scoring).toBe('vegas');
});
