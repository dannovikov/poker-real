import type { Card } from './deck';
import { createDeck, shuffleDeck } from './deck';
import type { Player } from './players';
import { createPlayer, AI_PERSONAS } from './players';
import type { HandResult } from './handEvaluator';
import { evaluateHand } from './handEvaluator';
import type { AIAction } from './ai';
import { getAIAction, getThinkingTime } from './ai';

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'hand-complete';
export type BettingAction = 'fold' | 'check' | 'call' | 'raise';

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface GameState {
  players: Player[];
  communityCards: Card[];
  deck: Card[];
  deckIndex: number;
  pot: number;
  sidePots: SidePot[];
  phase: GamePhase;
  dealerIndex: number;
  currentPlayerIndex: number;
  currentBet: number;
  minRaise: number;
  bigBlind: number;
  smallBlind: number;
  handNumber: number;
  lastRaiserIndex: number;
  winners: { playerId: string; amount: number; hand?: HandResult }[];
  actionLog: string[];
  revealedCards: Set<string>; // player IDs whose cards are revealed
}

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 5;
const BIG_BLIND = 10;

export function createInitialGameState(): GameState {
  const players: Player[] = [];

  // Human player
  players.push(createPlayer('human', {
    name: 'You',
    style: 'tight-aggressive',
    description: 'That\'s you. Try not to go broke.',
    avatar: '🎰',
    quirk: '',
  }, STARTING_CHIPS, 0, true));

  // AI players
  const shuffledPersonas = [...AI_PERSONAS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 5; i++) {
    players.push(createPlayer(
      `ai-${i}`,
      shuffledPersonas[i],
      STARTING_CHIPS + Math.floor((Math.random() - 0.5) * 400), // varied stacks
      i + 1,
    ));
  }

  return {
    players,
    communityCards: [],
    deck: [],
    deckIndex: 0,
    pot: 0,
    sidePots: [],
    phase: 'waiting',
    dealerIndex: 0,
    currentPlayerIndex: 0,
    currentBet: 0,
    minRaise: BIG_BLIND,
    bigBlind: BIG_BLIND,
    smallBlind: SMALL_BLIND,
    handNumber: 0,
    lastRaiserIndex: -1,
    winners: [],
    actionLog: [],
    revealedCards: new Set(),
  };
}

function drawCard(state: GameState): Card {
  const card = state.deck[state.deckIndex];
  state.deckIndex++;
  return card;
}

function getActivePlayersInHand(state: GameState): Player[] {
  return state.players.filter(p => !p.hasFolded);
}

function getNextActivePlayerIndex(state: GameState, fromIndex: number): number {
  let idx = (fromIndex + 1) % state.players.length;
  let attempts = 0;
  while (attempts < state.players.length) {
    const player = state.players[idx];
    if (!player.hasFolded && !player.isAllIn && player.chips > 0) {
      return idx;
    }
    idx = (idx + 1) % state.players.length;
    attempts++;
  }
  return -1; // no active players
}

