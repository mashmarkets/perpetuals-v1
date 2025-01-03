//! GetOraclePrice instruction handler

use {
    crate::state::{custody::Custody, oracle::OraclePrice, perpetuals::Perpetuals, pool::Pool},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct GetOraclePrice<'info> {
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
pub struct GetOraclePriceParams {}

pub fn get_oracle_price<'info>(
    ctx: Context<'_, '_, '_, 'info, GetOraclePrice<'info>>,
    _params: &GetOraclePriceParams,
) -> Result<u64> {
    let custody = &ctx.accounts.custody;
    let curtime = ctx.accounts.perpetuals.get_time()?;

    let price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
    )?;

    Ok(price
        .scale_to_exponent(-(Perpetuals::PRICE_DECIMALS as i32))?
        .price)
}
