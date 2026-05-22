import { useState, useEffect } from 'react';
import type { GameState } from '../engine/game';
import { getAvailableActions } from '../engine/game';

interface BettingControlsProps {
  gameState: GameState;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => void;
  disabled: boolean;
}

export function BettingControls({ gameState, onAction, disabled }: BettingControlsProps) {
  const actions = getAvailableActions(gameState);
  const [raiseAmount, setRaiseAmount] = useState(actions.minRaiseAmount);

  useEffect(() => {
    setRaiseAmount(actions.minRaiseAmount);
  }, [actions.minRaiseAmount]);

  const isHumanTurn = gameState.players[gameState.currentPlayerIndex]?.isHuman && !disabled;

  return (
    <div className="betting-controls">
      <div className="action-buttons">
        <button
          className="action-btn btn-fold"
          onClick={() => onAction('fold')}
          disabled={!isHumanTurn || !actions.canFold}
        >
          Fold
        </button>

        {actions.canCheck ? (
          <button
            className="action-btn btn-check"
            onClick={() => onAction('check')}
            disabled={!isHumanTurn}
          >
            Check
          </button>
        ) : (
          <button
            className="action-btn btn-call"
            onClick={() => onAction('call')}
            disabled={!isHumanTurn || !actions.canCall}
          >
            Call ${actions.callAmount}
          </button>
        )}

        {actions.canRaise && (
          <div className="raise-controls">
            <button
              className="action-btn btn-raise"
              onClick={() => onAction('raise', raiseAmount)}
              disabled={!isHumanTurn}
            >
              Raise
            </button>
            <input
              type="range"
              className="raise-slider"
              min={actions.minRaiseAmount}
              max={actions.maxRaiseAmount}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              disabled={!isHumanTurn}
            />
            <span className="raise-amount">${raiseAmount + actions.callAmount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
