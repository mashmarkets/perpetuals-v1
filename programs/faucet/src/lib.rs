use anchor_lang::prelude::*;
use instructions::*;
pub mod error;
pub mod instructions;
pub mod state;

declare_id!("BPXsk7o3PWaXMNJRyUk7m7VogYZQYAVXeNgPd5j1Dq9S");

#[program]
pub mod faucet {
    use super::*;

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
