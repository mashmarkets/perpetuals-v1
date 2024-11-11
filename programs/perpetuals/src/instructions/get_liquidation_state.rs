//! GetLiquidationState instruction handler

use {
    crate::state::{
        custody::Custody,
        oracle::OraclePrice,
        perpetuals::Perpetuals,
        pool::Pool,
        position::{Position, Side},
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct GetLiquidationState<'info> {
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
pub struct GetLiquidationStateParams {}

pub fn get_liquidation_state<'info>(
    ctx: Context<'_, '_, '_, 'info, GetLiquidationState<'info>>,
    _params: &GetLiquidationStateParams,
) -> Result<u8> {
    let custody = &ctx.accounts.custody;
    let curtime = ctx.accounts.perpetuals.get_time()?;

    let token_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
    )?;

    if ctx.accounts.pool.check_leverage(
        &ctx.accounts.position,
        &token_price,
        custody,
        curtime,
        false,
    )? {
        Ok(0)
    } else {
        Ok(1)
    }
}
