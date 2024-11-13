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
pub struct GetPosition<'info> {
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
pub struct GetPositionParams {}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GetPositionResult {
    pub profit: u64,
    pub loss: u64,
    pub liquidation_price: u64,
    pub liquidation_state: bool,
    pub mark_price: u64,
    pub leverage: u64,
    pub margin: u64,
}

pub fn get_position<'info>(
    ctx: Context<'_, '_, '_, 'info, GetPosition<'info>>,
    _params: &GetPositionParams,
) -> Result<GetPositionResult> {
    // get oracle prices
    let position = &ctx.accounts.position;
    let pool = &ctx.accounts.pool;
    let curtime = ctx.accounts.perpetuals.get_time()?;
    let custody = &ctx.accounts.custody;

    let token_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
    )?;

    // compute pnl
    let (profit, loss, _) = pool.get_pnl_usd(position, &token_price, custody, curtime, false)?;

    let liquidation_price =
        ctx.accounts
            .pool
            .get_liquidation_price(position, &token_price, custody, curtime)?;

    let leverage = ctx
        .accounts
        .pool
        .get_leverage(position, &token_price, custody, curtime)?;

    let leverage_check = ctx.accounts.pool.check_leverage(
        &ctx.accounts.position,
        &token_price,
        custody,
        curtime,
        false,
    )?;

    let margin = math::checked_as_u64(math::checked_div(
        math::checked_mul(leverage as u128, Perpetuals::BPS_POWER)?,
        ctx.accounts.custody.pricing.max_leverage as u128,
    )?)?;

    // Convert to price decimals
    let mark_price = token_price
        .scale_to_exponent(-(Perpetuals::PRICE_DECIMALS as i32))?
        .price;

    Ok(GetPositionResult {
        profit,
        loss,
        liquidation_price,
        liquidation_state: !leverage_check,
        mark_price,
        leverage,
        margin,
    })
}
