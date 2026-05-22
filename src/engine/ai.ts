import type { Player, PlayerStyle } from './players';
import type { Card } from './deck';
import { RANK_VALUES } from './deck';
import { evaluateHand, HAND_RANK_VALUES } from './handEvaluator';

export type AIAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; amount: number };

interface AIContext {
  player: Player;
  communityCards: Card[];
  currentBet: number;
  pot: number;
  minRaise: number;
  bigBlind: number;
}

function getHandStrength(holeCards: Card[], communityCards: Card[]): number {
  if (communityCards.length === 0) {
    // Pre-flop: evaluate hole cards
    return evaluatePreflop(holeCards);
  }
  const result = evaluateHand(holeCards, communityCards);
  return HAND_RANK_VALUES[result.rank] / 9; // normalize 0-1
}

function evaluatePreflop(holeCards: Card[]): number {
  const [a, b] = holeCards;
  const highRank = Math.max(RANK_VALUES[a.rank], RANK_VALUES[b.rank]);
  const lowRank = Math.min(RANK_VALUES[a.rank], RANK_VALUES[b.rank]);
  const isPair = a.rank === b.rank;
  const isSuited = a.suit === b.suit;
  const gap = highRank - lowRank;

  let strength = 0;

  if (isPair) {
    strength = 0.5 + (highRank / 14) * 0.5; // pairs are strong
  } else {
    strength = (highRank + lowRank) / 28; // base on card values
    if (isSuited) strength += 0.05;
    if (gap <= 2) strength += 0.05; // connected cards
    if (highRank >= 12) strength += 0.1; // broadway cards
  }

  return Math.min(1, Math.max(0, strength));
}

function addRandomness(value: number, spread: number): number {
  return value + (Math.random() - 0.5) * spread;
}

// Simulate thinking delay (returns ms)
export function getThinkingTime(style: PlayerStyle): number {
  const base = {
    'tight-passive': 2500,
    'tight-aggressive': 1800,
    'loose-passive': 1200,
    'loose-aggressive': 800,
    'wild': 600,
  }[style];
  return base + Math.random() * 1500;
}

export function getAIAction(ctx: AIContext): AIAction {
  const { player, communityCards, currentBet, pot, minRaise, bigBlind } = ctx;
  const toCall = currentBet - player.currentBet;
  const strength = getHandStrength(player.holeCards, communityCards);
  const style = player.persona.style;

  // Add personality-based noise
  const noise = style === 'wild' ? 0.3 : 0.15;
  const adjustedStrength = addRandomness(strength, noise);

  // Pot odds
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  switch (style) {
    case 'tight-passive':
      return tightPassiveAction(adjustedStrength, toCall, potOdds, bigBlind, minRaise, player);

    case 'tight-aggressive':
      return tightAggressiveAction(adjustedStrength, toCall, potOdds, pot, bigBlind, minRaise, player);

    case 'loose-passive':
      return loosePassiveAction(adjustedStrength, toCall, potOdds, bigBlind, minRaise, player);

    case 'loose-aggressive':
      return looseAggressiveAction(adjustedStrength, toCall, potOdds, pot, bigBlind, minRaise, player);

    case 'wild':
      return wildAction(adjustedStrength, toCall, pot, bigBlind, minRaise, player);

    default:
      return toCall === 0 ? { type: 'check' } : { type: 'fold' };
  }
}

function tightPassiveAction(strength: number, toCall: number, potOdds: number, bigBlind: number, minRaise: number, player: Player): AIAction {
  // Earl: only plays good hands, rarely raises
  if (toCall === 0) {
    if (strength > 0.7 && Math.random() > 0.7) {
      return { type: 'raise', amount: Math.min(minRaise, player.chips) };
    }
    return { type: 'check' };
  }
  if (strength < 0.35) return { type: 'fold' };
  if (strength > 0.75 && Math.random() > 0.6) {
    return { type: 'raise', amount: Math.min(minRaise, player.chips) };
  }
  if (strength > potOdds * 1.2) return { type: 'call' };
  if (toCall <= bigBlind && Math.random() > 0.4) return { type: 'call' };
  return { type: 'fold' };
}

