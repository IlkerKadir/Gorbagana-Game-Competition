// programs/race-contract/src/lib.rs

use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod race_contract {
    use super::*;

    // Initialize a new race game
    pub fn initialize_game(ctx: Context<InitializeGame>, entry_fee: u64, track_length: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.authority = ctx.accounts.authority.key();
        game.state = GameState::WaitingForPlayers;
        game.entry_fee = entry_fee;
        game.track_length = track_length;
        game.players = vec![];
        game.prize_pool = 0;
        game.winner = None;
        game.game_id = Clock::get()?.slot;

        msg!("Game initialized with ID: {}, entry fee: {}, track length: {}",
             game.game_id, entry_fee, track_length);
        Ok(())
    }

    // Player joins the race
    pub fn join_race(ctx: Context<JoinRace>) -> Result<()> {
        let player = ctx.accounts.player.key();

        // Check game state first (before mutable borrow)
        require!(ctx.accounts.game.state == GameState::WaitingForPlayers, GameError::GameNotJoinable);
        require!(ctx.accounts.game.players.len() < 5, GameError::GameFull);
        require!(!ctx.accounts.game.players.iter().any(|p| p.pubkey == player), GameError::AlreadyJoined);

        // Store entry fee before mutable borrow
        let entry_fee = ctx.accounts.game.entry_fee;

        // Transfer entry fee to game PDA
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: ctx.accounts.game.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        anchor_lang::system_program::transfer(cpi_ctx, entry_fee)?;

        // Now get mutable borrow for modifications
        let game = &mut ctx.accounts.game;

        // Add player to game
        game.players.push(Player {
            pubkey: player,
            position: 0,
            boosts_remaining: 3, // Each player gets 3 boosts
            finished: false,
        });
        game.prize_pool += entry_fee;

        msg!("Player {} joined race. Total players: {}", player, game.players.len());

        // Start game if we have enough players (minimum 2)
        if game.players.len() >= 2 {
            game.state = GameState::InProgress;
            msg!("Race started with {} players!", game.players.len());
        }

        Ok(())
    }

    // Player rolls dice and moves
    pub fn roll_and_move(ctx: Context<RollAndMove>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player_pubkey = ctx.accounts.player.key();

        // Check game state
        require!(game.state == GameState::InProgress, GameError::GameNotInProgress);

        // Find player
        let player_index = game.players.iter().position(|p| p.pubkey == player_pubkey)
            .ok_or(GameError::PlayerNotFound)?;

        require!(!game.players[player_index].finished, GameError::PlayerAlreadyFinished);

        // Generate dice roll (1-6) using clock and player pubkey for randomness
        let clock = Clock::get()?;
        let mut random_seed = clock.slot;
        random_seed = random_seed.wrapping_add(player_pubkey.to_bytes()[0] as u64);
        random_seed = random_seed.wrapping_add(clock.unix_timestamp as u64);
        let dice_roll = (random_seed % 6) + 1;

        // Store track length before modifying anything
        let track_length = game.track_length;

        // Move player and check if won in one scope
        let won = {
            let player = &mut game.players[player_index];
            player.position += dice_roll as u8;

            msg!("Player {} rolled {} and moved to position {}",
                 player_pubkey, dice_roll, player.position);

            // Check if won
            if player.position >= track_length {
                player.finished = true;
                true
            } else {
                false
            }
        };

        // Update game state if won (outside of player borrow scope)
        if won {
            game.state = GameState::Finished;
            game.winner = Some(player_pubkey);
            msg!("Player {} wins the race!", player_pubkey);
        }

        Ok(())
    }

    // Player uses a boost for extra movement
    pub fn use_boost(ctx: Context<UseBoost>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player_pubkey = ctx.accounts.player.key();

        // Check game state
        require!(game.state == GameState::InProgress, GameError::GameNotInProgress);

        // Find player
        let player_index = game.players.iter().position(|p| p.pubkey == player_pubkey)
            .ok_or(GameError::PlayerNotFound)?;

        require!(!game.players[player_index].finished, GameError::PlayerAlreadyFinished);
        require!(game.players[player_index].boosts_remaining > 0, GameError::NoBoostsRemaining);

        // Store track length before modifying anything
        let track_length = game.track_length;

        // Use boost (+3 movement) and check if won in one scope
        let won = {
            let player = &mut game.players[player_index];
            player.boosts_remaining -= 1;
            player.position += 3;

            msg!("Player {} used boost, moved +3 to position {}. Boosts remaining: {}",
                 player_pubkey, player.position, player.boosts_remaining);

            // Check if won
            if player.position >= track_length {
                player.finished = true;
                true
            } else {
                false
            }
        };

        // Update game state if won (outside of player borrow scope)
        if won {
            game.state = GameState::Finished;
            game.winner = Some(player_pubkey);
            msg!("Player {} wins the race with a boost!", player_pubkey);
        }

        Ok(())
    }

    // Claim prize (winner only)
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let winner = ctx.accounts.winner.key();

        require!(game.state == GameState::Finished, GameError::GameNotFinished);
        require!(game.winner == Some(winner), GameError::NotWinner);
        require!(game.prize_pool > 0, GameError::NoPrizeToClaimX);

        // Transfer prize pool to winner
        let _rent_exempt_amount = ctx.accounts.rent.minimum_balance(std::mem::size_of::<Game>());
        let prize_amount = game.prize_pool;

        **game.to_account_info().try_borrow_mut_lamports()? -= prize_amount;
        **ctx.accounts.winner.try_borrow_mut_lamports()? += prize_amount;

        game.prize_pool = 0;
        msg!("Winner {} claimed prize of {} lamports!", winner, prize_amount);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<Game>()
    )]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinRace<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RollAndMove<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct UseBoost<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub winner: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Game {
    pub authority: Pubkey,
    pub game_id: u64,
    pub state: GameState,
    pub entry_fee: u64,
    pub track_length: u8,
    pub players: Vec<Player>,
    pub prize_pool: u64,
    pub winner: Option<Pubkey>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Player {
    pub pubkey: Pubkey,
    pub position: u8,
    pub boosts_remaining: u8,
    pub finished: bool,
}

#[derive(Clone, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub enum GameState {
    WaitingForPlayers,
    InProgress,
    Finished,
}

#[error_code]
pub enum GameError {
    #[msg("Game is not accepting new players")]
    GameNotJoinable,
    #[msg("Game is full (max 5 players)")]
    GameFull,
    #[msg("Player already joined this game")]
    AlreadyJoined,
    #[msg("Game is not in progress")]
    GameNotInProgress,
    #[msg("Player not found in this game")]
    PlayerNotFound,
    #[msg("Player already finished the race")]
    PlayerAlreadyFinished,
    #[msg("No boosts remaining")]
    NoBoostsRemaining,
    #[msg("Game not finished yet")]
    GameNotFinished,
    #[msg("Only the winner can claim the prize")]
    NotWinner,
    #[msg("No prize to claim")]
    NoPrizeToClaimX,
}
