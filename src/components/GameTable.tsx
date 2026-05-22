import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from '../engine/game';
import {
  createInitialGameState,
  startNewHand,
  applyAction,
  processAITurn,
} from '../engine/game';
import { PlayingCard } from './PlayingCard';
import { PlayerSeat, SEAT_POSITIONS, DEALER_CHIP_OFFSETS } from './PlayerSeat';
import { BettingControls } from './BettingControls';
import { audioManager } from '../audio/AudioManager';

export function GameTable() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [isProcessing, setIsProcessing] = useState(false);
  const [thinkingPlayer, setThinkingPlayer] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.3);
  const [dealtCommunityCount, setDealtCommunityCount] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  // Start first hand
  useEffect(() => {
    const newState = startNewHand(gameState);
    setGameState(newState);
    setDealtCommunityCount(0);
    // Deal sound
    setTimeout(() => audioManager.playCardDeal(), 300);
    setTimeout(() => audioManager.playCardDeal(), 500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll action log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState.actionLog.length]);

  // Animate community cards appearing
  useEffect(() => {
    if (gameState.communityCards.length > dealtCommunityCount) {
      const newCards = gameState.communityCards.length - dealtCommunityCount;
      for (let i = 0; i < newCards; i++) {
        setTimeout(() => {
          audioManager.playCardFlip();
          setDealtCommunityCount(prev => prev + 1);
        }, i * 200 + 100);
      }
    }
  }, [gameState.communityCards.length, dealtCommunityCount]);

  // Process AI turns
  useEffect(() => {
    if (gameState.phase === 'waiting' || gameState.phase === 'hand-complete' || gameState.phase === 'showdown') {
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isHuman || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setThinkingPlayer(currentPlayer.id);

    const doAITurn = async () => {
      const { newState, thinkTime } = await processAITurn(gameState);

      // Wait for thinking animation
      await new Promise(resolve => setTimeout(resolve, Math.min(thinkTime, 2000)));

      setThinkingPlayer(null);

      // Play appropriate sound
      const action = newState.players.find(p => p.id === currentPlayer.id)?.lastAction || '';
      if (action.includes('Fold')) {
        audioManager.playFold();
      } else if (action.includes('Raise') || action.includes('Call')) {
        audioManager.playChipMove();
      }

      setGameState(newState);
      processingRef.current = false;
      setIsProcessing(false);
    };

    const timeout = setTimeout(doAITurn, 200);
    return () => clearTimeout(timeout);
  }, [gameState]);

  const handlePlayerAction = useCallback((action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => {
    if (isProcessing) return;

    const humanIndex = gameState.players.findIndex(p => p.isHuman);
    if (gameState.currentPlayerIndex !== humanIndex) return;

    // Sound
    if (action === 'fold') audioManager.playFold();
    else if (action === 'raise' || action === 'call') audioManager.playChipMove();

    const newState = applyAction(gameState, humanIndex, action, amount);
    setGameState(newState);
  }, [gameState, isProcessing]);

  const handleNextHand = useCallback(() => {
    const newState = startNewHand(gameState);
    setGameState(newState);
    setDealtCommunityCount(0);

    // Deal sounds
    setTimeout(() => audioManager.playCardDeal(), 300);
    setTimeout(() => audioManager.playCardDeal(), 500);
  }, [gameState]);

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    audioManager.setVolume(v);
  };

  const humanPlayer = gameState.players.find(p => p.isHuman);
  const isHumanTurn = gameState.players[gameState.currentPlayerIndex]?.isHuman &&
    gameState.phase !== 'waiting' &&
    gameState.phase !== 'hand-complete' &&
    gameState.phase !== 'showdown';

  // Check for win at showdown
  useEffect(() => {
    if (gameState.phase === 'hand-complete' && gameState.winners.length > 0) {
      const humanWon = gameState.winners.some(w => w.playerId === 'human');
      if (humanWon) {
        audioManager.playWin();
      }
    }
  }, [gameState.phase, gameState.winners]);

  return (
    <div className="game-container">
      {/* Ceiling */}
      <div className="ceiling-area">
        <div className="ceiling-tiles" />
        <div className="fluorescent-light" />
        <div className="water-stain" />
      </div>

      {/* Hand info */}
      <div className="hand-info">
        <span className="hand-number">Hand #{gameState.handNumber}</span>
        <span className="phase-indicator">
          {gameState.phase === 'hand-complete' ? 'Complete' : gameState.phase}
        </span>
      </div>

      {/* Volume */}
      <div className="volume-control">
        <span className="volume-icon" onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.3)}>
          {volume > 0 ? '🔊' : '🔇'}
        </span>
        <input
          type="range"
          className="volume-slider"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
        />
      </div>

      {/* Table */}
      <div className="table-surface">
        <div className="felt-table">
          {/* Community cards */}
          <div className="community-cards">
            {gameState.communityCards.slice(0, dealtCommunityCount).map((card, i) => (
              <PlayingCard
                key={`${card.rank}-${card.suit}`}
                card={card}
                faceUp={true}
                dealing={true}
                delay={i * 150}
              />
            ))}
          </div>

          {/* Pot */}
          {gameState.pot > 0 && (
            <div className="pot-display">
              Pot: ${gameState.pot}
            </div>
          )}

          {/* Player seats */}
          {gameState.players.map((player, i) => (
            <PlayerSeat
              key={player.id}
              player={player}
              isActive={gameState.currentPlayerIndex === i && gameState.phase !== 'hand-complete'}
              isDealer={gameState.dealerIndex === i}
              isThinking={thinkingPlayer === player.id}
              showCards={gameState.revealedCards.has(player.id)}
              position={SEAT_POSITIONS[i]}
              dealerPosition={gameState.dealerIndex === i ? DEALER_CHIP_OFFSETS[i] : undefined}
            />
          ))}

          {/* Winner display */}
          {gameState.phase === 'hand-complete' && gameState.winners.length > 0 && (
            <div className="winner-overlay">
              {gameState.winners.map(w => {
                const winner = gameState.players.find(p => p.id === w.playerId);
                return (
                  <div key={w.playerId}>
                    <div className="winner-text">
                      {winner?.persona.name} wins ${w.amount}
                    </div>
                    {w.hand && (
                      <div className="winner-hand-desc">{w.hand.description}</div>
                    )}
                  </div>
                );
              })}
              <button className="next-hand-btn" onClick={handleNextHand}>
                Next Hand
              </button>
            </div>
          )}
        </div>

        {/* Atmospheric haze */}
        <div className="game-haze" />
      </div>

      {/* Action log */}
      <div className="action-log" ref={logRef}>
        {gameState.actionLog.slice(-15).map((entry, i) => (
          <div key={i} className="log-entry">{entry}</div>
        ))}
      </div>

      {/* Controls area */}
      <div className="controls-area">
        <div className="player-hand-area">
          {/* Player's hole cards */}
          {humanPlayer && humanPlayer.holeCards.length > 0 && (
            <div className="hole-cards">
              <PlayingCard
                card={humanPlayer.holeCards[0]}
                faceUp={true}
                dealing={true}
                delay={0}
              />
              <PlayingCard
                card={humanPlayer.holeCards[1]}
                faceUp={true}
                dealing={true}
                delay={100}
              />
            </div>
          )}

          {/* Betting controls */}
          {isHumanTurn && (
            <BettingControls
              gameState={gameState}
              onAction={handlePlayerAction}
              disabled={isProcessing}
            />
          )}

          {/* Status when not player's turn */}
          {!isHumanTurn && gameState.phase !== 'hand-complete' && (
            <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              {humanPlayer?.hasFolded ? 'You folded this hand' : 'Waiting...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
