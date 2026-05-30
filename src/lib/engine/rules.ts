import type { Card, GameState, PileRef } from './types';
import { suitColor } from './types';

/** A card may land on a tableau pile only as a King on empty, or one rank lower
 * and opposite color on a face-up top card. */
export function canMoveToTableau(card: Card, target: Card[]): boolean {
  if (target.length === 0) return card.rank === 13;
  const top = target[target.length - 1] as Card;
  return top.faceUp && card.rank === top.rank - 1 && suitColor(card.suit) !== suitColor(top.suit);
}

/** A card may go to a foundation only as an Ace on empty, or one rank higher of
 * the same suit. */
export function canMoveToFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1] as Card;
  return card.suit === top.suit && card.rank === top.rank + 1;
}

/** True when `cards` form a contiguous tableau sequence (all face-up, each card
 * one rank below and opposite color of the previous). Empty and single face-up
 * runs are valid. */
export function isValidSequence(cards: Card[]): boolean {
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i] as Card;
    if (!card.faceUp) return false;
    if (i > 0) {
      const prev = cards[i - 1] as Card;
      if (card.rank !== prev.rank - 1) return false;
      if (suitColor(card.suit) === suitColor(prev.suit)) return false;
    }
  }
  return true;
}

/** The face-up block that would move from `from`: the whole face-up suffix of a
 * tableau pile, or the single top card of waste/foundation. Stock is not movable. */
function movingBlock(state: GameState, from: PileRef): Card[] {
  if (from.kind === 'tableau') {
    const pile = state.tableau[from.index] as Card[];
    const faceUpStart = pile.findIndex((c) => c.faceUp);
    if (faceUpStart === -1) return [];
    // Trim the face-up suffix to its longest ordered (descending, alternating)
    // run from the top — only such a run is a legal supermove block.
    let start = pile.length - 1;
    for (let i = pile.length - 2; i >= faceUpStart; i--) {
      const card = pile[i] as Card;
      const above = pile[i + 1] as Card;
      if (above.rank !== card.rank - 1 || suitColor(above.suit) === suitColor(card.suit)) break;
      start = i;
    }
    return pile.slice(start);
  }
  if (from.kind === 'waste') {
    const top = state.waste[state.waste.length - 1];
    return top === undefined ? [] : [top];
  }
  if (from.kind === 'foundation') {
    const pile = state.foundations[from.index] as Card[];
    const top = pile[pile.length - 1];
    return top === undefined ? [] : [top];
  }
  return [];
}

/** Legal destination piles for the movable block at `from`. The block's bottom
 * card determines tableau targets; foundations are offered only for single-card
 * blocks. */
export function legalTargets(state: GameState, from: PileRef): PileRef[] {
  const block = movingBlock(state, from);
  if (block.length === 0) return [];
  const bottom = block[0] as Card;
  const single = block.length === 1 ? bottom : null;

  const targets: PileRef[] = [];

  for (let i = 0; i < state.tableau.length; i++) {
    if (from.kind === 'tableau' && from.index === i) continue;
    if (canMoveToTableau(bottom, state.tableau[i] as Card[])) {
      targets.push({ kind: 'tableau', index: i });
    }
  }

  if (single) {
    for (let i = 0; i < state.foundations.length; i++) {
      if (from.kind === 'foundation' && from.index === i) continue;
      if (canMoveToFoundation(single, state.foundations[i] as Card[])) {
        targets.push({ kind: 'foundation', index: i });
      }
    }
  }

  return targets;
}
