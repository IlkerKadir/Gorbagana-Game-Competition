// frontend/src/components/GameControls.tsx

import React from 'react';
import { Player } from '../types/game';
import './GameControls.css';

interface GameControlsProps {
  canJoin: boolean;
  canPlay: boolean;
  hasWon: boolean;
  currentPlayer?: Player | null;
  isLoading: boolean;
  onJoin: () => void;
  onRoll: () => void;
  onBoost: () => void;
  onClaimPrize: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  canJoin,
  canPlay,
  hasWon,
  currentPlayer,
  isLoading,
  onJoin,
  onRoll,
  onBoost,
  onClaimPrize,
}) => {
  return (
    <div className="game-controls">

      {/* Join Game */}
      {canJoin && (
        <div className="control-section join-section">
          <h3>🎯 Join the Race!</h3>
          <p>Pay the entry fee and compete for the prize pool!</p>
          <button
            onClick={onJoin}
            disabled={isLoading}
            className="primary-button join-button"
          >
            {isLoading ? '⏳ Joining...' : '🚀 Join Race (0.01 $gGOR)'}
          </button>
        </div>
      )}

      {/* Game Actions */}
      {canPlay && currentPlayer && (
        <div className="control-section play-section">
          <h3>🎮 Your Turn</h3>
          <div className="player-status">
            <span>📍 Position: {currentPlayer.position}</span>
            <span>⚡ Boosts: {currentPlayer.boostsRemaining}/3</span>
          </div>

          <div className="action-buttons">
            <button
              onClick={onRoll}
              disabled={isLoading}
              className="primary-button roll-button"
            >
              {isLoading ? '🎲 Rolling...' : '🎲 Roll Dice'}
            </button>

            {currentPlayer.boostsRemaining > 0 && (
              <button
                onClick={onBoost}
                disabled={isLoading}
                className="secondary-button boost-button"
              >
                {isLoading ? '⚡ Boosting...' : '⚡ Use Boost (+3)'}
              </button>
            )}
          </div>

          <div className="action-explanations">
            <div className="explanation">
              <strong>🎲 Roll Dice:</strong> Move 1-6 steps forward randomly
            </div>
            {currentPlayer.boostsRemaining > 0 && (
              <div className="explanation">
                <strong>⚡ Use Boost:</strong> Burn trash for +3 extra movement!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Winner Actions */}
      {hasWon && (
        <div className="control-section winner-section">
          <h3>🎉 Congratulations! You Won!</h3>
          <p>You turned trash into treasure! Claim your prize now.</p>
          <button
            onClick={onClaimPrize}
            disabled={isLoading}
            className="primary-button claim-button"
          >
            {isLoading ? '💰 Claiming...' : '💰 Claim Prize'}
          </button>
        </div>
      )}

      {/* Waiting States */}
      {currentPlayer && !canPlay && !hasWon && (
        <div className="control-section waiting-section">
          {currentPlayer.finished ? (
            <div className="finished-message">
              <h3>🏁 Race Complete!</h3>
              <p>You finished the race! Waiting for results...</p>
            </div>
          ) : (
            <div className="waiting-message">
              <h3>⏳ Waiting for Game to Start</h3>
              <p>Need at least 2 players to begin racing!</p>
            </div>
          )}
        </div>
      )}

      {/* Game Tips */}
      <div className="game-tips">
        <h4>💡 Racing Tips</h4>
        <ul>
          <li>🎲 <strong>Dice rolls are fair:</strong> No MEV, no front-running!</li>
          <li>⚡ <strong>Save boosts for clutch moments:</strong> Use them wisely!</li>
          <li>🏃‍♂️ <strong>Every second counts:</strong> Fast transactions = competitive edge</li>
          <li>🗑️ <strong>Embrace the trash:</strong> Turn garbage into treasure!</li>
        </ul>
      </div>

      {/* Trash to Treasure Theme */}
      <div className="theme-section">
        <div className="trash-to-treasure">
          <span className="trash">🗑️ TRASH</span>
          <span className="arrow">➡️</span>
          <span className="treasure">💎 TREASURE</span>
        </div>
        <p className="theme-text">
          Every boost burns trash tokens for speed! <br/>
          Gorbagana: Where garbage becomes gold! ✨
        </p>
      </div>

      {/* Social Sharing Hint */}
      <div className="social-section">
        <p className="social-hint">
          🐦 Racing on #GorbaganaTestnet? Tweet your results and tag @Gorbagana_chain!
        </p>
      </div>
    </div>
  );
};

export default GameControls;
