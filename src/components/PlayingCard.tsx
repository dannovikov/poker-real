import type { Card } from '../engine/deck';
import { SUIT_SYMBOLS } from '../engine/deck';

interface PlayingCardProps {
  card?: Card;
  faceUp?: boolean;
  dealing?: boolean;
  delay?: number;
}

export function PlayingCard({ card, faceUp = false, dealing = false, delay = 0 }: PlayingCardProps) {
  const isRed = card && (card.suit === 'hearts' || card.suit === 'diamonds');

  return (
    <div
      className={`card ${dealing ? 'card-dealing' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`card-inner ${faceUp && card ? 'flipped' : ''}`}>
        <div className="card-back" />
        {card && (
          <div className={`card-front ${isRed ? 'red' : 'black'}`}>
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
