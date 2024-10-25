use anchor_lang::prelude::*;
use instructions::*;
pub mod instructions;

declare_id!("BfHV8RBTKSKFCkCYdbwyPEb3DLACKfBzq8Y2FPXipiaC");

#[program]
pub mod simulator {

    use super::*;

    pub fn create_token(ctx: Context<CreateToken>, seed: Pubkey, decimals: u8) -> Result<()> {
        create::create_token(ctx, seed, decimals)
    }

    pub fn mint_token(ctx: Context<MintToken>, seed: Pubkey, amount: u64) -> Result<()> {
        mint::mint_token(ctx, seed, amount)
    }
}
