// frontend/src/hooks/useGame.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { GameState, Player, TransactionStatus } from '../types/game';
import { CONFIG, parseAnchorError, ConnectionManager, updatePlayerStats } from '../utils';

interface UseGameReturn {
  // Game state
  gameAccount: PublicKey | null;
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  transactionStatus: TransactionStatus | null;

  // Game actions
  createGame: () => Promise<boolean>;
  joinGame: (gameId?: string) => Promise<boolean>;
  rollDice: () => Promise<boolean>;
  useBoost: () => Promise<boolean>;
  claimPrize: () => Promise<boolean>;

  // Utility functions
  setGameAccount: (account: PublicKey | null) => void;
  clearError: () => void;
  refreshGameState: () => Promise<void>;

  // Player info
  currentPlayer: Player | null;
  isPlayerInGame: boolean;
  canJoin: boolean;
  canPlay: boolean;
  hasWon: boolean;
}

export const useGame = (): UseGameReturn => {
  const { connection } = useConnection();
  const { publicKey, wallet } = useWallet();

  // State
  const [gameAccount, setGameAccount] = useState<PublicKey | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null);
  const [program, setProgram] = useState<Program | null>(null);

  // Refs for cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionManager = useRef<ConnectionManager>(new ConnectionManager());

  // Mock program initialization (since IDL might not be ready)
  useEffect(() => {
    if (wallet && connection && publicKey) {
      try {
        const provider = new AnchorProvider(
          connection,
          wallet.adapter as any,
          { commitment: 'confirmed' }
        );

        // For now, we'll create a mock program object to pass validation
        // In production, you'd import the actual IDL here
        const mockProgram = {
          methods: {},
          account: {},
          provider,
        } as any;

        setProgram(mockProgram);

        console.log('Mock program initialized for testing');
      } catch (err) {
        console.error('Error initializing provider:', err);
        setError('Failed to initialize connection to blockchain');
      }
    } else {
      setProgram(null);
    }
  }, [wallet, connection, publicKey]);

  // Mock fetch game state (replace with real implementation)
  const fetchGameState = useCallback(async () => {
    if (!gameAccount) return;

    try {
      console.log('Fetching game state for:', gameAccount.toString());

      // Create mock game data based on current state
      const mockGameState: GameState = {
        authority: publicKey || new PublicKey("11111111111111111111111111111111"),
        gameId: gameAccount.toString().slice(-8),
        state: gameState?.state || 'waitingForPlayers',
        entryFee: CONFIG.ENTRY_FEE,
        trackLength: CONFIG.TRACK_LENGTH,
        players: gameState?.players || [],
        prizePool: gameState?.prizePool || 0,
        winner: gameState?.winner || null,
      };

      setGameState(mockGameState);
      console.log('Mock game state updated:', mockGameState);
    } catch (err) {
      console.error('Error fetching game state:', err);
      setError('Failed to fetch game state');
    }
  }, [gameAccount, publicKey, gameState]);
    if (!program || !gameAccount) return;

    try {
      // Mock game data - replace with actual program.account.game.fetch(gameAccount)
      const mockGameState: GameState = {
        authority: new PublicKey("11111111111111111111111111111111"),
        gameId: Date.now().toString(),
        state: 'waitingForPlayers',
        entryFee: CONFIG.ENTRY_FEE,
        trackLength: CONFIG.TRACK_LENGTH,
        players: [],
        prizePool: 0,
        winner: null,
      };

      setGameState(mockGameState);
    } catch (err) {
      console.error('Error fetching game state:', err);
      setError('Failed to fetch game state');
    }
  }, [program, gameAccount]);

  // Set up polling for game state updates
  useEffect(() => {
    if (gameAccount && program) {
      fetchGameState();

      pollIntervalRef.current = setInterval(fetchGameState, 2000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [gameAccount, program, fetchGameState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Helper function to execute transactions
  const executeTransaction = async (
    transactionFn: () => Promise<string>,
    successMessage: string
  ): Promise<boolean> => {
    console.log('executeTransaction called with:', {
      program: !!program,
      publicKey: !!publicKey,
      wallet: !!wallet,
      connection: !!connection
    });

    if (!publicKey) {
      setError('Please connect your wallet first');
      return false;
    }

    if (!wallet) {
      setError('Wallet not found');
      return false;
    }

    if (!program) {
      setError('Game program not initialized. Please refresh and try again.');
      return false;
    }

    setIsLoading(true);
    setError(null);
    setTransactionStatus({ status: 'pending', message: 'Preparing transaction...' });

    try {
      // Mock transaction execution for now
      console.log('Executing mock transaction...');
      setTransactionStatus({ status: 'pending', message: 'Sending transaction...' });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockSignature = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      setTransactionStatus({
        status: 'success',
        message: successMessage,
        signature: mockSignature
      });

      await fetchGameState();

      setTimeout(() => setTransactionStatus(null), 3000);

      return true;
    } catch (err: any) {
      console.error('Transaction error:', err);
      const errorMessage = parseAnchorError(err);
      setError(errorMessage);
      setTransactionStatus({ status: 'error', message: errorMessage });

      setTimeout(() => setTransactionStatus(null), 5000);

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Game actions (mocked for now)
  const createGame = async (): Promise<boolean> => {
    return executeTransaction(async () => {
      const gameKeypair = web3.Keypair.generate();
      setGameAccount(gameKeypair.publicKey);
      return 'mock_signature';
    }, 'Game created successfully!');
  };

  const joinGame = async (gameId?: string): Promise<boolean> => {
    let targetGameAccount = gameAccount;

    if (gameId) {
      try {
        targetGameAccount = new PublicKey(gameId);
        setGameAccount(targetGameAccount);
      } catch {
        setError('Invalid game ID');
        return false;
      }
    }

    if (!targetGameAccount) {
      setError('No game selected');
      return false;
    }

    return executeTransaction(async () => {
      return 'mock_signature';
    }, 'Joined game successfully!');
  };

  const rollDice = async (): Promise<boolean> => {
    return executeTransaction(async () => {
      return 'mock_signature';
    }, 'Dice rolled successfully!');
  };

  const useBoost = async (): Promise<boolean> => {
    return executeTransaction(async () => {
      return 'mock_signature';
    }, 'Boost used successfully!');
  };

  const claimPrize = async (): Promise<boolean> => {
    const success = await executeTransaction(async () => {
      return 'mock_signature';
    }, 'Prize claimed successfully!');

    if (success && gameState && currentPlayer) {
      updatePlayerStats(publicKey!.toString(), {
        won: true,
        distance: currentPlayer.position,
        boostsUsed: CONFIG.BOOSTS_PER_PLAYER - currentPlayer.boostsRemaining,
        prizeWon: gameState.prizePool,
      });
    }

    return success;
  };

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    setTransactionStatus(null);
  }, []);

  // Refresh game state manually
  const refreshGameState = useCallback(async () => {
    await fetchGameState();
  }, [fetchGameState]);

  // Computed values
  const currentPlayer = gameState?.players.find(p =>
    publicKey && p.pubkey.equals(publicKey)
  ) || null;

  const isPlayerInGame = !!currentPlayer;

  const canJoin = gameState?.state === 'waitingForPlayers' &&
                  !isPlayerInGame &&
                  gameState.players.length < CONFIG.MAX_PLAYERS;

  const canPlay = gameState?.state === 'inProgress' &&
                  isPlayerInGame &&
                  !currentPlayer?.finished;

  const hasWon = !!(gameState?.winner &&
                 publicKey &&
                 gameState.winner.equals(publicKey));

  return {
    // State
    gameAccount,
    gameState,
    isLoading,
    error,
    transactionStatus,

    // Actions
    createGame,
    joinGame,
    rollDice,
    useBoost,
    claimPrize,

    // Utilities
    setGameAccount,
    clearError,
    refreshGameState,

    // Computed values
    currentPlayer,
    isPlayerInGame,
    canJoin,
    canPlay,
    hasWon,
  };
};
