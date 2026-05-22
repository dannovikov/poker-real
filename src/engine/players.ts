import type { Card } from './deck';

export type PlayerStyle = 'tight-passive' | 'tight-aggressive' | 'loose-passive' | 'loose-aggressive' | 'wild';

export interface PlayerPersona {
  name: string;
  style: PlayerStyle;
  description: string;
  avatar: string; // emoji for now
  quirk: string; // flavor text for atmosphere
}

export interface Player {
  id: string;
  persona: PlayerPersona;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  totalBetThisRound: number;
  hasFolded: boolean;
  isAllIn: boolean;
  isHuman: boolean;
  seatIndex: number;
  lastAction?: string;
}

export const AI_PERSONAS: PlayerPersona[] = [
  {
    name: 'Earl',
    style: 'tight-passive',
    description: 'Retired plumber. Been coming here every Tuesday for 11 years.',
    avatar: '👴',
    quirk: 'Adjusts his reading glasses before every decision. Orders decaf at 1am.',
  },
  {
    name: 'Dustin',
    style: 'loose-aggressive',
    description: 'College kid in a wrinkled hoodie. Thinks he\'s the next Phil Ivey.',
    avatar: '🧑',
    quirk: 'Keeps checking his phone between hands. Wears noise-canceling headphones.',
  },
  {
    name: 'Vicky',
    style: 'tight-aggressive',
    description: 'Been here since 4pm yesterday. Chain-drinks Diet Cokes.',
    avatar: '👩',
    quirk: 'Stacks her chips in perfect columns. Sighs audibly when someone takes too long.',
  },
  {
    name: 'Maurice',
    style: 'loose-passive',
    description: 'Off-duty cab driver. Plays every hand like it\'s his last.',
    avatar: '🧔',
    quirk: 'Tells the same bad beat story every 20 minutes. Tips the dealer too much.',
  },
  {
    name: 'Tammy',
    style: 'wild',
    description: 'Cocktail waitress on her break. Scarily good at reading people.',
    avatar: '💁',
    quirk: 'Shuffles a chip between her fingers constantly. Never shows her cards.',
  },
];

export function createPlayer(
  id: string,
  persona: PlayerPersona,
  chips: number,
  seatIndex: number,
  isHuman: boolean = false
): Player {
  return {
    id,
    persona,
    chips,
    holeCards: [],
    currentBet: 0,
    totalBetThisRound: 0,
    hasFolded: false,
    isAllIn: false,
    isHuman,
    seatIndex,
  };
}
