// admin instructions
pub mod add_custody;
pub mod add_custody_init;
pub mod add_pool;
pub mod force_close;
pub mod init;
pub mod remove_custody;
pub mod remove_pool;
pub mod set_admin_signers;
pub mod set_custody_config;
pub mod set_custom_oracle_price;
pub mod set_permissions;
pub mod withdraw_fees;
pub mod withdraw_sol_fees;

// public instructions
pub mod add_collateral;
pub mod add_liquidity;
pub mod close_position;
pub mod get_add_liquidity_amount_and_fee;
pub mod get_assets_under_management;
pub mod get_entry_price_and_fee;
pub mod get_exit_price_and_fee;
pub mod get_liquidation_price;
pub mod get_liquidation_state;
pub mod get_lp_token_price;
pub mod get_oracle_price;
pub mod get_pnl;
pub mod get_remove_liquidity_amount_and_fee;
pub mod liquidate;
pub mod open_position;
pub mod remove_collateral;
pub mod remove_liquidity;
pub mod set_custom_oracle_price_permissionless;
pub mod update_pool_aum;

// bring everything in scope
pub use {
    add_collateral::*, add_custody::*, add_custody_init::*, add_liquidity::*, add_pool::*,
    close_position::*, force_close::*, get_add_liquidity_amount_and_fee::*,
    get_assets_under_management::*, get_entry_price_and_fee::*, get_exit_price_and_fee::*,
    get_liquidation_price::*, get_liquidation_state::*, get_lp_token_price::*, get_oracle_price::*,
    get_pnl::*, get_remove_liquidity_amount_and_fee::*, init::*, liquidate::*, open_position::*,
    remove_collateral::*, remove_custody::*, remove_liquidity::*, remove_pool::*,
    set_admin_signers::*, set_custody_config::*, set_custom_oracle_price::*,
    set_custom_oracle_price_permissionless::*, set_permissions::*, update_pool_aum::*,
    withdraw_fees::*, withdraw_sol_fees::*,
};
