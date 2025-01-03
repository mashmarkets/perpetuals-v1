//! GetLiquidationPrice instruction handler

use {
    crate::{
        math,
        state::{
            custody::Custody,
            oracle::OraclePrice,
            perpetuals::Perpetuals,
            pool::Pool,
            position::{Position, Side},
        },
    },
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct GetLiquidationPrice<'info> {
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
pub struct GetLiquidationPriceParams {
    add_collateral: u64,
    remove_collateral: u64,
}

pub fn get_liquidation_price<'info>(
    ctx: Context<'_, '_, '_, 'info, GetLiquidationPrice<'info>>,
    params: &GetLiquidationPriceParams,
) -> Result<u64> {
    let custody = &ctx.accounts.custody;
    let curtime = ctx.accounts.perpetuals.get_time()?;

    let token_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
    )?;

    let mut position = ctx.accounts.position.clone();
    position.update_time = ctx.accounts.perpetuals.get_time()?;

    if params.add_collateral > 0 {
        let collateral_usd =
            token_price.get_asset_amount_usd(params.add_collateral, custody.decimals)?;
        position.collateral_usd = math::checked_add(position.collateral_usd, collateral_usd)?;
        position.collateral_amount =
            math::checked_add(position.collateral_amount, params.add_collateral)?;
    }
    if params.remove_collateral > 0 {
        let collateral_usd =
            token_price.get_asset_amount_usd(params.remove_collateral, custody.decimals)?;
        if collateral_usd >= position.collateral_usd
            || params.remove_collateral >= position.collateral_amount
        {
            return Err(ProgramError::InsufficientFunds.into());
        }
        position.collateral_usd = math::checked_sub(position.collateral_usd, collateral_usd)?;
        position.collateral_amount =
            math::checked_sub(position.collateral_amount, params.remove_collateral)?;
    }

    ctx.accounts
        .pool
        .get_liquidation_price(&position, custody, curtime)
}
