//! GetEntryPriceAndFee instruction handler

use {
    crate::state::{
        custody::Custody,
        oracle::OraclePrice,
        perpetuals::{NewPositionPricesAndFee, Perpetuals},
        pool::Pool,
        position::Position,
    },
    anchor_lang::prelude::*,
    solana_program::program_error::ProgramError,
};

#[derive(Accounts)]
pub struct GetEntryPriceAndFee<'info> {
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
pub struct GetEntryPriceAndFeeParams {
    collateral: u64,
    size: u64,
}

pub fn get_entry_price_and_fee<'info>(
    ctx: Context<'_, '_, '_, 'info, GetEntryPriceAndFee<'info>>,
    params: &GetEntryPriceAndFeeParams,
) -> Result<NewPositionPricesAndFee> {
    // validate inputs
    if params.collateral == 0 || params.size == 0 {
        return Err(ProgramError::InvalidArgument.into());
    }
    let pool = &ctx.accounts.pool;
    let custody = &ctx.accounts.custody;

    // compute position price
    let curtime = ctx.accounts.perpetuals.get_time()?;

    let token_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
    )?;

    let entry_price = pool.get_entry_price(&token_price, custody)?;

    let position_oracle_price = OraclePrice {
        price: entry_price,
        exponent: -(Perpetuals::PRICE_DECIMALS as i32),
    };
    let size_usd = position_oracle_price.get_asset_amount_usd(params.size, custody.decimals)?;
    let collateral_usd = token_price.get_asset_amount_usd(params.collateral, custody.decimals)?;

    let locked_amount = custody.get_locked_amount(params.size)?;

    let position = Position {
        price: entry_price,
        size_usd,
        collateral_usd,
        cumulative_interest_snapshot: custody.get_cumulative_interest(curtime)?,
        ..Position::default()
    };

    let liquidation_price = pool.get_liquidation_price(&position, custody, curtime)?;

    let fee = pool.get_entry_fee(
        custody.fees.open_position,
        params.size,
        locked_amount,
        custody,
    )?;

    Ok(NewPositionPricesAndFee {
        entry_price,
        liquidation_price,
        fee,
    })
}
