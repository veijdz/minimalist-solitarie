export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export type PileKind = 'stock' | 'waste' | 'foundation' | 'tableau';

export interface PileRef {
  kind: PileKind;
  index: number;
}

export interface Pile {
  kind: PileKind;
  index: number;
  cards: Card[];
}

export type DrawMode = 1 | 3;
export type ScoringMode = 'padrao' | 'vegas' | 'relaxado';

export interface GameState {
  seed: number;
  draw: DrawMode;
  stock: Card[];
  waste: Card[];
  /** One pile per suit, fixed order. Built ascending, same suit (A..K). */
  foundations: [Card[], Card[], Card[], Card[]];
  tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]];
  /** Recycle cycles already used. */
  passes: number;
  /** Maximum recycle passes allowed; `null` = unlimited. */
  maxPasses: number | null;
  startedAt: number | null;
}

export type Move =
  | { type: 'draw' }
  | { type: 'recycle' }
  | { type: 'move'; from: PileRef; to: PileRef; count: number }
  | { type: 'autoFoundation'; from: PileRef };

export type GameEvent =
  | { kind: 'draw'; count: number }
  | { kind: 'recycle' }
  | { kind: 'moved'; from: PileRef; to: PileRef; count: number }
  | { kind: 'flip'; pile: PileRef }
  | { kind: 'toFoundation'; from: PileRef }
  | { kind: 'fromFoundation'; to: PileRef };

export interface MoveResult {
  state: GameState;
  events: GameEvent[];
}

export function suitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}
