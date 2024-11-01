use {
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{mint_to, Mint, MintTo, Token, TokenAccount},
    },
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct MintCreateParams {
    amount: u64,
    canonical: Pubkey,
    decimals: u8,
    epoch: i64,
}

#[derive(Accounts)]
#[instruction(params: MintCreateParams)]
pub struct MintCreate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // Create mint account
    // Same PDA as address of the account and mint
    #[account(
        init,
        seeds = [
            b"mint",
            params.canonical.key().as_ref(),
            params.epoch.to_le_bytes().as_ref()
        ],
        bump,
        payer = payer,
        mint::decimals = params.decimals,
        mint::authority = mint.key(),
    )]
    pub mint: Account<'info, Mint>,

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

pub fn mint_create(ctx: Context<MintCreate>, params: MintCreateParams) -> Result<()> {
    if params.amount == 0 {
        return Ok(());
    }

    let bump = ctx.bumps.mint;
    mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.mint.to_account_info(), // PDA mint authority, required as signer
            },
        )
        .with_signer(&[&[
            b"mint",
            params.canonical.as_ref(),
            params.epoch.to_le_bytes().as_ref(),
            &[bump],
        ]]), // using PDA to sign
        params.amount,
    )?;

    Ok(())
}
