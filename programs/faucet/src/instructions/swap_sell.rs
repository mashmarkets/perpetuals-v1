use {
    crate::{constants::USDC, state::Oracle},
    anchor_lang::prelude::*,
    anchor_spl::token::{burn, mint_to, Burn, Mint, MintTo, Token, TokenAccount},
    pyth_solana_receiver_sdk::price_update::PriceUpdateV2,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SwapSellParams {
    amount_in: u64,
    canonical_in: Pubkey,
    epoch: i64,
}

#[derive(Accounts)]
#[instruction(params: SwapSellParams)]
pub struct SwapSell<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [
            b"oracle",
            params.canonical_in.key().as_ref()
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
            0_i64.to_le_bytes().as_ref()
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
            USDC.as_ref(),
            params.epoch.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub mint_out: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = mint_out,
    )]
    pub token_account_out: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn swap_sell(ctx: Context<SwapSell>, params: SwapSellParams) -> Result<()> {
    msg!("{}", u64::MAX);

    let amount_in = if params.amount_in == u64::MAX {
        ctx.accounts.token_account_in.amount
    } else {
        params.amount_in
    };

    let price_update = &mut ctx.accounts.price_update;
    let clock = Clock::get()?;
    let price = price_update.get_price_no_older_than(
        &clock,
        ctx.accounts.oracle.max_price_age_sec.into(),
        &ctx.accounts.oracle.feed_id,
    )?;

    let coefficient = amount_in as u128 * price.price as u128;
    let exponent = ctx.accounts.mint_out.decimals as i32 + price.exponent
        - ctx.accounts.mint_in.decimals as i32;

    let amount_out = if exponent > 0 {
        coefficient * 10u128.pow(exponent as u32)
    } else {
        coefficient / 10u128.pow(exponent.unsigned_abs())
    } as u64;
    // let amount_out = 1 as u64;

    msg!("Swap In {}, Out {}", amount_in, amount_out);

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
            USDC.as_ref(),
            params.epoch.to_le_bytes().as_ref(),
            &[bump],
        ]]),
        amount_out,
    )?;
    Ok(())
}
