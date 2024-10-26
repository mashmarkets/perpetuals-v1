use {
    anchor_lang::prelude::*,
    anchor_spl::token::{Mint, Token},
};

#[derive(Accounts)]
#[instruction(canonical: Pubkey, decimals: u8)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // Create mint account
    // Same PDA as address of the account and mint
    #[account(
        init,
        seeds = [b"mint", canonical.key().as_ref()],
        bump,
        payer = payer,
        mint::decimals = decimals,
        mint::authority = mint_account.key(),
    )]
    pub mint_account: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_token(_ctx: Context<CreateToken>, _canonical: Pubkey, _decimals: u8) -> Result<()> {
    Ok(())
}