export function startNewHand(state: GameState): GameState {
  const newState = { ...state };
  newState.handNumber++;

  // Move dealer button
  if (newState.handNumber > 1) {
    let nextDealer = (newState.dealerIndex + 1) % newState.players.length;
    while (newState.players[nextDealer].chips <= 0) {
      nextDealer = (nextDealer + 1) % newState.players.length;
    }
    newState.dealerIndex = nextDealer;
  }

  // Reset player states
  newState.players = newState.players.map(p => ({
    ...p,
    holeCards: [],
    currentBet: 0,
    totalBetThisRound: 0,
    hasFolded: p.chips <= 0,
    isAllIn: false,
    lastAction: undefined,
  }));

  // Shuffle and deal
  newState.deck = shuffleDeck(createDeck());
  newState.deckIndex = 0;
  newState.communityCards = [];
  newState.pot = 0;
  newState.sidePots = [];
  newState.currentBet = 0;
  newState.minRaise = BIG_BLIND;
  newState.winners = [];
  newState.actionLog = [];
  newState.revealedCards = new Set();

  // Post blinds
  const sbIndex = getNextActivePlayerIndex(newState, newState.dealerIndex);
  const bbIndex = getNextActivePlayerIndex(newState, sbIndex);

  const sbPlayer = newState.players[sbIndex];
  const sbAmount = Math.min(SMALL_BLIND, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  sbPlayer.totalBetThisRound = sbAmount;
  newState.pot += sbAmount;
  if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;

  const bbPlayer = newState.players[bbIndex];
  const bbAmount = Math.min(BIG_BLIND, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;
  bbPlayer.totalBetThisRound = bbAmount;
  newState.pot += bbAmount;
  if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;

  newState.currentBet = BIG_BLIND;

  newState.actionLog.push(`${sbPlayer.persona.name} posts small blind ($${sbAmount})`);
  newState.actionLog.push(`${bbPlayer.persona.name} posts big blind ($${bbAmount})`);

  // Deal hole cards
  for (const player of newState.players) {
    if (!player.hasFolded) {
      player.holeCards = [drawCard(newState), drawCard(newState)];
    }
  }

  // First to act is after big blind
  newState.currentPlayerIndex = getNextActivePlayerIndex(newState, bbIndex);
  newState.lastRaiserIndex = bbIndex;
  newState.phase = 'preflop';

  return newState;
}

export function applyAction(state: GameState, playerIndex: number, action: BettingAction, raiseAmount?: number): GameState {
  const newState = { ...state };
  newState.players = state.players.map(p => ({ ...p }));
  const player = newState.players[playerIndex];

  switch (action) {
    case 'fold':
      player.hasFolded = true;
      player.lastAction = 'Fold';
      newState.actionLog.push(`${player.persona.name} folds`);
      break;

    case 'check':
      player.lastAction = 'Check';
      newState.actionLog.push(`${player.persona.name} checks`);
      break;

    case 'call': {
      const callAmount = Math.min(newState.currentBet - player.currentBet, player.chips);
      player.chips -= callAmount;
      player.currentBet += callAmount;
      player.totalBetThisRound += callAmount;
      newState.pot += callAmount;
      if (player.chips === 0) player.isAllIn = true;
      player.lastAction = `Call $${callAmount}`;
      newState.actionLog.push(`${player.persona.name} calls $${callAmount}`);
      break;
    }

    case 'raise': {
      const totalRaise = raiseAmount || newState.minRaise;
      const toCall = newState.currentBet - player.currentBet;
      const totalCost = Math.min(toCall + totalRaise, player.chips);
      const actualNewBet = player.currentBet + totalCost;

      player.chips -= totalCost;
      newState.pot += totalCost;
      newState.minRaise = Math.max(newState.minRaise, actualNewBet - newState.currentBet);
      newState.currentBet = actualNewBet;
      player.currentBet = actualNewBet;
      player.totalBetThisRound += totalCost;

      if (player.chips === 0) player.isAllIn = true;
      newState.lastRaiserIndex = playerIndex;
      player.lastAction = `Raise to $${actualNewBet}`;
      newState.actionLog.push(`${player.persona.name} raises to $${actualNewBet}`);
      break;
    }
  }

  // Check if hand is over (all but one folded)
  const activePlayers = getActivePlayersInHand(newState);
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    newState.winners = [{ playerId: winner.id, amount: newState.pot }];
    winner.chips += newState.pot;
    newState.pot = 0;
    newState.phase = 'hand-complete';
    newState.actionLog.push(`${winner.persona.name} wins $${newState.winners[0].amount}`);
    return newState;
  }

  // Move to next player
  const nextIndex = getNextActivePlayerIndex(newState, playerIndex);

  // Check if betting round is complete
  if (nextIndex === newState.lastRaiserIndex || nextIndex === -1 || isBettingComplete(newState, nextIndex)) {
    return advancePhase(newState);
  }

  newState.currentPlayerIndex = nextIndex;
  return newState;
}

function isBettingComplete(state: GameState, nextIndex: number): boolean {
  const activePlayers = state.players.filter(p => !p.hasFolded && !p.isAllIn);
  if (activePlayers.length <= 1) return true;

  // All active (non-folded, non-all-in) players have matched the current bet
  const allMatched = activePlayers.every(p => p.currentBet === state.currentBet);
  if (!allMatched) return false;

  // And we've gone around (next would be the last raiser)
  return nextIndex === state.lastRaiserIndex;
}

function advancePhase(state: GameState): GameState {
  const newState = { ...state };

  // Reset bets for new round
  newState.players = state.players.map(p => ({
    ...p,
    currentBet: 0,
  }));
  newState.currentBet = 0;
  newState.minRaise = BIG_BLIND;

  switch (state.phase) {
    case 'preflop':
      // Deal flop
      drawCard(newState); // burn
      newState.communityCards = [
        ...newState.communityCards,
        drawCard(newState),
        drawCard(newState),
        drawCard(newState),
      ];
      newState.phase = 'flop';
      break;

    case 'flop':
      drawCard(newState); // burn
      newState.communityCards = [...newState.communityCards, drawCard(newState)];
      newState.phase = 'turn';
      break;

    case 'turn':
      drawCard(newState); // burn
      newState.communityCards = [...newState.communityCards, drawCard(newState)];
      newState.phase = 'river';
      break;

    case 'river':
      return resolveShowdown(newState);
  }

  // Check if all remaining players are all-in
  const activePlayers = newState.players.filter(p => !p.hasFolded && !p.isAllIn);
  if (activePlayers.length <= 1) {
    // Run out remaining cards if needed
    if (newState.phase === 'flop') {
      drawCard(newState); // burn
      newState.communityCards = [...newState.communityCards, drawCard(newState)];
      drawCard(newState); // burn
      newState.communityCards = [...newState.communityCards, drawCard(newState)];
      return resolveShowdown(newState);
    } else if (newState.phase === 'turn') {
      drawCard(newState); // burn
      newState.communityCards = [...newState.communityCards, drawCard(newState)];
      return resolveShowdown(newState);
    }
  }

  // First active player after dealer
  const firstPlayer = getNextActivePlayerIndex(newState, newState.dealerIndex);
  newState.currentPlayerIndex = firstPlayer;
  newState.lastRaiserIndex = firstPlayer;

  return newState;
}

function resolveShowdown(state: GameState): GameState {
  const newState = { ...state };
  newState.phase = 'showdown';

  const activePlayers = newState.players.filter(p => !p.hasFolded);

  // Reveal all active player hands
  newState.revealedCards = new Set(activePlayers.map(p => p.id));

  // Evaluate hands
  const playerHands: { player: Player; hand: HandResult }[] = activePlayers.map(p => ({
    player: p,
    hand: evaluateHand(p.holeCards, newState.communityCards),
  }));

  // Sort by hand strength (best first)
  playerHands.sort((a, b) => b.hand.value - a.hand.value);

  // Calculate side pots
  const allBets = activePlayers.map(p => p.totalBetThisRound);
  const uniqueBets = [...new Set(allBets)].sort((a, b) => a - b);

  const winners: { playerId: string; amount: number; hand?: HandResult }[] = [];

  if (uniqueBets.length <= 1 || !activePlayers.some(p => p.isAllIn)) {
    // Simple case: no side pots
    const winner = playerHands[0];
    // Check for ties
    const tiedPlayers = playerHands.filter(ph => ph.hand.value === winner.hand.value);
    const splitAmount = Math.floor(newState.pot / tiedPlayers.length);
    for (const tp of tiedPlayers) {
      tp.player.chips += splitAmount;
      winners.push({ playerId: tp.player.id, amount: splitAmount, hand: tp.hand });
      newState.actionLog.push(`${tp.player.persona.name} wins $${splitAmount} with ${tp.hand.description}`);
    }
  } else {
    // Side pots calculation
    let remainingPot = newState.pot;
    let processedBet = 0;

    for (const betLevel of uniqueBets) {
      const contribution = betLevel - processedBet;
      const eligiblePlayers = activePlayers.filter(p => p.totalBetThisRound >= betLevel);
      const allContributors = newState.players.filter(p => p.totalBetThisRound > processedBet);
      const potSize = allContributors.reduce((sum, p) => {
        return sum + Math.min(contribution, p.totalBetThisRound - processedBet);
      }, 0);

      // Find best hand among eligible
      const eligible = playerHands.filter(ph => eligiblePlayers.includes(ph.player));
      if (eligible.length > 0) {
        const best = eligible[0];
        const tied = eligible.filter(ph => ph.hand.value === best.hand.value);
        const splitAmount = Math.floor(potSize / tied.length);
        for (const tp of tied) {
          tp.player.chips += splitAmount;
          const existing = winners.find(w => w.playerId === tp.player.id);
          if (existing) {
            existing.amount += splitAmount;
          } else {
            winners.push({ playerId: tp.player.id, amount: splitAmount, hand: tp.hand });
          }
        }
        remainingPot -= potSize;
      }

      processedBet = betLevel;
    }

    for (const w of winners) {
      newState.actionLog.push(`${newState.players.find(p => p.id === w.playerId)!.persona.name} wins $${w.amount} with ${w.hand?.description}`);
    }
  }

  newState.winners = winners;
  newState.pot = 0;
  newState.phase = 'hand-complete';

  return newState;
}

export function getAvailableActions(state: GameState): {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  callAmount: number;
  minRaiseAmount: number;
  maxRaiseAmount: number;
} {
  const player = state.players[state.currentPlayerIndex];
  const toCall = state.currentBet - player.currentBet;

  return {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0 && player.chips > 0,
    canRaise: player.chips > toCall,
    callAmount: Math.min(toCall, player.chips),
    minRaiseAmount: Math.min(state.minRaise, player.chips - toCall),
    maxRaiseAmount: player.chips - toCall,
  };
}

export async function processAITurn(state: GameState): Promise<{ newState: GameState; action: AIAction; thinkTime: number }> {
  const player = state.players[state.currentPlayerIndex];
  const thinkTime = getThinkingTime(player.persona.style);

  const action = getAIAction({
    player,
    communityCards: state.communityCards,
    currentBet: state.currentBet,
    pot: state.pot,
    minRaise: state.minRaise,
    bigBlind: state.bigBlind,
  });

  let newState: GameState;
  switch (action.type) {
    case 'fold':
      newState = applyAction(state, state.currentPlayerIndex, 'fold');
      break;
    case 'check':
      newState = applyAction(state, state.currentPlayerIndex, 'check');
      break;
    case 'call':
      newState = applyAction(state, state.currentPlayerIndex, 'call');
      break;
    case 'raise':
      newState = applyAction(state, state.currentPlayerIndex, 'raise', action.amount);
      break;
  }

  return { newState, action, thinkTime };
}
