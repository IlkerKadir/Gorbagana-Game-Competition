// frontend/src/components/SocialShare.tsx

import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { generateTweetText, shareOnTwitter, formatSOL } from '../utils';
import './SocialShare.css';

interface SocialShareProps {
  gameResult: {
    won: boolean;
    position?: number;
    totalPlayers: number;
    prizeAmount?: number;
    gameId: string;
  };
  playerAddress: PublicKey;
}

const SocialShare: React.FC<SocialShareProps> = ({ gameResult, playerAddress }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const generateCustomTweet = () => {
    if (customMessage.trim()) {
      return `${customMessage.trim()} 🏁 #GorbaganaTestnet 🗑️➡️💎 @Gorbagana_chain @sarv_shaktimaan @lex_node`;
    }
    return generateTweetText(gameResult);
  };

  const handleShare = async (platform: 'twitter' | 'copy') => {
    setIsSharing(true);

    const tweetText = generateCustomTweet();

    try {
      if (platform === 'twitter') {
        shareOnTwitter(tweetText);
      } else if (platform === 'copy') {
        await navigator.clipboard.writeText(tweetText);
        alert('📋 Message copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share. Please try again.');
    } finally {
      setTimeout(() => setIsSharing(false), 1000);
    }
  };

  const generateGameStats = () => {
    const stats = [];

    if (gameResult.won) {
      stats.push(`🏆 Winner!`);
      if (gameResult.prizeAmount) {
        stats.push(`💰 Won ${formatSOL(gameResult.prizeAmount)} $gGOR`);
      }
    } else {
      stats.push(`🏃‍♂️ Finished ${gameResult.position}/${gameResult.totalPlayers}`);
    }

    stats.push(`🎮 Game #${gameResult.gameId.slice(-8)}`);
    stats.push(`👤 ${playerAddress.toString().slice(0, 8)}...`);

    return stats;
  };

  return (
    <div className="social-share">
      <div className="share-header">
        <h3>📢 Share Your Result!</h3>
        <p>Let the world know how you turned trash into treasure!</p>
      </div>

      {/* Game Result Summary */}
      <div className="result-summary">
        <div className="result-icon">
          {gameResult.won ? '🏆' : '🏃‍♂️'}
        </div>
        <div className="result-stats">
          {generateGameStats().map((stat, index) => (
            <div key={index} className="stat-item">
              {stat}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Message Input */}
      <div className="custom-message">
        <label htmlFor="customMessage">🖊️ Custom Message (Optional):</label>
        <textarea
          id="customMessage"
          placeholder="Add your own message about the race..."
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          maxLength={200}
          rows={3}
        />
        <div className="character-count">
          {customMessage.length}/200
        </div>
      </div>

      {/* Preview */}
      <div className="tweet-preview">
        <h4>📋 Preview:</h4>
        <div className="preview-content">
          "{generateCustomTweet()}"
        </div>
      </div>

      {/* Share Buttons */}
      <div className="share-buttons">
        <button
          onClick={() => handleShare('twitter')}
          disabled={isSharing}
          className="share-btn twitter-btn"
        >
          {isSharing ? '📤 Sharing...' : '🐦 Tweet Result'}
        </button>

        <button
          onClick={() => handleShare('copy')}
          disabled={isSharing}
          className="share-btn copy-btn"
        >
          {isSharing ? '📋 Copying...' : '📋 Copy Text'}
        </button>
      </div>

      {/* Competition Reminder */}
      <div className="competition-note">
        <p>
          💡 <strong>Don't forget:</strong> This tweet counts toward the Social Promotion
          scoring (10%) in the Gorbagana competition!
        </p>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>🚀 Quick Actions:</h4>
        <div className="action-links">
          <a
            href="https://t.me/gorbagana"
            target="_blank"
            rel="noopener noreferrer"
            className="action-link"
          >
            💬 Join Gorbagana Community
          </a>
          <a
            href="https://twitter.com/Gorbagana_chain"
            target="_blank"
            rel="noopener noreferrer"
            className="action-link"
          >
            🔔 Follow @Gorbagana_chain
          </a>
          <button
            onClick={() => window.location.reload()}
            className="action-link play-again"
          >
            🎮 Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialShare;
