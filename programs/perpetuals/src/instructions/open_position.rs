//! OpenPosition instruction handler

use {
    crate::{
        error::PerpetualsError,
        events, math,
        state::{
            custody::Custody,
            oracle::OraclePrice,
            perpetuals::Perpetuals,
            pool::Pool,
            position::{Position, Side},
        },
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{Token, TokenAccount},
    solana_program::program_error::ProgramError,
};

#[derive(Accounts)]
#[instruction(params: OpenPositionParams)]
pub struct OpenPosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        constraint = funding_account.mint == custody.mint,
        has_one = owner
    )]
    pub funding_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: empty PDA, authority for token accounts
    #[account(
        seeds = [b"transfer_authority"],
        bump = perpetuals.transfer_authority_bump
    )]
    pub transfer_authority: AccountInfo<'info>,

    #[account(
        seeds = [b"perpetuals"],
        bump = perpetuals.perpetuals_bump
    )]
    pub perpetuals: Box<Account<'info, Perpetuals>>,

    #[account(
        mut,
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(
        init,
        payer = owner,
        space = Position::LEN,
        seeds = [
            b"position",
            owner.key().as_ref(),
            pool.key().as_ref(),
            custody.key().as_ref(),
            &[Side::Long as u8]
        ],
        bump
    )]
    pub position: Box<Account<'info, Position>>,

    #[account(
        mut,
        seeds = [
            b"custody",
            pool.key().as_ref(),
            custody.mint.as_ref()
        ],
        bump = custody.bump
    )]
    pub custody: Box<Account<'info, Custody>>,

    /// CHECK: oracle account for the position token
    #[account(
        constraint = custody_oracle_account.key() == custody.oracle.oracle_account
    )]
    pub custody_oracle_account: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"custody_token_account",
            pool.key().as_ref(),
            custody.mint.as_ref()
        ],
        bump = custody.token_account_bump
    )]
    pub custody_token_account: Box<Account<'info, TokenAccount>>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct OpenPositionParams {
    pub price: u64,
    pub collateral: u64,
    pub size: u64,
}

pub fn open_position<'info>(
    ctx: Context<'_, '_, '_, 'info, OpenPosition<'info>>,
    params: &OpenPositionParams,
) -> Result<()> {
    // check permissions
    msg!("Check permissions");
    let perpetuals = ctx.accounts.perpetuals.as_mut();
    let custody = ctx.accounts.custody.as_mut();
    require!(
        perpetuals.permissions.allow_open_position && custody.permissions.allow_open_position,
        PerpetualsError::InstructionNotAllowed
    );

    // validate inputs
    msg!("Validate inputs");
    if params.price == 0 || params.collateral == 0 || params.size == 0 {
        return Err(ProgramError::InvalidArgument.into());
    }

    let position = ctx.accounts.position.as_mut();
    let pool = ctx.accounts.pool.as_mut();

    // compute position price
    let curtime = perpetuals.get_time()?;

    let token_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
    )?;

    let position_price = pool.get_entry_price(&token_price, custody)?;
    msg!("Entry price: {}", position_price);

    require_gte!(
        params.price,
        position_price,
        PerpetualsError::MaxPriceSlippage
    );

    // compute position parameters
    let position_oracle_price = OraclePrice {
        price: position_price,
        exponent: -(Perpetuals::PRICE_DECIMALS as i32),
    };
    let size_usd = position_oracle_price.get_asset_amount_usd(params.size, custody.decimals)?;
    let collateral_usd = token_price.get_asset_amount_usd(params.collateral, custody.decimals)?;

    let locked_amount = custody.get_locked_amount(params.size)?;

    // A better name would be "locked_amount_usd" (its the same)
    let borrow_size_usd = if custody.pricing.max_payoff_mult as u128 != Perpetuals::BPS_POWER {
        position_oracle_price.get_asset_amount_usd(locked_amount, custody.decimals)?
    } else {
        size_usd
    };

    // compute fee
    let fee_amount = pool.get_entry_fee(
        custody.fees.open_position,
        params.size,
        locked_amount,
        custody,
    )?;
    let fee_amount_usd = token_price.get_asset_amount_usd(fee_amount, custody.decimals)?;
    msg!("Collected fee: {}", fee_amount);

    // compute amount to transfer
    let transfer_amount = math::checked_add(params.collateral, fee_amount)?;
    msg!("Amount in: {}", transfer_amount);

    // init new position
    msg!("Initialize new position");
    position.owner = ctx.accounts.owner.key();
    position.pool = pool.key();
    position.custody = custody.key();
    position.open_time = perpetuals.get_time()?;
    position.update_time = 0;
    position.price = position_price;
    position.size_usd = size_usd;
    position.borrow_size_usd = borrow_size_usd;
    position.collateral_usd = collateral_usd;
    position.unrealized_profit_usd = 0;
    position.unrealized_loss_usd = 0;
    position.cumulative_interest_snapshot = custody.get_cumulative_interest(curtime)?;
    position.locked_amount = locked_amount;
    position.collateral_amount = params.collateral;
    position.bump = ctx.bumps.position;

    // check position risk
    msg!("Check position risks");
    require!(
        position.locked_amount > 0,
        PerpetualsError::InsufficientAmountReturned
    );
    require!(
        pool.check_leverage(position, &token_price, custody, curtime, true)?,
        PerpetualsError::MaxLeverage
    );

    // lock funds for potential profit payoff
    custody.lock_funds(position.locked_amount)?;

    // transfer tokens
    msg!("Transfer tokens");
    perpetuals.transfer_tokens_from_user(
        ctx.accounts.funding_account.to_account_info(),
        ctx.accounts.custody_token_account.to_account_info(),
        ctx.accounts.owner.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        transfer_amount,
    )?;

    // update custody stats
    msg!("Update custody stats");
    custody.collected_fees.open_position_usd = custody
        .collected_fees
        .open_position_usd
        .wrapping_add(fee_amount_usd);

    custody.assets.collateral = math::checked_add(custody.assets.collateral, params.collateral)?;

    let protocol_fee = Pool::get_fee_amount(custody.fees.protocol_share, fee_amount)?;
    custody.assets.protocol_fees = math::checked_add(custody.assets.protocol_fees, protocol_fee)?;

    custody.volume_stats.open_position_usd = custody
        .volume_stats
        .open_position_usd
        .wrapping_add(size_usd);

    custody.trade_stats.oi_long_usd = math::checked_add(custody.trade_stats.oi_long_usd, size_usd)?;

    custody.add_position(position, &token_price, curtime)?;
    custody.update_borrow_rate(curtime)?;

    emit!(events::OpenPosition {
        borrow_size_usd: position.borrow_size_usd,
        collateral_amount: position.collateral_amount,
        collateral_usd: position.collateral_usd,
        custody: position.custody,
        locked_amount: position.locked_amount,
        owner: position.owner,
        pool: position.pool,
        price: position.price,
        size_usd: position.size_usd,
        time: position.open_time,
        transfer_amount: position.collateral_amount,
    });

    Ok(())
}
