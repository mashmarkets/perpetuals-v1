//! ClosePosition instruction handler

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
};

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        constraint = receiving_account.mint == custody.mint,
        has_one = owner
    )]
    pub receiving_account: Box<Account<'info, TokenAccount>>,

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
        mut,
        has_one = owner,
        seeds = [
            b"position",
            owner.key().as_ref(),
            pool.key().as_ref(),
            custody.key().as_ref(),
            &[Side::Long as u8]
        ],
        bump = position.bump,
        close = owner
    )]
    pub position: Box<Account<'info, Position>>,

    #[account(
        mut,
        constraint = position.custody == custody.key()
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

    token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ClosePositionParams {
    pub price: u64,
}

pub fn close_position<'info>(
    ctx: Context<'_, '_, '_, 'info, ClosePosition<'info>>,
    params: &ClosePositionParams,
) -> Result<()> {
    // check permissions
    msg!("Check permissions");
    let perpetuals = ctx.accounts.perpetuals.as_mut();
    let custody = ctx.accounts.custody.as_mut();
    require!(
        perpetuals.permissions.allow_close_position && custody.permissions.allow_close_position,
        PerpetualsError::InstructionNotAllowed
    );

    // validate inputs
    msg!("Validate inputs");
    if params.price == 0 {
        return Err(ProgramError::InvalidArgument.into());
    }
    let position = ctx.accounts.position.as_mut();
    let pool = ctx.accounts.pool.as_mut();

    // compute exit price
    let curtime = perpetuals.get_time()?;

    let token_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
        false,
    )?;

    let token_ema_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
        custody.pricing.use_ema,
    )?;

    let exit_price = pool.get_exit_price(&token_price, &token_ema_price, custody)?;
    msg!("Exit price: {}", exit_price);

    require_gte!(exit_price, params.price, PerpetualsError::MaxPriceSlippage);

    msg!("Settle position");
    let (transfer_amount, fee_amount, profit_usd, loss_usd) = pool.get_close_amount(
        position,
        &token_price,
        &token_ema_price,
        custody,
        curtime,
        false,
    )?;

    let fee_amount_usd = token_ema_price.get_asset_amount_usd(fee_amount, custody.decimals)?;

    msg!("Net profit: {}, loss: {}", profit_usd, loss_usd);
    msg!("Collected fee: {}", fee_amount);
    msg!("Amount out: {}", transfer_amount);

    // unlock pool funds
    custody.unlock_funds(position.locked_amount)?;

    // check pool constraints
    msg!("Check pool constraints");
    require!(
        pool.check_available_amount(transfer_amount, custody)?,
        PerpetualsError::CustodyAmountLimit
    );

    // transfer tokens
    msg!("Transfer tokens");
    perpetuals.transfer_tokens(
        ctx.accounts.custody_token_account.to_account_info(),
        ctx.accounts.receiving_account.to_account_info(),
        ctx.accounts.transfer_authority.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        transfer_amount,
    )?;

    // update custody stats
    msg!("Update custody stats");
    custody.collected_fees.close_position_usd = custody
        .collected_fees
        .close_position_usd
        .wrapping_add(fee_amount_usd);

    if transfer_amount > position.collateral_amount {
        let amount_lost = transfer_amount.saturating_sub(position.collateral_amount);
        custody.assets.owned = math::checked_sub(custody.assets.owned, amount_lost)?;
    } else {
        let amount_gained = position.collateral_amount.saturating_sub(transfer_amount);
        custody.assets.owned = math::checked_add(custody.assets.owned, amount_gained)?;
    }
    custody.assets.collateral =
        math::checked_sub(custody.assets.collateral, position.collateral_amount)?;

    let protocol_fee = Pool::get_fee_amount(custody.fees.protocol_share, fee_amount)?;

    // Pay protocol_fee from custody if possible, otherwise no protocol_fee
    if pool.check_available_amount(protocol_fee, custody)? {
        custody.assets.protocol_fees =
            math::checked_add(custody.assets.protocol_fees, protocol_fee)?;

        custody.assets.owned = math::checked_sub(custody.assets.owned, protocol_fee)?;
    }

    custody.volume_stats.close_position_usd = custody
        .volume_stats
        .close_position_usd
        .wrapping_add(position.size_usd);

    custody.trade_stats.oi_long_usd = custody
        .trade_stats
        .oi_long_usd
        .saturating_sub(position.size_usd);

    custody.trade_stats.profit_usd = custody.trade_stats.profit_usd.wrapping_add(profit_usd);
    custody.trade_stats.loss_usd = custody.trade_stats.loss_usd.wrapping_add(loss_usd);

    custody.remove_position(position, curtime)?;
    custody.update_borrow_rate(curtime)?;

    emit!(events::ClosePosition {
        profit_usd,
        loss_usd,
        fee_amount,
        transfer_amount,
        protocol_fee,
        collateral_amount: position.collateral_amount,
        custody: position.custody,
        time: position.open_time,
        owner: position.owner,
        pool: position.pool,
        price: exit_price,
        size_usd: position.size_usd,
    });
    Ok(())
}
