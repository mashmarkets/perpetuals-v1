//! Perpetuals program entrypoint

#![allow(clippy::result_large_err)]

pub mod error;
pub mod events;
pub mod instructions;
pub mod math;
pub mod state;

use {
    anchor_lang::prelude::*,
    instructions::*,
    state::perpetuals::{AmountAndFee, NewPositionPricesAndFee, PriceAndFee, ProfitAndLoss},
};

solana_security_txt::security_txt! {
    name: "Perpetuals",
    project_url: "https://github.com/solana-labs/perpetuals",
    contacts: "email:defi@solana.com",
    policy: "",
    preferred_languages: "en",
    auditors: "Halborn"
}

declare_id!("BYebp9bdeK45oNLKxpacWJYq9Fy3TSzNN3Yn3iRaxtam");

#[macro_export]
macro_rules! try_from {
    // https://github.com/coral-xyz/anchor/pull/2770
    ($ty: ty, $acc: expr) => {
        <$ty>::try_from(unsafe { core::mem::transmute::<_, &AccountInfo<'_>>($acc.as_ref()) })
    };
}

#[program]
pub mod perpetuals {
    use super::*;

    // admin instructions
    pub fn init<'info>(
        ctx: Context<'_, '_, '_, 'info, Init<'info>>,
        params: InitParams,
    ) -> Result<()> {
        instructions::init(ctx, &params)
    }

    pub fn add_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, AddPool<'info>>,
        params: AddPoolParams,
    ) -> Result<u8> {
        instructions::add_pool(ctx, &params)
    }

    pub fn force_close<'info>(
        ctx: Context<'_, '_, '_, 'info, ForceClose<'info>>,
        params: ForceCloseParams,
    ) -> Result<u8> {
        instructions::force_close(ctx, &params)
    }

    pub fn remove_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, RemovePool<'info>>,
        params: RemovePoolParams,
    ) -> Result<u8> {
        instructions::remove_pool(ctx, &params)
    }

    pub fn add_custody_init<'info>(
        ctx: Context<'_, '_, '_, 'info, AddCustodyInit<'info>>,
        params: AddCustodyParams,
    ) -> Result<u8> {
        instructions::add_custody_init(ctx, &params)
    }
    pub fn add_custody<'info>(
        ctx: Context<'_, '_, '_, 'info, AddCustody<'info>>,
        params: AddCustodyParams,
    ) -> Result<u8> {
        instructions::add_custody(ctx, &params)
    }

    pub fn remove_custody<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveCustody<'info>>,
        params: RemoveCustodyParams,
    ) -> Result<u8> {
        instructions::remove_custody(ctx, &params)
    }

    pub fn set_admin_signers<'info>(
        ctx: Context<'_, '_, '_, 'info, SetAdminSigners<'info>>,
        params: SetAdminSignersParams,
    ) -> Result<u8> {
        instructions::set_admin_signers(ctx, &params)
    }

    pub fn set_custody_config<'info>(
        ctx: Context<'_, '_, '_, 'info, SetCustodyConfig<'info>>,
        params: SetCustodyConfigParams,
    ) -> Result<u8> {
        instructions::set_custody_config(ctx, &params)
    }

    pub fn set_permissions<'info>(
        ctx: Context<'_, '_, '_, 'info, SetPermissions<'info>>,
        params: SetPermissionsParams,
    ) -> Result<u8> {
        instructions::set_permissions(ctx, &params)
    }

    pub fn withdraw_fees<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawFees<'info>>,
        params: WithdrawFeesParams,
    ) -> Result<u8> {
        instructions::withdraw_fees(ctx, &params)
    }

    pub fn withdraw_sol_fees<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawSolFees<'info>>,
        params: WithdrawSolFeesParams,
    ) -> Result<u8> {
        instructions::withdraw_sol_fees(ctx, &params)
    }

    pub fn set_custom_oracle_price<'info>(
        ctx: Context<'_, '_, '_, 'info, SetCustomOraclePrice<'info>>,
        params: SetCustomOraclePriceParams,
    ) -> Result<u8> {
        instructions::set_custom_oracle_price(ctx, &params)
    }

    // public instructions

    pub fn add_liquidity<'info>(
        ctx: Context<'_, '_, 'info, 'info, AddLiquidity<'info>>,
        params: AddLiquidityParams,
    ) -> Result<()> {
        instructions::add_liquidity(ctx, &params)
    }

    pub fn remove_liquidity<'info>(
        ctx: Context<'_, '_, 'info, 'info, RemoveLiquidity<'info>>,
        params: RemoveLiquidityParams,
    ) -> Result<()> {
        instructions::remove_liquidity(ctx, &params)
    }

    pub fn open_position<'info>(
        ctx: Context<'_, '_, '_, 'info, OpenPosition<'info>>,
        params: OpenPositionParams,
    ) -> Result<()> {
        instructions::open_position(ctx, &params)
    }

    pub fn add_collateral<'info>(
        ctx: Context<'_, '_, '_, 'info, AddCollateral<'info>>,
        params: AddCollateralParams,
    ) -> Result<()> {
        instructions::add_collateral(ctx, &params)
    }

    pub fn remove_collateral<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveCollateral<'info>>,
        params: RemoveCollateralParams,
    ) -> Result<()> {
        instructions::remove_collateral(ctx, &params)
    }

    pub fn close_position<'info>(
        ctx: Context<'_, '_, '_, 'info, ClosePosition<'info>>,
        params: ClosePositionParams,
    ) -> Result<()> {
        instructions::close_position(ctx, &params)
    }

    pub fn liquidate<'info>(
        ctx: Context<'_, '_, '_, 'info, Liquidate<'info>>,
        params: LiquidateParams,
    ) -> Result<()> {
        instructions::liquidate(ctx, &params)
    }

    pub fn update_pool_aum<'info>(
        ctx: Context<'_, '_, 'info, 'info, UpdatePoolAum<'info>>,
    ) -> Result<u128> {
        instructions::update_pool_aum(ctx)
    }

    pub fn get_add_liquidity_amount_and_fee<'info>(
        ctx: Context<'_, '_, 'info, 'info, GetAddLiquidityAmountAndFee<'info>>,
        params: GetAddLiquidityAmountAndFeeParams,
    ) -> Result<AmountAndFee> {
        instructions::get_add_liquidity_amount_and_fee(ctx, &params)
    }

    pub fn get_remove_liquidity_amount_and_fee<'info>(
        ctx: Context<'_, '_, 'info, 'info, GetRemoveLiquidityAmountAndFee<'info>>,
        params: GetRemoveLiquidityAmountAndFeeParams,
    ) -> Result<AmountAndFee> {
        instructions::get_remove_liquidity_amount_and_fee(ctx, &params)
    }

    pub fn get_entry_price_and_fee<'info>(
        ctx: Context<'_, '_, '_, 'info, GetEntryPriceAndFee<'info>>,
        params: GetEntryPriceAndFeeParams,
    ) -> Result<NewPositionPricesAndFee> {
        instructions::get_entry_price_and_fee(ctx, &params)
    }

    pub fn get_exit_price_and_fee<'info>(
        ctx: Context<'_, '_, '_, 'info, GetExitPriceAndFee<'info>>,
        params: GetExitPriceAndFeeParams,
    ) -> Result<PriceAndFee> {
        instructions::get_exit_price_and_fee(ctx, &params)
    }

    pub fn get_pnl<'info>(
        ctx: Context<'_, '_, '_, 'info, GetPnl<'info>>,
        params: GetPnlParams,
    ) -> Result<ProfitAndLoss> {
        instructions::get_pnl(ctx, &params)
    }

    pub fn get_liquidation_price<'info>(
        ctx: Context<'_, '_, '_, 'info, GetLiquidationPrice<'info>>,
        params: GetLiquidationPriceParams,
    ) -> Result<u64> {
        instructions::get_liquidation_price(ctx, &params)
    }

    pub fn get_liquidation_state<'info>(
        ctx: Context<'_, '_, '_, 'info, GetLiquidationState<'info>>,
        params: GetLiquidationStateParams,
    ) -> Result<u8> {
        instructions::get_liquidation_state(ctx, &params)
    }

    pub fn get_oracle_price<'info>(
        ctx: Context<'_, '_, '_, 'info, GetOraclePrice<'info>>,
        params: GetOraclePriceParams,
    ) -> Result<u64> {
        instructions::get_oracle_price(ctx, &params)
    }

    pub fn get_assets_under_management<'info>(
        ctx: Context<'_, '_, 'info, 'info, GetAssetsUnderManagement<'info>>,
        params: GetAssetsUnderManagementParams,
    ) -> Result<u128> {
        instructions::get_assets_under_management(ctx, &params)
    }

    pub fn get_lp_token_price<'info>(
        ctx: Context<'_, '_, 'info, 'info, GetLpTokenPrice<'info>>,
        params: GetLpTokenPriceParams,
    ) -> Result<u64> {
        instructions::get_lp_token_price(ctx, &params)
    }

    // This instruction must be part of a larger transaction where the **first** instruction
    // is an ed25519 verification of the serialized oracle price update params.
    pub fn set_custom_oracle_price_permissionless<'info>(
        ctx: Context<'_, '_, '_, 'info, SetCustomOraclePricePermissionless<'info>>,
        params: SetCustomOraclePricePermissionlessParams,
    ) -> Result<()> {
        instructions::set_custom_oracle_price_permissionless(ctx, &params)
    }
}
