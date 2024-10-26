use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("An account's balance was too small to complete the instruction")]
    InsufficientFunds,
    #[msg("Invalid Quote Mint")]
    InvalidQuoteMint,
}
