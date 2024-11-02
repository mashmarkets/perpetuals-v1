use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Oracle {
    pub feed_id: [u8; 32],
    pub max_price_age_sec: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Competition {
    pub total: u64,
    pub bump: u8,
}
