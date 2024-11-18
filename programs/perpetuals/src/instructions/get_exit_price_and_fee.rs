//! GetExitPriceAndFee instruction handler

use {
    crate::state::{
        custody::Custody,
        oracle::OraclePrice,
        perpetuals::{Perpetuals, PriceAndFee},
        pool::Pool,
        position::{Position, Side},
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct GetExitPriceAndFee<'info> {
    #[account(
        seeds = [b"perpetuals"],
        bump = perpetuals.perpetuals_bump
    )]
    pub perpetuals: Box<Account<'info, Perpetuals>>,

    #[account(
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(
        seeds = [
            b"position",
            position.owner.as_ref(),
            pool.key().as_ref(),
            custody.key().as_ref(),
            &[Side::Long as u8]
        ],
        bump = position.bump
    )]
    pub position: Box<Account<'info, Position>>,

    #[account(
        seeds = [
            b"custody",
            pool.key().as_ref(),
            custody.mint.as_ref()
        ],
        bump = custody.bump
    )]
    pub custody: Box<Account<'info, Custody>>,

    /// CHECK: oracle account for the collateral token
    #[account(
        constraint = custody_oracle_account.key() == custody.oracle.oracle_account
    )]
    pub custody_oracle_account: UncheckedAccount<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GetExitPriceAndFeeParams {}

pub fn get_exit_price_and_fee<'info>(
    ctx: Context<'_, '_, '_, 'info, GetExitPriceAndFee<'info>>,
    _params: &GetExitPriceAndFeeParams,
) -> Result<PriceAndFee> {
    // compute exit price and fee
    let position = &ctx.accounts.position;
    let pool = &ctx.accounts.pool;
    let curtime = ctx.accounts.perpetuals.get_time()?;
    let custody = &ctx.accounts.custody;

    let token_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
    )?;

    let price = pool.get_exit_price(&token_price, custody)?;

    let (_, _, fee) = pool.get_pnl_usd(position, &token_price, custody, curtime, false)?;

    Ok(PriceAndFee { price, fee })
}
