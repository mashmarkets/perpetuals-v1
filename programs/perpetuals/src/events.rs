use anchor_lang::prelude::*;

#[event]
pub struct OpenPosition {
    pub borrow_size_usd: u64,
    pub collateral_amount: u64,
    pub collateral_usd: u64,
    pub custody: Pubkey,
    pub locked_amount: u64,
    pub open_time: i64,
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub price: u64,
    pub size_usd: u64,
}
