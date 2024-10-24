use {
    crate::{instructions, utils},
    maplit::hashmap,
    perpetuals::{
        instructions::{AddLiquidityParams, RemoveLiquidityParams},
        state::{custody::Custody, perpetuals::Perpetuals, pool::Pool},
    },
};

const USDC_DECIMALS: u8 = 6;
const USD_DECIMALS: u8 = 9;

pub async fn fixed_fees() {
    let test_setup = utils::TestSetup::new(
        vec![utils::UserParam {
            name: "alice",
            token_balances: hashmap! {
                "usdc" => utils::scale(100_000, USDC_DECIMALS),
            },
        }],
        vec![utils::MintParam {
            name: "usdc",
            decimals: USDC_DECIMALS,
        }],
        vec!["admin_a", "admin_b", "admin_c"],
        "main_pool",
        vec![utils::SetupCustodyWithLiquidityParams {
            setup_custody_params: utils::SetupCustodyParams {
                mint_name: "usdc",
                initial_price: utils::scale(1, USDC_DECIMALS),
                initial_conf: utils::scale_f64(0.01, USDC_DECIMALS),
                pricing_params: None,
                permissions: None,
                fees: None,
                borrow_rate: None,
            },
            liquidity_amount: utils::scale(0, USDC_DECIMALS),
            payer_user_name: "alice",
        }],
    )
    .await;

    let alice = test_setup.get_user_keypair_by_name("alice");
    let usdc_mint = &test_setup.get_mint_by_name("usdc");

    // Check add liquidity fee
    {
        instructions::test_add_liquidity(
            &test_setup.program_test_ctx,
            alice,
            &test_setup.payer_keypair,
            &test_setup.pool_pda,
            usdc_mint,
            AddLiquidityParams {
                amount_in: utils::scale(1_000, USDC_DECIMALS),
                min_lp_amount_out: 1,
            },
        )
        .await
        .unwrap();

        {
            let pool_account =
                utils::get_account::<Pool>(&test_setup.program_test_ctx, test_setup.pool_pda).await;
            let custody_account = utils::get_account::<Custody>(
                &test_setup.program_test_ctx,
                test_setup.custodies_info[0].custody_pda,
            )
            .await;

            assert_eq!(
                pool_account.aum_usd,
                utils::scale_f64(999.95, USD_DECIMALS).into(),
            );

            assert_eq!(
                custody_account.collected_fees.add_liquidity_usd,
                utils::scale(20, USD_DECIMALS),
            );

            assert_eq!(
                custody_account.assets.protocol_fees,
                utils::scale_f64(0.05, USDC_DECIMALS),
            );
        }
    }

    // Check remove liquidity fee
    {
        instructions::test_remove_liquidity(
            &test_setup.program_test_ctx,
            alice,
            &test_setup.payer_keypair,
            &test_setup.pool_pda,
            usdc_mint,
            RemoveLiquidityParams {
                lp_amount_in: utils::scale(100, Perpetuals::LP_DECIMALS),
                min_amount_out: 1,
            },
        )
        .await
        .unwrap();

        {
            let pool_account =
                utils::get_account::<Pool>(&test_setup.program_test_ctx, test_setup.pool_pda).await;
            let custody_account = utils::get_account::<Custody>(
                &test_setup.program_test_ctx,
                test_setup.custodies_info[0].custody_pda,
            )
            .await;

            assert_eq!(
                pool_account.aum_usd,
                utils::scale_f64(900.967705, USD_DECIMALS).into(),
            );

            assert_eq!(
                custody_account.collected_fees.remove_liquidity_usd,
                utils::scale_f64(3.061072, USD_DECIMALS),
            );

            assert_eq!(
                custody_account.assets.protocol_fees,
                utils::scale_f64(0.057653, USDC_DECIMALS),
            );
        }
    }
}
