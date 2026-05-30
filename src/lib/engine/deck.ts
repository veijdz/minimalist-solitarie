import { shuffle } from './rng';
import type { Card, DrawMode, GameState, Rank, Suit } from './types';

/** Stable suit order, used for deterministic deck generation and tests. */
const SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/** Builds a fresh 52-card deck, all face-down, with stable `suit-rank` ids. */
export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
    }
  }
  return cards;
}

/**
 * Builds the initial Klondike layout for a given seed: 7 tableau piles
 * (pile i holds i+1 cards, only its top card face-up), 24 face-down cards in
 * the stock, and empty waste/foundations. Pure and deterministic per seed.
 */
export function deal(seed: number, draw: DrawMode): GameState {
  const shuffled = shuffle(createDeck(), seed);
  let next = 0;

  const tableau: Card[][] = [];
  for (let i = 0; i < 7; i++) {
    const pile: Card[] = [];
    for (let j = 0; j <= i; j++) {
      const card = shuffled[next] as Card;
      next++;
      pile.push({ ...card, faceUp: j === i });
    }
    tableau.push(pile);
  }

  const stock = shuffled.slice(next).map((card) => ({ ...card, faceUp: false }));

  return {
    seed,
    draw,
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau: tableau as [Card[], Card[], Card[], Card[], Card[], Card[], Card[]],
    passes: 0,
    maxPasses: null,
    startedAt: null,
  };
}
