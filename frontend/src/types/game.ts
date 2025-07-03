// frontend/src/types/game.ts

import { PublicKey } from '@solana/web3.js';

export interface Player {
  pubkey: PublicKey;
  position: number;
  boostsRemaining: number;
  finished: boolean;
}

export interface GameState {
  authority: PublicKey;
  gameId: string;
  state: 'waitingForPlayers' | 'inProgress' | 'finished';
  entryFee: number;
  trackLength: number;
  players: Player[];
  prizePool: number;
  winner: PublicKey | null;
}

export interface GameAccount {
  authority: PublicKey;
  gameId: string;
  state: GameStateEnum;
  entryFee: number;
  trackLength: number;
  players: PlayerAccount[];
  prizePool: number;
  winner: PublicKey | null;
}

export interface PlayerAccount {
  pubkey: PublicKey;
  position: number;
  boostsRemaining: number;
  finished: boolean;
}

export enum GameStateEnum {
  WaitingForPlayers = 'waitingForPlayers',
  InProgress = 'inProgress',
  Finished = 'finished',
}

// Game events for real-time updates
export interface GameEvent {
  type: 'playerJoined' | 'playerMoved' | 'playerBoosted' | 'gameStarted' | 'gameFinished';
  player?: PublicKey;
  data?: any;
  timestamp: number;
}

// Transaction status
export interface TransactionStatus {
  status: 'pending' | 'success' | 'error';
  message?: string;
  signature?: string;
}
