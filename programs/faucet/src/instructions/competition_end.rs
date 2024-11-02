use {
    crate::{
        constants::{NATIVE_MINT, USDC},
        error::ErrorCode,
        state::Competition,
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{
        set_authority, spl_token::instruction::AuthorityType, Mint, SetAuthority, Token,
        TokenAccount,
    },
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CompetitionEndParams {
    epoch: i64,
}

#[derive(Accounts)]
#[instruction(params: CompetitionEndParams)]
pub struct CompetitionEnd<'info> {
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
    pub mint: Account<'info, Mint>,

    #[account(
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
        init,
        payer = payer,
        space = 8 + Competition::INIT_SPACE,
        seeds = [
            b"competition",
            params.epoch.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub competition: Account<'info, Competition>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn competition_end(ctx: Context<CompetitionEnd>, params: CompetitionEndParams) -> Result<()> {
    // Check epoch has ended
    require!(
        Clock::get()?.unix_timestamp >= params.epoch,
        ErrorCode::CompetitionNotEnded,
    );

    // Disable new minting of USDC for this epoch
    set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SetAuthority {
                current_authority: ctx.accounts.mint.to_account_info(),
                account_or_mint: ctx.accounts.mint.to_account_info(),
            },
            &[&[
                b"mint",
                USDC.as_ref(),
                params.epoch.to_le_bytes().as_ref(),
                &[ctx.bumps.mint],
            ]],
        ),
        AuthorityType::MintTokens,
        None,
    )?;

    ctx.accounts.competition.set_inner(Competition {
        total: ctx.accounts.vault.amount,
        bump: ctx.bumps.competition,
    });

    Ok(())
}
