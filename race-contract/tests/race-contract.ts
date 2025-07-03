// race-contract/tests/race-contract.ts

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RaceContract } from "../target/types/race_contract";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("race-contract", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RaceContract as Program<RaceContract>;

  // Test accounts
  let gameKeypair: anchor.web3.Keypair;
  let authority: anchor.web3.Keypair;
  let player1: anchor.web3.Keypair;
  let player2: anchor.web3.Keypair;

  const ENTRY_FEE = 0.01 * LAMPORTS_PER_SOL;
  const TRACK_LENGTH = 20; // Shorter for testing

  beforeEach(async () => {
    // Generate fresh keypairs for each test
    gameKeypair = anchor.web3.Keypair.generate();
    authority = anchor.web3.Keypair.generate();
    player1 = anchor.web3.Keypair.generate();
    player2 = anchor.web3.Keypair.generate();

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(player1.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(player2.publicKey, 2 * LAMPORTS_PER_SOL);

    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it("Initializes a new game", async () => {
    await program.methods
      .initializeGame(new anchor.BN(ENTRY_FEE), TRACK_LENGTH)
      .accounts({
        game: gameKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([gameKeypair, authority])
      .rpc();

    // Fetch the created game account
    const gameAccount = await program.account.game.fetch(gameKeypair.publicKey);

    expect(gameAccount.authority.toString()).to.equal(authority.publicKey.toString());
    expect(gameAccount.entryFee.toNumber()).to.equal(ENTRY_FEE);
    expect(gameAccount.trackLength).to.equal(TRACK_LENGTH);
    expect(gameAccount.players).to.have.length(0);
    expect(gameAccount.prizePool.toNumber()).to.equal(0);
    expect(gameAccount.state).to.deep.equal({ waitingForPlayers: {} });
  });

  it("Allows players to join a race", async () => {
    // Initialize game
    await program.methods
      .initializeGame(new anchor.BN(ENTRY_FEE), TRACK_LENGTH)
      .accounts({
        game: gameKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([gameKeypair, authority])
      .rpc();

    // Player 1 joins
    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    let gameAccount = await program.account.game.fetch(gameKeypair.publicKey);
    expect(gameAccount.players).to.have.length(1);
    expect(gameAccount.players[0].pubkey.toString()).to.equal(player1.publicKey.toString());
    expect(gameAccount.players[0].position).to.equal(0);
    expect(gameAccount.players[0].boostsRemaining).to.equal(3);
    expect(gameAccount.prizePool.toNumber()).to.equal(ENTRY_FEE);

    // Player 2 joins - should start the game
    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    gameAccount = await program.account.game.fetch(gameKeypair.publicKey);
    expect(gameAccount.players).to.have.length(2);
    expect(gameAccount.prizePool.toNumber()).to.equal(ENTRY_FEE * 2);
    expect(gameAccount.state).to.deep.equal({ inProgress: {} });
  });

  it("Allows players to roll dice and move", async () => {
    // Setup game with players
    await program.methods
      .initializeGame(new anchor.BN(ENTRY_FEE), TRACK_LENGTH)
      .accounts({
        game: gameKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([gameKeypair, authority])
      .rpc();

    // Add players
    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    // Player 1 rolls dice
    await program.methods
      .rollAndMove()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    const gameAccount = await program.account.game.fetch(gameKeypair.publicKey);
    const player1Data = gameAccount.players.find(p =>
      p.pubkey.toString() === player1.publicKey.toString()
    );

    expect(player1Data.position).to.be.greaterThan(0);
    expect(player1Data.position).to.be.lessThan(7); // Dice roll 1-6
  });

  it("Allows players to use boosts", async () => {
    // Setup game with players
    await program.methods
      .initializeGame(new anchor.BN(ENTRY_FEE), TRACK_LENGTH)
      .accounts({
        game: gameKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([gameKeypair, authority])
      .rpc();

    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    // Player 1 uses boost
    await program.methods
      .useBoost()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    const gameAccount = await program.account.game.fetch(gameKeypair.publicKey);
    const player1Data = gameAccount.players.find(p =>
      p.pubkey.toString() === player1.publicKey.toString()
    );

    expect(player1Data.position).to.equal(3); // +3 from boost
    expect(player1Data.boostsRemaining).to.equal(2); // 3 - 1 = 2
  });

  it("Declares winner when player reaches finish line", async () => {
    const shortTrack = 5; // Very short track for testing

    await program.methods
      .initializeGame(new anchor.BN(ENTRY_FEE), shortTrack)
      .accounts({
        game: gameKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([gameKeypair, authority])
      .rpc();

    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    // Use boost to guarantee win
    await program.methods
      .useBoost()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    // Use another boost to exceed track length
    await program.methods
      .useBoost()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    const gameAccount = await program.account.game.fetch(gameKeypair.publicKey);

    expect(gameAccount.state).to.deep.equal({ finished: {} });
    expect(gameAccount.winner.toString()).to.equal(player1.publicKey.toString());

    const player1Data = gameAccount.players.find(p =>
      p.pubkey.toString() === player1.publicKey.toString()
    );
    expect(player1Data.finished).to.be.true;
    expect(player1Data.position).to.be.greaterThanOrEqual(shortTrack);
  });

  it("Prevents invalid actions", async () => {
    // Initialize game
    await program.methods
      .initializeGame(new anchor.BN(ENTRY_FEE), TRACK_LENGTH)
      .accounts({
        game: gameKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([gameKeypair, authority])
      .rpc();

    // Try to roll dice before game starts (should fail)
    try {
      await program.methods
        .rollAndMove()
        .accounts({
          game: gameKeypair.publicKey,
          player: player1.publicKey,
        })
        .signers([player1])
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("GameNotInProgress");
    }

    // Join game
    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    // Try to join again (should fail)
    try {
      await program.methods
        .joinRace()
        .accounts({
          game: gameKeypair.publicKey,
          player: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.toString()).to.include("AlreadyJoined");
    }
  });

  it("Allows winner to claim prize", async () => {
    const shortTrack = 3;

    await program.methods
      .initializeGame(new anchor.BN(ENTRY_FEE), shortTrack)
      .accounts({
        game: gameKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([gameKeypair, authority])
      .rpc();

    // Add players
    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .joinRace()
      .accounts({
        game: gameKeypair.publicKey,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    // Get initial balance
    const initialBalance = await provider.connection.getBalance(player1.publicKey);

    // Win the game
    await program.methods
      .useBoost()
      .accounts({
        game: gameKeypair.publicKey,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    // Claim prize
    await program.methods
      .claimPrize()
      .accounts({
        game: gameKeypair.publicKey,
        winner: player1.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([player1])
      .rpc();

    // Check balance increased
    const finalBalance = await provider.connection.getBalance(player1.publicKey);
    expect(finalBalance).to.be.greaterThan(initialBalance);

    // Check prize pool is now empty
    const gameAccount = await program.account.game.fetch(gameKeypair.publicKey);
    expect(gameAccount.prizePool.toNumber()).to.equal(0);
  });
});
