import type { Card, Rank } from './deck';
import { RANK_VALUES } from './deck';

export type HandRank =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-of-a-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'one-pair'
  | 'high-card';

export const HAND_RANK_VALUES: Record<HandRank, number> = {
  'high-card': 0,
  'one-pair': 1,
  'two-pair': 2,
  'three-of-a-kind': 3,
  'straight': 4,
  'flush': 5,
  'full-house': 6,
  'four-of-a-kind': 7,
  'straight-flush': 8,
  'royal-flush': 9,
};

export interface HandResult {
  rank: HandRank;
  value: number; // for comparing same-rank hands
  cards: Card[]; // best 5 cards
  description: string;
}

function getCombinations(cards: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (cards.length < k) return [];
  const result: Card[][] = [];
  const first = cards[0];
  const rest = cards.slice(1);
  // combos that include first
  for (const combo of getCombinations(rest, k - 1)) {
    result.push([first, ...combo]);
  }
  // combos that don't include first
  for (const combo of getCombinations(rest, k)) {
    result.push(combo);
  }
  return result;
}

function rankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

function evaluateFiveCards(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
  const ranks = sorted.map(c => rankValue(c.rank));
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight (including ace-low)
  let isStraight = false;
  let straightHighCard = ranks[0];

  // Normal straight check
  if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
    isStraight = true;
    straightHighCard = ranks[0];
  }
  // Ace-low straight (A-2-3-4-5)
  if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2) {
    isStraight = true;
    straightHighCard = 5; // 5-high straight
  }

  // Count rank frequencies
  const freq: Record<number, number> = {};
  for (const r of ranks) {
    freq[r] = (freq[r] || 0) + 1;
  }
  const freqValues = Object.entries(freq)
    .map(([rank, count]) => ({ rank: parseInt(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  // Determine hand rank
  if (isFlush && isStraight && straightHighCard === 14) {
    return { rank: 'royal-flush', value: 9 * 10000000, cards: sorted, description: 'Royal Flush' };
  }
  if (isFlush && isStraight) {
    return { rank: 'straight-flush', value: 8 * 10000000 + straightHighCard, cards: sorted, description: `Straight Flush, ${rankName(straightHighCard)} high` };
  }
  if (freqValues[0].count === 4) {
    const quad = freqValues[0].rank;
    const kicker = freqValues[1].rank;
    return { rank: 'four-of-a-kind', value: 7 * 10000000 + quad * 100 + kicker, cards: sorted, description: `Four of a Kind, ${rankName(quad)}s` };
  }
  if (freqValues[0].count === 3 && freqValues[1].count === 2) {
    const trips = freqValues[0].rank;
    const pair = freqValues[1].rank;
    return { rank: 'full-house', value: 6 * 10000000 + trips * 100 + pair, cards: sorted, description: `Full House, ${rankName(trips)}s full of ${rankName(pair)}s` };
  }
  if (isFlush) {
    const val = ranks[0] * 10000 + ranks[1] * 1000 + ranks[2] * 100 + ranks[3] * 10 + ranks[4];
    return { rank: 'flush', value: 5 * 10000000 + val, cards: sorted, description: `Flush, ${rankName(ranks[0])} high` };
  }
  if (isStraight) {
    return { rank: 'straight', value: 4 * 10000000 + straightHighCard, cards: sorted, description: `Straight, ${rankName(straightHighCard)} high` };
  }
  if (freqValues[0].count === 3) {
    const trips = freqValues[0].rank;
    const kickers = freqValues.slice(1).map(f => f.rank);
    return { rank: 'three-of-a-kind', value: 3 * 10000000 + trips * 10000 + kickers[0] * 100 + kickers[1], cards: sorted, description: `Three of a Kind, ${rankName(trips)}s` };
  }
  if (freqValues[0].count === 2 && freqValues[1].count === 2) {
    const highPair = Math.max(freqValues[0].rank, freqValues[1].rank);
    const lowPair = Math.min(freqValues[0].rank, freqValues[1].rank);
    const kicker = freqValues[2].rank;
    return { rank: 'two-pair', value: 2 * 10000000 + highPair * 10000 + lowPair * 100 + kicker, cards: sorted, description: `Two Pair, ${rankName(highPair)}s and ${rankName(lowPair)}s` };
  }
  if (freqValues[0].count === 2) {
    const pair = freqValues[0].rank;
    const kickers = freqValues.slice(1).map(f => f.rank);
    return { rank: 'one-pair', value: 1 * 10000000 + pair * 100000 + kickers[0] * 1000 + kickers[1] * 100 + kickers[2], cards: sorted, description: `Pair of ${rankName(pair)}s` };
  }
  // High card
  const val = ranks[0] * 100000000 + ranks[1] * 1000000 + ranks[2] * 10000 + ranks[3] * 100 + ranks[4];
  return { rank: 'high-card', value: val, cards: sorted, description: `${rankName(ranks[0])} High` };
}

function rankName(value: number): string {
  const names: Record<number, string> = {
    14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten',
    9: 'Nine', 8: 'Eight', 7: 'Seven', 6: 'Six', 5: 'Five',
    4: 'Four', 3: 'Three', 2: 'Two',
  };
  return names[value] || String(value);
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  const combos = getCombinations(allCards, 5);
  let best: HandResult | null = null;
  for (const combo of combos) {
    const result = evaluateFiveCards(combo);
    if (!best || result.value > best.value) {
      best = result;
    }
  }
  return best!;
}

export function compareHands(a: HandResult, b: HandResult): number {
  return a.value - b.value;
}