function tightAggressiveAction(strength: number, toCall: number, potOdds: number, pot: number, bigBlind: number, minRaise: number, player: Player): AIAction {
  // Vicky: selective but aggressive when she plays
  if (toCall === 0) {
    if (strength > 0.5) {
      const raiseSize = Math.min(
        Math.max(minRaise, Math.floor(pot * (0.5 + strength * 0.5))),
        player.chips
      );
      return { type: 'raise', amount: raiseSize };
    }
    return { type: 'check' };
  }
  if (strength < 0.3) return { type: 'fold' };
  if (strength > 0.6) {
    const raiseSize = Math.min(
      Math.max(minRaise, Math.floor(pot * (0.5 + strength))),
      player.chips
    );
    if (Math.random() > 0.3) return { type: 'raise', amount: raiseSize };
  }
  if (strength > potOdds) return { type: 'call' };
  if (toCall <= bigBlind * 2) return { type: 'call' };
  return { type: 'fold' };
}

function loosePassiveAction(strength: number, toCall: number, _potOdds: number, bigBlind: number, minRaise: number, player: Player): AIAction {
  // Maurice: calls way too much, rarely raises
  if (toCall === 0) {
    if (strength > 0.8 && Math.random() > 0.5) {
      return { type: 'raise', amount: Math.min(minRaise, player.chips) };
    }
    return { type: 'check' };
  }
  // Calls with almost anything
  if (strength < 0.15) return { type: 'fold' };
  if (toCall <= bigBlind * 4) return { type: 'call' };
  if (strength > 0.3) return { type: 'call' };
  return Math.random() > 0.5 ? { type: 'call' } : { type: 'fold' };
}

function looseAggressiveAction(strength: number, toCall: number, _potOdds: number, pot: number, bigBlind: number, minRaise: number, player: Player): AIAction {
  void _potOdds;
  // Dustin: raises a lot, plays too many hands
  if (toCall === 0) {
    if (strength > 0.35 || Math.random() > 0.6) {
      const raiseSize = Math.min(
        Math.max(minRaise, Math.floor(pot * (0.6 + Math.random() * 0.8))),
        player.chips
      );
      return { type: 'raise', amount: raiseSize };
    }
    return { type: 'check' };
  }
  if (strength < 0.2 && toCall > bigBlind * 3) return { type: 'fold' };
  if (strength > 0.4 || Math.random() > 0.5) {
    if (Math.random() > 0.4) {
      const raiseSize = Math.min(
        Math.max(minRaise, Math.floor(pot * (0.5 + Math.random()))),
        player.chips
      );
      return { type: 'raise', amount: raiseSize };
    }
    return { type: 'call' };
  }
  return toCall <= bigBlind * 2 ? { type: 'call' } : { type: 'fold' };
}

function wildAction(strength: number, toCall: number, pot: number, _bigBlind: number, minRaise: number, player: Player): AIAction {
  // Tammy: unpredictable, occasionally brilliant
  const chaos = Math.random();

  if (toCall === 0) {
    if (chaos > 0.5) {
      // Random raise
      const raiseSize = Math.min(
        Math.max(minRaise, Math.floor(pot * (0.3 + Math.random() * 1.5))),
        player.chips
      );
      return { type: 'raise', amount: raiseSize };
    }
    return { type: 'check' };
  }

  // Sometimes bluffs big with nothing
  if (strength < 0.2 && chaos > 0.7) {
    const raiseSize = Math.min(
      Math.max(minRaise, Math.floor(pot * (1 + Math.random()))),
      player.chips
    );
    return { type: 'raise', amount: raiseSize };
  }

  if (strength > 0.5) {
    if (chaos > 0.4) {
      const raiseSize = Math.min(
        Math.max(minRaise, Math.floor(pot * (0.5 + Math.random() * 1.5))),
        player.chips
      );
      return { type: 'raise', amount: raiseSize };
    }
    return { type: 'call' };
  }

  if (chaos > 0.4) return { type: 'call' };
  return { type: 'fold' };
}
