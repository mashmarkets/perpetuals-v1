use {
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{mint_to, Mint, MintTo, Token, TokenAccount},
    },
};

#[derive(Accounts)]
#[instruction(canonical: Pubkey)]
pub struct MintToken<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // Mint account address is a PDA
    #[account(
        mut,
        seeds = [b"mint", canonical.key().as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,

    // Create Associated Token Account, if needed
    // This is the account that will hold the minted tokens
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn mint_token(ctx: Context<MintToken>, canonical: Pubkey, amount: u64) -> Result<()> {
    let bump = *ctx.bumps.get("mint").ok_or(ProgramError::InvalidSeeds)?;
    // PDA signer seeds

    let signer_seeds: &[&[&[u8]]] = &[&[b"mint", canonical.as_ref(), &[bump]]];

    // Invoke the mint_to instruction on the token program
    mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.mint.to_account_info(), // PDA mint authority, required as signer
            },
        )
        .with_signer(signer_seeds), // using PDA to sign
        amount,
    )?;

    Ok(())
}
