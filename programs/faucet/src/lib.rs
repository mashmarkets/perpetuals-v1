use anchor_lang::prelude::*;
use instructions::*;
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

declare_id!("7TfpKdoDVa58JpZpMX3Tq8gYT9RcSr7XKqimYnGLrGQP");

#[program]
pub mod faucet {
    use super::*;

    pub fn competition_claim(
        ctx: Context<CompetitionClaim>,
        params: CompetitionClaimParams,
    ) -> Result<()> {
        competition_claim::competition_claim(ctx, params)
    }

    pub fn competition_end(
        ctx: Context<CompetitionEnd>,
        params: CompetitionEndParams,
    ) -> Result<()> {
        competition_end::competition_end(ctx, params)
    }

    pub fn competition_enter(
        ctx: Context<CompetitionEnter>,
        params: CompetitionEnterParams,
    ) -> Result<()> {
        competition_enter::competition_enter(ctx, params)
    }

    pub fn mint_create(ctx: Context<MintCreate>, params: MintCreateParams) -> Result<()> {
        mint_create::mint_create(ctx, params)
    }

    pub fn oracle_add(ctx: Context<OracleAdd>, params: OracleAddParams) -> Result<()> {
        oracle_add::oracle_add(ctx, params)
    }

    pub fn swap_buy(ctx: Context<SwapBuy>, params: SwapBuyParams) -> Result<()> {
        swap_buy::swap_buy(ctx, params)
    }

    pub fn swap_sell(ctx: Context<SwapSell>, params: SwapSellParams) -> Result<()> {
        swap_sell::swap_sell(ctx, params)
    }
}
