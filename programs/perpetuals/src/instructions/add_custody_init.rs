//! AddCustody instruction handler

use {
    super::AddCustodyParams,
    crate::state::{custody::Custody, multisig::Multisig, perpetuals::Perpetuals, pool::Pool},
    anchor_lang::prelude::*,
    anchor_spl::token::{Mint, Token},
};

#[derive(Accounts)]
pub struct AddCustodyInit<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"multisig"],
        bump = multisig.load()?.bump
    )]
    pub multisig: AccountLoader<'info, Multisig>,

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
        realloc = Pool::LEN + (pool.custodies.len() + 1) * std::mem::size_of::<Pubkey>(),
        realloc::payer = admin,
        realloc::zero = false,
        seeds = [b"pool", pool.name.as_bytes()],
        bump = pool.bump
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(
        init_if_needed,
        payer = admin,
        space = Custody::LEN,
        seeds = [b"custody",
            pool.key().as_ref(),
            custody_token_mint.key().as_ref()
        ],
        bump
    )]
    pub custody: Box<Account<'info, Custody>>,

    // #[account(
    //     init_if_needed,
    //     payer = admin,
    //     token::mint = custody_token_mint,
    //     token::authority = transfer_authority,
    //     seeds = [
    //         b"custody_token_account",
    //         pool.key().as_ref(),
    //         custody_token_mint.key().as_ref()
    //     ],
    //     bump
    // )]
    // pub custody_token_account: Box<Account<'info, TokenAccount>>,
    #[account()]
    pub custody_token_mint: Box<Account<'info, Mint>>,

    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

// Workaround for https://github.com/anza-xyz/agave/issues/1186
pub fn add_custody_init<'info>(
    _ctx: Context<'_, '_, '_, 'info, AddCustodyInit<'info>>,
    _params: &AddCustodyParams,
) -> Result<u8> {
    Ok(0)
}
