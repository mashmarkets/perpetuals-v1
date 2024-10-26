use {
    crate::state::Oracle,
    anchor_lang::prelude::*,
    pyth_solana_receiver_sdk::price_update::{get_feed_id_from_hex, PriceUpdateV2},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct OracleAddParams {
    canonical: Pubkey,
    feed_id: String,
    max_price_age_sec: u32,
}

#[derive(Accounts)]
#[instruction(params: OracleAddParams)]
pub struct OracleAdd<'info> {
    // TODO check that this is admin
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + Oracle::INIT_SPACE,
        seeds = [
            b"oracle",
            params.canonical.key().as_ref(),
        ],
        bump
    )]
    pub oracle: Account<'info, Oracle>,

    pub price_update: Account<'info, PriceUpdateV2>,
    pub system_program: Program<'info, System>,
}

pub fn oracle_add(ctx: Context<OracleAdd>, params: OracleAddParams) -> Result<()> {
    let bump = *ctx.bumps.get("oracle").ok_or(ProgramError::InvalidSeeds)?;

    ctx.accounts.oracle.set_inner(Oracle {
        feed_id: get_feed_id_from_hex(&params.feed_id)?,
        max_price_age_sec: params.max_price_age_sec,
        bump,
    });

    Ok(())
}
