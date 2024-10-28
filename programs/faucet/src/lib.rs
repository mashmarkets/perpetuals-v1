use anchor_lang::prelude::*;
use instructions::*;
pub mod error;
pub mod instructions;
pub mod state;

declare_id!("JArCk1B16SwusW63tvTfUzVmKFgRtCMQENB4rrHzu8FV");

#[program]
pub mod faucet {
    use super::*;

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
