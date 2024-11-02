use {
    crate::{
        constants::{NATIVE_MINT, USDC},
        error::ErrorCode,
        state::Competition,
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{
        self, transfer_checked, FreezeAccount, Mint, Token, TokenAccount, TransferChecked,
    },
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CompetitionClaimParams {
    epoch: i64,
}

#[derive(Accounts)]
#[instruction(params: CompetitionClaimParams)]
pub struct CompetitionClaim<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"mint",
            USDC.as_ref(),
            params.epoch.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub mint_in: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = mint_in,
        token::authority = payer,
    )]
    pub token_account_in: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            b"vault",
            NATIVE_MINT.as_ref(),
            params.epoch.to_le_bytes().as_ref()
        ],
        bump,
        token::mint = NATIVE_MINT,
        token::authority = vault,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            b"competition",
            params.epoch.to_le_bytes().as_ref()
        ],
        bump = competition.bump
    )]
    pub competition: Account<'info, Competition>,

    #[account()]
    pub mint_out: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = NATIVE_MINT,
        token::authority = payer,
    )]
    pub token_account_out: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn competition_claim(
    ctx: Context<CompetitionClaim>,
    params: CompetitionClaimParams,
) -> Result<()> {
    require!(
        !ctx.accounts.token_account_in.is_frozen(),
        ErrorCode::AlreadyClaimed
    );

    require!(
        ctx.accounts.mint_in.mint_authority.is_none(),
        ErrorCode::CompetitionNotEnded,
    );

    // Freeze the USDC, so it cannot be transferred of claimed again
    token::freeze_account(CpiContext::new_with_signer(
        ctx.accounts.mint_in.to_account_info(),
        FreezeAccount {
            account: ctx.accounts.token_account_in.to_account_info(),
            mint: ctx.accounts.mint_in.to_account_info(),
            authority: ctx.accounts.mint_in.to_account_info(),
        },
        &[&[
            b"mint",
            USDC.as_ref(),
            params.epoch.to_le_bytes().as_ref(),
            &[ctx.bumps.mint_in],
        ]],
    ))?;

    let amount: u64 = TryInto::<u64>::try_into(
        ctx.accounts.token_account_in.amount as u128 * ctx.accounts.competition.total as u128
            / ctx.accounts.mint_in.supply as u128,
    )
    .unwrap();

    // Send the reward based on their proportion
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.token_account_out.to_account_info(),
                mint: ctx.accounts.mint_out.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            &[&[
                b"vault",
                NATIVE_MINT.as_ref(),
                params.epoch.to_le_bytes().as_ref(),
                &[ctx.bumps.vault],
            ]],
        ),
        amount,
        ctx.accounts.mint_out.decimals,
    )?;

    Ok(())
}
