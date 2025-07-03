// frontend/src/utils/index.ts

import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';

// Environment variables with defaults
export const CONFIG = {
  GORBAGANA_RPC: process.env.REACT_APP_GORBAGANA_RPC || 'https://rpc.gorbagana.wtf/',
  PROGRAM_ID: new PublicKey(process.env.REACT_APP_PROGRAM_ID || '7F7aQhctfukwKfUCVe7iwYbtak6fbEqPQzPz5rf9qjeb'),
  NETWORK: process.env.REACT_APP_NETWORK || 'gorbagana',
  ENTRY_FEE: parseInt(process.env.REACT_APP_DEFAULT_ENTRY_FEE || '10000000'), // 0.01 SOL in lamports
  TRACK_LENGTH: parseInt(process.env.REACT_APP_DEFAULT_TRACK_LENGTH || '50'),
  BOOSTS_PER_PLAYER: parseInt(process.env.REACT_APP_BOOSTS_PER_PLAYER || '3'),
  MAX_PLAYERS: parseInt(process.env.REACT_APP_MAX_PLAYERS_PER_GAME || '5'),
};

// Format lamports to SOL with proper decimal places
export const formatSOL = (lamports: number): string => {
  return (lamports / LAMPORTS_PER_SOL).toFixed(3);
};

