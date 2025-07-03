// frontend/src/components/RaceTrack.tsx

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { Player } from '../types/game';
import './RaceTrack.css';

interface RaceTrackProps {
  players: Player[];
  trackLength: number;
  currentPlayer?: PublicKey | null;
}

const RaceTrack: React.FC<RaceTrackProps> = ({ players, trackLength, currentPlayer }) => {
  // Player icons/emojis for visual variety
  const playerIcons = ['🦝', '🚗', '🚚', '🛵', '🚲']; // Raccoon, car, truck, scooter, bike

  // Generate track positions (0 to trackLength)
  const trackPositions = Array.from({ length: trackLength + 1 }, (_, i) => i);

  const getPlayerIcon = (index: number) => playerIcons[index % playerIcons.length];

  const isCurrentPlayer = (player: Player) => {
    return currentPlayer && player.pubkey.equals(currentPlayer);
  };

  const getPlayerProgress = (position: number) => {
    return Math.min((position / trackLength) * 100, 100);
  };

  return (
    <div className="race-track">
      <div className="track-header">
        <div className="start-line">
          🏁 START
        </div>
        <div className="finish-line">
          🏆 FINISH ({trackLength})
        </div>
      </div>

      {/* Main Track Visualization */}
      <div className="track-container">
        <div className="track-background">
          {/* Track markers every 10 steps */}
          {trackPositions.filter(pos => pos % 10 === 0).map(pos => (
            <div
              key={pos}
              className="track-marker"
              style={{ left: `${(pos / trackLength) * 100}%` }}
            >
              <span className="marker-number">{pos}</span>
            </div>
          ))}
        </div>

        {/* Player positions */}
        <div className="players-container">
          {players.map((player, index) => (
            <div
              key={player.pubkey.toString()}
              className={`player-position ${isCurrentPlayer(player) ? 'current-player' : ''} ${player.finished ? 'finished' : ''}`}
              style={{
                left: `${getPlayerProgress(player.position)}%`,
                top: `${index * 60 + 20}px`
              }}
            >
              <div className="player-icon">
                {getPlayerIcon(index)}
              </div>
              <div className="player-info">
                <div className="player-address">
                  {player.pubkey.toString().slice(0, 4)}...{player.pubkey.toString().slice(-4)}
                  {isCurrentPlayer(player) && <span className="you-indicator"> (YOU)</span>}
                </div>
                <div className="player-stats">
                  📍 {player.position}/{trackLength} | ⚡ {player.boostsRemaining} boosts
                  {player.finished && <span className="finished-indicator"> ✅ FINISHED</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Track progression bars */}
        <div className="progress-bars">
          {players.map((player, index) => (
            <div
              key={`progress-${player.pubkey.toString()}`}
              className="progress-bar-container"
              style={{ top: `${index * 60 + 45}px` }}
            >
              <div
                className={`progress-bar ${isCurrentPlayer(player) ? 'current-player' : ''}`}
                style={{ width: `${getPlayerProgress(player.position)}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div className="player-list">
        <h3>🏃‍♂️ Racers</h3>
        <div className="players-grid">
          {players.map((player, index) => (
            <div
              key={player.pubkey.toString()}
              className={`player-card ${isCurrentPlayer(player) ? 'current-player' : ''}`}
            >
              <div className="player-icon-large">
                {getPlayerIcon(index)}
              </div>
              <div className="player-details">
                <div className="player-name">
                  Player {index + 1}
                  {isCurrentPlayer(player) && <span className="you-badge">YOU</span>}
                </div>
                <div className="player-address-full">
                  {player.pubkey.toString().slice(0, 8)}...{player.pubkey.toString().slice(-8)}
                </div>
                <div className="player-progress">
                  <span>Position: {player.position}/{trackLength}</span>
                  <span>Boosts: {player.boostsRemaining}/3</span>
                  {player.finished && <span className="status finished">🏁 FINISHED</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trash/Treasure Theme Elements */}
      <div className="theme-elements">
        <div className="trash-cans">
          🗑️ 🗑️ 🗑️
        </div>
        <div className="treasure-chest">
          💎 TREASURE AHEAD! 💎
        </div>
      </div>
    </div>
  );
};

export default RaceTrack;
