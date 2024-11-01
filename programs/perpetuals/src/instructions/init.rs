//! Init instruction handler

use {
    crate::{error::PerpetualsError, state::multisig::Multisig, state::perpetuals::Perpetuals},
    anchor_lang::prelude::*,
    anchor_spl::token::Token,
};

#[derive(Accounts)]
pub struct Init<'info> {
    #[account(mut)]
    pub upgrade_authority: Signer<'info>,

    #[account(
        init,
        payer = upgrade_authority,
        space = Multisig::LEN,
        seeds = [b"multisig"],
        bump
    )]
    pub multisig: AccountLoader<'info, Multisig>,

    /// CHECK: empty PDA, will be set as authority for token accounts
    #[account(
        init,
        payer = upgrade_authority,
        space = 0,
        seeds = [b"transfer_authority"],
        bump
    )]
    pub transfer_authority: AccountInfo<'info>,

    #[account(
        init,
        payer = upgrade_authority,
        space = Perpetuals::LEN,
        seeds = [b"perpetuals"],
        bump
    )]
    pub perpetuals: Box<Account<'info, Perpetuals>>,

    /// CHECK: ProgramData account, doesn't work in tests
    #[account()]
    pub perpetuals_program_data: UncheckedAccount<'info>,

    pub perpetuals_program: Program<'info, crate::program::Perpetuals>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    // remaining accounts: 1 to Multisig::MAX_SIGNERS admin signers (read-only, unsigned)
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct InitParams {
    pub min_signatures: u8,
    pub allow_add_liquidity: bool,
    pub allow_remove_liquidity: bool,
    pub allow_open_position: bool,
    pub allow_close_position: bool,
    pub allow_pnl_withdrawal: bool,
    pub allow_collateral_withdrawal: bool,
    pub allow_size_change: bool,
}

pub fn init<'info>(
    ctx: Context<'_, '_, '_, 'info, Init<'info>>,
    params: &InitParams,
) -> Result<()> {
    Perpetuals::validate_upgrade_authority(
        ctx.accounts.upgrade_authority.key(),
        &ctx.accounts.perpetuals_program_data,
        &ctx.accounts.perpetuals_program,
    )?;

    // initialize multisig, this will fail if account is already initialized
    let mut multisig = ctx.accounts.multisig.load_init()?;

    multisig.set_signers(ctx.remaining_accounts, params.min_signatures)?;

    // record multisig PDA bump
    multisig.bump = ctx.bumps.multisig;

    // record perpetuals
    let perpetuals = ctx.accounts.perpetuals.as_mut();

    perpetuals.permissions.allow_add_liquidity = params.allow_add_liquidity;
    perpetuals.permissions.allow_remove_liquidity = params.allow_remove_liquidity;
    perpetuals.permissions.allow_open_position = params.allow_open_position;
    perpetuals.permissions.allow_close_position = params.allow_close_position;
    perpetuals.permissions.allow_pnl_withdrawal = params.allow_pnl_withdrawal;
    perpetuals.permissions.allow_collateral_withdrawal = params.allow_collateral_withdrawal;
    perpetuals.permissions.allow_size_change = params.allow_size_change;
    perpetuals.transfer_authority_bump = ctx.bumps.transfer_authority;
    perpetuals.perpetuals_bump = ctx.bumps.perpetuals;
    perpetuals.inception_time = perpetuals.get_time()?;

    if !perpetuals.validate() {
        return err!(PerpetualsError::InvalidPerpetualsConfig);
    }

    Ok(())
}
