// frontend/src/hooks/useGame.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN, web3, Idl } from '@coral-xyz/anchor';
import { GameState, Player, TransactionStatus } from '../types/game';
import { CONFIG, parseAnchorError, ConnectionManager, updatePlayerStats } from '../utils';
import raceContractIdl from '../idl/race_contract.json';

// Define the program account structure (matches blockchain snake_case fields)
interface ProgramGameAccount {
  authority: PublicKey;
  game_id: BN;
  state: any;
  entry_fee: BN;
  track_length: number;
  players: Array<{
    pubkey: PublicKey;
    position: number;
    boosts_remaining: number;
    finished: boolean;
  }>;
  prize_pool: BN;
  winner: PublicKey | null;
}

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

  // Initialize program with real IDL
  useEffect(() => {
    if (wallet && connection && publicKey) {
      try {
        const provider = new AnchorProvider(
          connection,
          wallet.adapter as any,
          { commitment: 'confirmed' }
        );

        // Create the program with the real IDL
        const raceProgram = new Program(
          raceContractIdl as unknown as Idl,
          CONFIG.PROGRAM_ID,
          provider
        );

        setProgram(raceProgram);
        console.log('Race contract program initialized with ID:', CONFIG.PROGRAM_ID.toString());
      } catch (err) {
        console.error('Error initializing program:', err);
        setError('Failed to initialize connection to blockchain');
      }
    } else {
      setProgram(null);
    }
  }, [wallet, connection, publicKey]);

  // Fetch real game state from blockchain
  const fetchGameState = useCallback(async () => {
    if (!program || !gameAccount) return;

    try {
      console.log('Fetching game state for:', gameAccount.toString());

      // Fetch actual game data from the blockchain
      const rawGameData = await program.account.game.fetch(gameAccount);
      const gameData = rawGameData as unknown as ProgramGameAccount;

      // Convert the raw game data to our GameState interface
      const convertedGameState: GameState = {
        authority: gameData.authority,
        gameId: gameData.game_id.toString(),
        state: convertGameStateEnum(gameData.state),
        entryFee: gameData.entry_fee.toNumber(),
        trackLength: gameData.track_length,
        players: gameData.players.map((player) => ({
          pubkey: player.pubkey,
          position: player.position,
          boostsRemaining: player.boosts_remaining,
          finished: player.finished,
        })),
        prizePool: gameData.prize_pool.toNumber(),
        winner: gameData.winner,
      };

      setGameState(convertedGameState);
      console.log('Game state updated:', convertedGameState);
    } catch (err) {
      console.error('Error fetching game state:', err);
      setError('Failed to fetch game state');
    }
  }, [program, gameAccount]);

  // Helper function to convert blockchain game state enum to our format
  const convertGameStateEnum = (state: any): 'waitingForPlayers' | 'inProgress' | 'finished' => {
    if (state.waitingForPlayers !== undefined) return 'waitingForPlayers';
    if (state.inProgress !== undefined) return 'inProgress';
    if (state.finished !== undefined) return 'finished';
    return 'waitingForPlayers';
  };

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
      setTransactionStatus({ status: 'pending', message: 'Sending transaction...' });

      const signature = await transactionFn();

      setTransactionStatus({
        status: 'success',
        message: successMessage,
        signature: signature
      });

      // Refresh game state after successful transaction
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

  // Game actions using real program methods
  const createGame = async (): Promise<boolean> => {
    if (!program || !publicKey) return false;

    return executeTransaction(async () => {
      const gameKeypair = web3.Keypair.generate();

      const tx = await program!.methods
        .initializeGame(new BN(CONFIG.ENTRY_FEE), CONFIG.TRACK_LENGTH)
        .accounts({
          game: gameKeypair.publicKey,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([gameKeypair])
        .rpc();

      setGameAccount(gameKeypair.publicKey);
      return tx;
    }, 'Game created successfully!');
  };

  const joinGame = async (gameId?: string): Promise<boolean> => {
    if (!program || !publicKey) return false;

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
      const tx = await program!.methods
        .joinRace()
        .accounts({
          game: targetGameAccount!,
          player: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    }, 'Joined game successfully!');
  };

  const rollDice = async (): Promise<boolean> => {
    if (!program || !publicKey || !gameAccount) return false;

    return executeTransaction(async () => {
      const tx = await program!.methods
        .rollAndMove()
        .accounts({
          game: gameAccount,
          player: publicKey,
        })
        .rpc();

      return tx;
    }, 'Dice rolled successfully!');
  };

  const useBoost = async (): Promise<boolean> => {
    if (!program || !publicKey || !gameAccount) return false;

    return executeTransaction(async () => {
      const tx = await program!.methods
        .useBoost()
        .accounts({
          game: gameAccount,
          player: publicKey,
        })
        .rpc();

      return tx;
    }, 'Boost used successfully!');
  };

  const claimPrize = async (): Promise<boolean> => {
    if (!program || !publicKey || !gameAccount) return false;

    const success = await executeTransaction(async () => {
      const tx = await program!.methods
        .claimPrize()
        .accounts({
          game: gameAccount,
          winner: publicKey,
          rent: web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      return tx;
    }, 'Prize claimed successfully!');

    if (success && gameState && currentPlayer) {
      updatePlayerStats(publicKey.toString(), {
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
  const currentPlayer = gameState?.players.find((p: Player) =>
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
