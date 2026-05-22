import type { Player } from '../engine/players';
import { PlayingCard } from './PlayingCard';

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  isThinking: boolean;
  showCards: boolean;
  position: { top: string; left: string };
  dealerPosition?: { top: string; left: string };
}

// Seat positions around an elliptical table (player 0 is at bottom center)
export const SEAT_POSITIONS: { top: string; left: string }[] = [
  { top: '85%', left: '50%' },   // 0: human (bottom center)
  { top: '70%', left: '12%' },   // 1: left
  { top: '25%', left: '8%' },    // 2: top-left
  { top: '8%', left: '40%' },    // 3: top-center-left
  { top: '8%', left: '60%' },    // 4: top-center-right
  { top: '25%', left: '92%' },   // 5: top-right
];

export const DEALER_CHIP_OFFSETS: { top: string; left: string }[] = [
  { top: '78%', left: '50%' },
  { top: '65%', left: '20%' },
  { top: '32%', left: '16%' },
  { top: '18%', left: '42%' },
  { top: '18%', left: '58%' },
  { top: '32%', left: '84%' },
];

export function PlayerSeat({ player, isActive, isDealer, isThinking, showCards, position, dealerPosition }: PlayerSeatProps) {
  const actionClass = player.lastAction?.toLowerCase().includes('fold') ? 'action-fold'
    : player.lastAction?.toLowerCase().includes('raise') ? 'action-raise'
    : player.lastAction?.toLowerCase().includes('call') ? 'action-call'
    : player.lastAction?.toLowerCase().includes('check') ? 'action-check'
    : '';

  return (
    <>
      <div
        className={`player-seat ${player.hasFolded ? 'folded' : ''} ${isActive ? 'active' : ''}`}
        style={{
          top: position.top,
          left: position.left,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="player-avatar">{player.persona.avatar}</div>
        <div className="player-name">{player.persona.name}</div>
        <div className="player-chips">${player.chips}</div>
        <div className={`player-action ${actionClass}`}>
          {isThinking ? (
            <>
              thinking
              <span className="thinking-dots">
                <span /><span /><span />
              </span>
            </>
          ) : (
            player.lastAction || ''
          )}
        </div>
        {!player.isHuman && player.holeCards.length > 0 && !player.hasFolded && (
          <div className="player-cards-mini">
            <PlayingCard card={showCards ? player.holeCards[0] : undefined} faceUp={showCards} />
            <PlayingCard card={showCards ? player.holeCards[1] : undefined} faceUp={showCards} />
          </div>
        )}
      </div>
      {isDealer && dealerPosition && (
        <div
          className="dealer-chip"
          style={{
            top: dealerPosition.top,
            left: dealerPosition.left,
            transform: 'translate(-50%, -50%)',
          }}
        >
          D
        </div>
      )}
    </>
  );
}
