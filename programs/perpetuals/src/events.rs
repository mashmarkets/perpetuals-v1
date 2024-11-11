use anchor_lang::prelude::*;

#[event]
pub struct OpenPosition {
    // Common Position fields
    pub collateral_amount: u64,
    pub custody: Pubkey,
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub price: u64,
    pub size_usd: u64,
    pub time: i64,
    // Unique fields
    pub borrow_size_usd: u64,
    pub collateral_usd: u64,
    pub locked_amount: u64,
}

#[event]
pub struct ClosePosition {
    // Common Position fields
    pub collateral_amount: u64,
    pub custody: Pubkey,
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub price: u64,
    pub size_usd: u64,
    pub time: i64,
    // Unique fields
    pub fee_amount: u64,
    pub loss_usd: u64,
    pub profit_usd: u64,
    pub protocol_fee: u64,
    pub transfer_amount: u64,
}

#[event]
pub struct LiquidatePosition {
    // Common Position fields
    pub collateral_amount: u64,
    pub custody: Pubkey,
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub price: u64,
    pub size_usd: u64,
    pub time: i64,
    // Common with Close position
    pub fee_amount: u64,
    pub loss_usd: u64,
    pub profit_usd: u64,
    pub protocol_fee: u64,
    pub transfer_amount: u64,
    // Unique fields
    pub signer: Pubkey,
    pub reward_amount: u64,
}
