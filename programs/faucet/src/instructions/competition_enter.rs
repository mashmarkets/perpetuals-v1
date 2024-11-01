use {
    crate::error::ErrorCode,
    anchor_lang::prelude::*,
    anchor_spl::token::{
        mint_to, transfer_checked, Mint, MintTo, Token, TokenAccount, TransferChecked,
    },
    std::str::FromStr,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CompetitionEnterParams {
    amount: u64,
    epoch: i64,
}

#[derive(Accounts)]
#[instruction(params: CompetitionEnterParams)]
pub struct CompetitionEnter<'info> {
    // TODO check that this is admin
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub mint_in: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = mint_in,
        token::authority = payer,
        constraint = token_account_in.amount >= params.amount,
    )]
    pub token_account_in: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer=payer,
        seeds = [
            b"vault",
            Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap().key().as_ref(),
            params.epoch.to_le_bytes().as_ref()
        ],
        bump,
        token::mint = mint_in,
        token::authority = payer,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            b"mint",
            Pubkey::from_str("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v").unwrap().key().as_ref(),
            params.epoch.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub mint_out: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = mint_out,
        token::authority = payer,
    )]
    pub token_account_out: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn competition_enter(
    ctx: Context<CompetitionEnter>,
    params: CompetitionEnterParams,
) -> Result<()> {
    // Transfer fee to vault
    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.token_account_in.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint_in.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        ),
        params.amount,
        ctx.accounts.mint_in.decimals,
    )?;

    require_eq!(params.amount % 50000000, 0, ErrorCode::InvalidEntryAmount);

    let amount_out = params.amount * 200; // 0.05 SOL = 10,000 USDC
                                          // Mint out token to user
    let bump = ctx.bumps.mint_out;

    mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint_out.to_account_info(),
                to: ctx.accounts.token_account_out.to_account_info(),
                authority: ctx.accounts.mint_out.to_account_info(), // PDA mint authority, required as signer
            },
        )
        .with_signer(&[&[
            b"mint",
            Pubkey::from_str("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
                .unwrap()
                .as_ref(),
            params.epoch.to_le_bytes().as_ref(),
            &[bump],
        ]]),
        amount_out,
    )?;
    Ok(())
}