// Format public key for display (first 4 + last 4 characters)
export const formatPubkey = (pubkey: PublicKey | string): string => {
  const key = pubkey.toString();
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

// Format public key for display (first 8 + last 8 characters)
export const formatPubkeyLong = (pubkey: PublicKey | string): string => {
  const key = pubkey.toString();
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
};

// Get progress percentage for race track
export const getProgressPercentage = (position: number, trackLength: number): number => {
  return Math.min((position / trackLength) * 100, 100);
};

// Generate player icon based on index
export const getPlayerIcon = (index: number): string => {
  const icons = ['🦝', '🚗', '🚚', '🛵', '🚲']; // Raccoon, car, truck, scooter, bike
  return icons[index % icons.length];
};

// Format game state for display
export const formatGameState = (state: string): string => {
  switch (state) {
    case 'waitingForPlayers':
      return 'Waiting for Players';
    case 'inProgress':
      return 'Race in Progress';
    case 'finished':
      return 'Race Finished';
    default:
      return 'Unknown';
  }
};

// Calculate time elapsed since timestamp
export const getTimeElapsed = (timestamp: number): string => {
  const now = Date.now();
  const elapsed = now - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s ago`;
  }
  return `${seconds}s ago`;
};

// Validate if string is a valid PublicKey
export const isValidPublicKey = (key: string): boolean => {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
};

// Sleep utility for delays
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Connection utilities
export class ConnectionManager {
  private connection: Connection;

  constructor(endpoint: string = CONFIG.GORBAGANA_RPC) {
    this.connection = new Connection(endpoint, 'confirmed');
  }

  getConnection(): Connection {
    return this.connection;
  }

  async getBalance(pubkey: PublicKey): Promise<number> {
    try {
      return await this.connection.getBalance(pubkey);
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      const result = await this.connection.confirmTransaction(signature, 'confirmed');
      return !result.value.err;
    } catch (error) {
      console.error('Error confirming transaction:', error);
      return false;
    }
  }

  async waitForTransaction(signature: string): Promise<boolean> {
    console.log('Waiting for transaction:', signature);

    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (attempts < maxAttempts) {
      try {
        const status = await this.connection.getSignatureStatus(signature);

        if (status.value?.confirmationStatus === 'confirmed' ||
            status.value?.confirmationStatus === 'finalized') {
          return !status.value.err;
        }

        if (status.value?.err) {
          console.error('Transaction failed:', status.value.err);
          return false;
        }

        await sleep(1000); // Wait 1 second before checking again
        attempts++;
      } catch (error) {
        console.error('Error checking transaction status:', error);
        await sleep(1000);
        attempts++;
      }
    }

    console.error('Transaction timeout');
    return false;
  }
}

// Error handling utilities
export class GameError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'GameError';
  }
}

export const parseAnchorError = (error: any): string => {
  if (error?.error?.errorMessage) {
    return error.error.errorMessage;
  }

  if (error?.message) {
    // Parse common Anchor errors
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds to complete transaction';
    }
    if (error.message.includes('GameNotJoinable')) {
      return 'This game is not accepting new players';
    }
    if (error.message.includes('GameFull')) {
      return 'This game is full (maximum 5 players)';
    }
    if (error.message.includes('AlreadyJoined')) {
      return 'You have already joined this game';
    }
    if (error.message.includes('GameNotInProgress')) {
      return 'Game is not currently in progress';
    }
    if (error.message.includes('PlayerNotFound')) {
      return 'Player not found in this game';
    }
    if (error.message.includes('NoBoostsRemaining')) {
      return 'No boosts remaining';
    }
    if (error.message.includes('NotWinner')) {
      return 'Only the winner can claim the prize';
    }

    return error.message;
  }

  return 'An unknown error occurred';
};

// Local storage utilities (for settings, not game state)
export const LocalStorage = {
  setItem: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  getItem: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return defaultValue;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
};

// Social sharing utilities
export const generateTweetText = (gameResult: {
  won: boolean;
  position?: number;
  totalPlayers: number;
  prizeAmount?: number;
}): string => {
  const baseText = "🏁 Just played Trash to Treasure Rally on #GorbaganaTestnet!";

  if (gameResult.won) {
    const prize = gameResult.prizeAmount ? ` Won ${formatSOL(gameResult.prizeAmount)} $gGOR!` : '';
    return `${baseText} 🏆 WON THE RACE!${prize} 🗑️➡️💎 @Gorbagana_chain @sarv_shaktimaan @lex_node`;
  } else {
    return `${baseText} Finished ${gameResult.position}/${gameResult.totalPlayers}. GG! 🗑️➡️💎 @Gorbagana_chain @sarv_shaktimaan @lex_node`;
  }
};

export const shareOnTwitter = (text: string): void => {
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(tweetUrl, '_blank');
};

// Game statistics utilities
export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  totalDistance: number;
  totalBoostsUsed: number;
  totalPrizesWon: number;
  winRate: number;
}

export const getPlayerStats = (pubkey: string): GameStats => {
  return LocalStorage.getItem(`playerStats_${pubkey}`, {
    gamesPlayed: 0,
    gamesWon: 0,
    totalDistance: 0,
    totalBoostsUsed: 0,
    totalPrizesWon: 0,
    winRate: 0,
  });
};

export const updatePlayerStats = (pubkey: string, gameResult: {
  won: boolean;
  distance: number;
  boostsUsed: number;
  prizeWon: number;
}): void => {
  const stats = getPlayerStats(pubkey);

  stats.gamesPlayed += 1;
  if (gameResult.won) stats.gamesWon += 1;
  stats.totalDistance += gameResult.distance;
  stats.totalBoostsUsed += gameResult.boostsUsed;
  stats.totalPrizesWon += gameResult.prizeWon;
  stats.winRate = stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0;

  LocalStorage.setItem(`playerStats_${pubkey}`, stats);
};

// Network status utilities
export const checkNetworkHealth = async (connection: Connection): Promise<{
  healthy: boolean;
  latency: number;
  blockHeight: number;
}> => {
  try {
    const startTime = Date.now();
    const blockHeight = await connection.getBlockHeight();
    const latency = Date.now() - startTime;

    return {
      healthy: latency < 5000, // Consider healthy if response < 5 seconds
      latency,
      blockHeight,
    };
  } catch (error) {
    console.error('Network health check failed:', error);
    return {
      healthy: false,
      latency: -1,
      blockHeight: 0,
    };
  }
};

// Animation utilities
export const animateValue = (
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void
): void => {
  const startTime = Date.now();
  const difference = end - start;

  const step = () => {
    const progress = Math.min((Date.now() - startTime) / duration, 1);
    const current = start + difference * progress;

    callback(Math.round(current));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

export default {
  CONFIG,
  formatSOL,
  formatPubkey,
  formatPubkeyLong,
  getProgressPercentage,
  getPlayerIcon,
  formatGameState,
  getTimeElapsed,
  isValidPublicKey,
  sleep,
  ConnectionManager,
  GameError,
  parseAnchorError,
  LocalStorage,
  generateTweetText,
  shareOnTwitter,
  getPlayerStats,
  updatePlayerStats,
  checkNetworkHealth,
  animateValue,
};
