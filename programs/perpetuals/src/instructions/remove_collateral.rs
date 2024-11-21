//! RemoveCollateral instruction handler

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
#[instruction(params: RemoveCollateralParams)]
pub struct RemoveCollateral<'info> {
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
        bump = position.bump
    )]
    pub position: Box<Account<'info, Position>>,

    #[account(
        mut,
        constraint = position.custody == custody.key()
    )]
    pub custody: Box<Account<'info, Custody>>,

    /// CHECK: oracle account for the collateral token
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

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RemoveCollateralParams {
    collateral_usd: u64,
}

pub fn remove_collateral<'info>(
    ctx: Context<'_, '_, '_, 'info, RemoveCollateral<'info>>,
    params: &RemoveCollateralParams,
) -> Result<()> {
    // check permissions
    msg!("Check permissions");
    let perpetuals = ctx.accounts.perpetuals.as_mut();
    let custody = ctx.accounts.custody.as_mut();
    require!(
        perpetuals.permissions.allow_collateral_withdrawal
            && custody.permissions.allow_collateral_withdrawal,
        PerpetualsError::InstructionNotAllowed
    );

    // validate inputs
    msg!("Validate inputs");
    let position = ctx.accounts.position.as_mut();
    if params.collateral_usd == 0 || params.collateral_usd >= position.collateral_usd {
        return Err(ProgramError::InvalidArgument.into());
    }
    let pool = ctx.accounts.pool.as_mut();

    // compute position price
    let curtime = perpetuals.get_time()?;

    let token_price = OraclePrice::new_from_oracle(
        &ctx.accounts.custody_oracle_account.to_account_info(),
        &custody.oracle,
        curtime,
    )?;

    // compute amount to transfer
    let collateral = token_price.get_token_amount(params.collateral_usd, custody.decimals)?;
    if collateral > position.collateral_amount {
        return Err(ProgramError::InsufficientFunds.into());
    }
    msg!("Amount out: {}", collateral);

    // update existing position
    msg!("Update existing position");
    position.update_time = perpetuals.get_time()?;
    position.collateral_usd = math::checked_sub(position.collateral_usd, params.collateral_usd)?;
    position.collateral_amount = math::checked_sub(position.collateral_amount, collateral)?;

    // check position risk
    msg!("Check position risks");
    require!(
        pool.check_leverage(position, &token_price, custody, curtime, true)?,
        PerpetualsError::MaxLeverage
    );

    // transfer tokens
    msg!("Transfer tokens");
    perpetuals.transfer_tokens(
        ctx.accounts.custody_token_account.to_account_info(),
        ctx.accounts.receiving_account.to_account_info(),
        ctx.accounts.transfer_authority.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        collateral,
    )?;

    // update custody stats
    msg!("Update custody stats");
    custody.assets.collateral = math::checked_sub(custody.assets.collateral, collateral)?;

    emit!(events::RemoveCollateral {
        collateral_amount: position.collateral_amount,
        custody: position.custody,
        owner: position.owner,
        pool: position.pool,
        price: token_price
            .scale_to_exponent(-(Perpetuals::PRICE_DECIMALS as i32))?
            .price,
        size_usd: position.size_usd,
        time: curtime,
        transfer_amount: collateral,
    });

    Ok(())
}
