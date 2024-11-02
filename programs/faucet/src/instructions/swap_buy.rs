use {
    crate::{constants::USDC, error::ErrorCode, state::Oracle},
    anchor_lang::prelude::*,
    anchor_spl::token::{burn, mint_to, Burn, Mint, MintTo, Token, TokenAccount},
    pyth_solana_receiver_sdk::price_update::PriceUpdateV2,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SwapBuyParams {
    amount_out: u64,
    canonical_in: Pubkey,
    canonical_out: Pubkey,
    epoch: i64,
}

#[derive(Accounts)]
#[instruction(params: SwapBuyParams)]
pub struct SwapBuy<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [
        b"oracle",
        params.canonical_out.key().as_ref()
        ],
        bump = oracle.bump
    )]
    pub oracle: Account<'info, Oracle>,

    #[account()]
    pub price_update: Account<'info, PriceUpdateV2>,

    #[account(
        mut,
        seeds = [
            b"mint",
            params.canonical_in.key().as_ref(),
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
            b"mint",
            params.canonical_out.key().as_ref(),
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

pub fn swap_buy(ctx: Context<SwapBuy>, params: SwapBuyParams) -> Result<()> {
    require!(
        params.canonical_in.key() == USDC,
        ErrorCode::InvalidQuoteMint
    );

    let price_update = &mut ctx.accounts.price_update;
    let clock = Clock::get()?;
    let price = price_update.get_price_no_older_than(
        &clock,
        ctx.accounts.oracle.max_price_age_sec.into(),
        &ctx.accounts.oracle.feed_id,
    )?;

    let coefficient = params.amount_out as u128 * price.price as u128;
    let exponent = ctx.accounts.mint_in.decimals as i32 + price.exponent
        - ctx.accounts.mint_out.decimals as i32;

    let amount_in = if exponent > 0 {
        coefficient * 10u128.pow(exponent as u32)
    } else {
        coefficient / 10u128.pow(exponent.unsigned_abs())
    } as u64;

    require!(
        ctx.accounts.token_account_in.amount >= amount_in,
        ErrorCode::InsufficientFunds
    );

    msg!("Swap In {}, Out {}", amount_in, params.amount_out);

    burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.mint_in.to_account_info(),
                from: ctx.accounts.token_account_in.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        ),
        amount_in.try_into().unwrap(),
    )?;

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
            params.canonical_out.as_ref(),
            params.epoch.to_le_bytes().as_ref(),
            &[bump],
        ]]),
        params.amount_out,
    )?;
    Ok(())
}
