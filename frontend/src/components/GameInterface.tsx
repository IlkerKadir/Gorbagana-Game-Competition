// frontend/src/components/GameInterface.tsx

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { useGame } from '../hooks/useGame';
import RaceTrack from './RaceTrack';
import GameControls from './GameControls';
import { formatSOL, isValidPublicKey, CONFIG } from '../utils';

const GameInterface: React.FC = () => {
  const { publicKey } = useWallet();
  const [gameIdInput, setGameIdInput] = useState('');

  const {
    gameAccount,
    gameState,
    isLoading,
    error,
    transactionStatus,
    createGame,
    joinGame,
    rollDice,
    useBoost,
    claimPrize,
    setGameAccount,
    clearError,
    currentPlayer,
    isPlayerInGame,
    canJoin,
    canPlay,
    hasWon,
  } = useGame();

  const handleJoinExistingGame = () => {
    if (isValidPublicKey(gameIdInput)) {
      const pubkey = new PublicKey(gameIdInput);
      setGameAccount(pubkey);
    } else {
      alert('Please enter a valid game ID (Public Key)');
    }
  };

  const handleCreateNewGame = async () => {
    await createGame();
  };

  const handleJoinGame = async () => {
    await joinGame();
  };

  return (
    <div className="game-interface">
      {/* Wallet Connection */}
      <div className="wallet-section">
        <WalletMultiButton />
        {publicKey && (
          <p className="wallet-info">
            Connected: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
          </p>
        )}
      </div>

      {/* Transaction Status */}
      {transactionStatus && (
        <div className={`transaction-status ${transactionStatus.status}`}>
          {transactionStatus.status === 'pending' && '⏳ '}
          {transactionStatus.status === 'success' && '✅ '}
          {transactionStatus.status === 'error' && '❌ '}
          {transactionStatus.message}
          {transactionStatus.signature && (
            <div className="transaction-signature">
              <small>
                Signature: {transactionStatus.signature.slice(0, 8)}...{transactionStatus.signature.slice(-8)}
              </small>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* Game Creation/Selection */}
      {!gameAccount && publicKey && (
        <div className="game-setup">
          <h2>🏁 Start Your Race</h2>
          <p>Entry Fee: {formatSOL(CONFIG.ENTRY_FEE)} $gGOR | Track Length: {CONFIG.TRACK_LENGTH} steps</p>
          <button
            onClick={handleCreateNewGame}
            disabled={isLoading}
            className="create-game-btn"
          >
            {isLoading ? '⏳ Creating...' : '🆕 Create New Race'}
          </button>

          <div className="or-divider">
            <span>OR</span>
          </div>

          <div className="join-existing">
            <input
              type="text"
              placeholder="Enter Game ID to join existing race"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              onClick={handleJoinExistingGame}
              disabled={isLoading || !gameIdInput.trim()}
              className="join-existing-btn"
            >
              🔍 Find Game
            </button>
          </div>
        </div>
      )}

      {/* Game Interface */}
      {gameAccount && gameState && (
        <div className="active-game">
          <div className="game-header">
            <h2>🏆 Race #{gameState.gameId.slice(-8)}</h2>
            <div className="game-stats">
              <span>💰 Prize Pool: {formatSOL(gameState.prizePool)} $gGOR</span>
              <span>👥 Players: {gameState.players.length}/{CONFIG.MAX_PLAYERS}</span>
              <span>📊 Status: {gameState.state.replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>
            <div className="game-id">
              <small>Game ID: {gameAccount.toString()}</small>
            </div>
          </div>

          {/* Race Track */}
          <RaceTrack
            players={gameState.players}
            trackLength={gameState.trackLength}
            currentPlayer={publicKey}
          />

          {/* Game Controls */}
          <GameControls
            canJoin={canJoin}
            canPlay={canPlay}
            hasWon={hasWon}
            currentPlayer={currentPlayer}
            isLoading={isLoading}
            onJoin={handleJoinGame}
            onRoll={rollDice}
            onBoost={useBoost}
            onClaimPrize={claimPrize}
          />

          {/* Game Status Messages */}
          {gameState.state === 'waitingForPlayers' && (
            <div className="status-message waiting">
              ⏳ Waiting for players... Need at least 2 to start!
            </div>
          )}

          {gameState.state === 'finished' && gameState.winner && (
            <div className="status-message finished">
              🎉 Race finished! Winner: {gameState.winner.toString().slice(0, 8)}...
              {hasWon && <span className="you-won"> - That's you! 🏆</span>}
            </div>
          )}

          {/* New Game Button */}
          {gameState.state === 'finished' && (
            <div className="new-game-section">
              <button
                onClick={() => {
                  setGameAccount(null);
                  setGameIdInput('');
                }}
                className="new-game-btn"
              >
                🏁 Start New Race
              </button>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!publicKey && (
        <div className="instructions">
          <h2>🎮 How to Play Trash to Treasure Rally</h2>
          <ol>
            <li>🔗 Connect your Backpack wallet</li>
            <li>🆕 Create a new race or join an existing one</li>
            <li>💰 Pay the entry fee ({formatSOL(CONFIG.ENTRY_FEE)} $gGOR)</li>
            <li>🎲 Roll dice to move forward (1-6 steps)</li>
            <li>⚡ Use boosts for +3 extra movement ({CONFIG.BOOSTS_PER_PLAYER} per game)</li>
            <li>🏁 First to reach {CONFIG.TRACK_LENGTH} steps wins all prizes!</li>
          </ol>
          <p className="theme-note">
            🗑️➡️💎 Turn trash into treasure on Gorbagana's lightning-fast chain!
          </p>

          <div className="features-highlight">
            <h3>🚀 Powered by Gorbagana</h3>
            <ul>
              <li>⚡ <strong>Instant Finality:</strong> Dice rolls happen in under 1 second</li>
              <li>🛡️ <strong>Zero-MEV Fairness:</strong> No front-running or manipulation</li>
              <li>💰 <strong>Winner Takes All:</strong> Fair competition with real stakes</li>
              <li>🎮 <strong>Web2-Like Speed:</strong> Smooth gaming experience</li>
            </ul>
          </div>
        </div>
      )}

      {/* Network Info */}
      {publicKey && (
        <div className="network-info">
          <p>
            🌐 Connected to: <strong>Gorbagana Testnet</strong> |
            🎮 Program ID: <code>{CONFIG.PROGRAM_ID.toString().slice(0, 8)}...{CONFIG.PROGRAM_ID.toString().slice(-8)}</code>
          </p>
        </div>
      )}
    </div>
  );
};

export default GameInterface;
