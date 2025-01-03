use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("An account's balance was too small to complete the instruction")]
    InsufficientFunds,
    #[msg("Invalid Quote Mint")]
    InvalidQuoteMint,
    #[msg("Invalid Entry Amount")]
    InvalidPaymentMint,
    #[msg("Invalid Payment Mint")]
    InvalidEntryAmount,
    #[msg("Competition has not ended yet")]
    CompetitionNotEnded,
    #[msg("Competition has already ended")]
    CompetitionEnded,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("The arguments provided to a program instruction were invalid")]
    InvalidArgument,
}
