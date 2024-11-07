/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/perpetuals.json`.
 */
export type Perpetuals = {
  "address": "GmU79uB4Z78rZEooejYtJWgQr28wWCoAcaf9Uc7cyWfw",
  "metadata": {
    "name": "perpetuals",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Solana Perpetuals Exchange",
    "repository": "https://github.com/solana-labs/perpetuals"
  },
  "instructions": [
    {
      "name": "addCollateral",
      "discriminator": [
        127,
        82,
        121,
        42,
        161,
        176,
        249,
        206
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addCollateralParams"
            }
          }
        }
      ]
    },
    {
      "name": "addCustody",
      "discriminator": [
        247,
        254,
        126,
        17,
        26,
        6,
        215,
        117
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "custodyTokenMint"
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "rent"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addCustodyParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "addCustodyInit",
      "discriminator": [
        147,
        67,
        217,
        189,
        19,
        190,
        190,
        24
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyTokenMint"
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "rent"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addCustodyParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "addLiquidity",
      "discriminator": [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "lpTokenAccount",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "lpTokenMint",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addLiquidityParams"
            }
          }
        }
      ]
    },
    {
      "name": "addPool",
      "discriminator": [
        115,
        230,
        212,
        211,
        175,
        49,
        39,
        169
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals",
          "writable": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "lpTokenMint",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "rent"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addPoolParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "closePosition",
      "discriminator": [
        123,
        134,
        81,
        0,
        49,
        68,
        98,
        98
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "closePositionParams"
            }
          }
        }
      ]
    },
    {
      "name": "forceClose",
      "discriminator": [
        71,
        1,
        6,
        64,
        15,
        200,
        254,
        234
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "forceCloseParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "getAddLiquidityAmountAndFee",
      "discriminator": [
        172,
        150,
        249,
        181,
        233,
        241,
        78,
        139
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "custody"
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "lpTokenMint"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getAddLiquidityAmountAndFeeParams"
            }
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "amountAndFee"
        }
      }
    },
    {
      "name": "getAssetsUnderManagement",
      "discriminator": [
        44,
        3,
        161,
        69,
        174,
        75,
        137,
        162
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getAssetsUnderManagementParams"
            }
          }
        }
      ],
      "returns": "u128"
    },
    {
      "name": "getEntryPriceAndFee",
      "discriminator": [
        134,
        30,
        231,
        199,
        83,
        72,
        27,
        99
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "custody"
        },
        {
          "name": "custodyOracleAccount"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getEntryPriceAndFeeParams"
            }
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "newPositionPricesAndFee"
        }
      }
    },
    {
      "name": "getExitPriceAndFee",
      "discriminator": [
        73,
        77,
        94,
        31,
        8,
        9,
        92,
        32
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "position"
        },
        {
          "name": "custody"
        },
        {
          "name": "custodyOracleAccount"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getExitPriceAndFeeParams"
            }
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "priceAndFee"
        }
      }
    },
    {
      "name": "getLiquidationPrice",
      "discriminator": [
        73,
        174,
        119,
        65,
        149,
        5,
        73,
        239
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "position"
        },
        {
          "name": "custody"
        },
        {
          "name": "custodyOracleAccount"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getLiquidationPriceParams"
            }
          }
        }
      ],
      "returns": "u64"
    },
    {
      "name": "getLiquidationState",
      "discriminator": [
        127,
        126,
        199,
        117,
        90,
        89,
        29,
        50
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "position"
        },
        {
          "name": "custody"
        },
        {
          "name": "custodyOracleAccount"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getLiquidationStateParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "getLpTokenPrice",
      "discriminator": [
        71,
        172,
        21,
        25,
        176,
        168,
        60,
        10
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "lpTokenMint"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getLpTokenPriceParams"
            }
          }
        }
      ],
      "returns": "u64"
    },
    {
      "name": "getOraclePrice",
      "discriminator": [
        200,
        20,
        0,
        106,
        56,
        210,
        230,
        140
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "custody"
        },
        {
          "name": "custodyOracleAccount"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getOraclePriceParams"
            }
          }
        }
      ],
      "returns": "u64"
    },
    {
      "name": "getPnl",
      "discriminator": [
        106,
        212,
        3,
        250,
        195,
        224,
        64,
        160
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "position"
        },
        {
          "name": "custody"
        },
        {
          "name": "custodyOracleAccount"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getPnlParams"
            }
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "profitAndLoss"
        }
      }
    },
    {
      "name": "getRemoveLiquidityAmountAndFee",
      "discriminator": [
        194,
        226,
        233,
        102,
        14,
        21,
        196,
        7
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "custody"
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "lpTokenMint"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "getRemoveLiquidityAmountAndFeeParams"
            }
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "amountAndFee"
        }
      }
    },
    {
      "name": "init",
      "discriminator": [
        220,
        59,
        207,
        236,
        108,
        250,
        47,
        100
      ],
      "accounts": [
        {
          "name": "upgradeAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "writable": true
        },
        {
          "name": "perpetuals",
          "writable": true
        },
        {
          "name": "perpetualsProgramData"
        },
        {
          "name": "perpetualsProgram"
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initParams"
            }
          }
        }
      ]
    },
    {
      "name": "liquidate",
      "discriminator": [
        223,
        179,
        226,
        125,
        48,
        46,
        39,
        74
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "rewardsReceivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "liquidateParams"
            }
          }
        }
      ]
    },
    {
      "name": "openPosition",
      "discriminator": [
        135,
        128,
        47,
        77,
        15,
        152,
        240,
        49
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "openPositionParams"
            }
          }
        }
      ]
    },
    {
      "name": "removeCollateral",
      "discriminator": [
        86,
        222,
        130,
        86,
        92,
        20,
        72,
        65
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removeCollateralParams"
            }
          }
        }
      ]
    },
    {
      "name": "removeCustody",
      "discriminator": [
        143,
        229,
        131,
        48,
        248,
        212,
        167,
        185
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "writable": true
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removeCustodyParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "removeLiquidity",
      "discriminator": [
        80,
        85,
        209,
        72,
        24,
        206,
        177,
        108
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "lpTokenAccount",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "lpTokenMint",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removeLiquidityParams"
            }
          }
        }
      ]
    },
    {
      "name": "removePool",
      "discriminator": [
        132,
        42,
        53,
        138,
        28,
        220,
        170,
        55
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "writable": true
        },
        {
          "name": "perpetuals",
          "writable": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removePoolParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "setAdminSigners",
      "discriminator": [
        240,
        171,
        141,
        105,
        124,
        2,
        225,
        188
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setAdminSignersParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "setCustodyConfig",
      "discriminator": [
        133,
        97,
        130,
        143,
        215,
        229,
        36,
        176
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setCustodyConfigParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "setCustomOraclePrice",
      "discriminator": [
        180,
        194,
        182,
        63,
        48,
        125,
        116,
        136
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "custody"
        },
        {
          "name": "oracleAccount",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setCustomOraclePriceParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "setCustomOraclePricePermissionless",
      "discriminator": [
        239,
        43,
        65,
        148,
        225,
        133,
        109,
        156
      ],
      "accounts": [
        {
          "name": "perpetuals"
        },
        {
          "name": "pool"
        },
        {
          "name": "custody"
        },
        {
          "name": "oracleAccount",
          "writable": true
        },
        {
          "name": "ixSysvar"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setCustomOraclePricePermissionlessParams"
            }
          }
        }
      ]
    },
    {
      "name": "setPermissions",
      "discriminator": [
        214,
        165,
        105,
        182,
        213,
        162,
        212,
        34
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "perpetuals",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setPermissionsParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "updatePoolAum",
      "discriminator": [
        10,
        125,
        230,
        234,
        157,
        184,
        236,
        241
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        }
      ],
      "args": [],
      "returns": "u128"
    },
    {
      "name": "withdrawFees",
      "discriminator": [
        198,
        212,
        171,
        109,
        144,
        215,
        174,
        89
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true
        },
        {
          "name": "custodyTokenAccount",
          "writable": true
        },
        {
          "name": "receivingTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "withdrawFeesParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "withdrawSolFees",
      "discriminator": [
        191,
        53,
        166,
        97,
        124,
        212,
        228,
        219
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true
        },
        {
          "name": "transferAuthority"
        },
        {
          "name": "perpetuals"
        },
        {
          "name": "receivingAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "withdrawSolFeesParams"
            }
          }
        }
      ],
      "returns": "u8"
    }
  ],
  "accounts": [
    {
      "name": "custody",
      "discriminator": [
        1,
        184,
        48,
        81,
        93,
        131,
        63,
        145
      ]
    },
    {
      "name": "customOracle",
      "discriminator": [
        227,
        170,
        164,
        218,
        127,
        16,
        35,
        223
      ]
    },
    {
      "name": "multisig",
      "discriminator": [
        224,
        116,
        121,
        186,
        68,
        161,
        79,
        236
      ]
    },
    {
      "name": "perpetuals",
      "discriminator": [
        28,
        167,
        98,
        191,
        104,
        82,
        108,
        196
      ]
    },
    {
      "name": "pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    }
  ],
  "events": [
    {
      "name": "openPosition",
      "discriminator": [
        217,
        229,
        234,
        190,
        68,
        176,
        142,
        115
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "multisigAccountNotAuthorized",
      "msg": "Account is not authorized to sign this instruction"
    },
    {
      "code": 6001,
      "name": "multisigAlreadySigned",
      "msg": "Account has already signed this instruction"
    },
    {
      "code": 6002,
      "name": "multisigAlreadyExecuted",
      "msg": "This instruction has already been executed"
    },
    {
      "code": 6003,
      "name": "mathOverflow",
      "msg": "Overflow in arithmetic operation"
    },
    {
      "code": 6004,
      "name": "unsupportedOracle",
      "msg": "Unsupported price oracle"
    },
    {
      "code": 6005,
      "name": "invalidOracleAccount",
      "msg": "Invalid oracle account"
    },
    {
      "code": 6006,
      "name": "invalidOracleState",
      "msg": "Invalid oracle state"
    },
    {
      "code": 6007,
      "name": "staleOraclePrice",
      "msg": "Stale oracle price"
    },
    {
      "code": 6008,
      "name": "invalidOraclePrice",
      "msg": "Invalid oracle price"
    },
    {
      "code": 6009,
      "name": "invalidEnvironment",
      "msg": "Instruction is not allowed in production"
    },
    {
      "code": 6010,
      "name": "invalidPoolState",
      "msg": "Invalid pool state"
    },
    {
      "code": 6011,
      "name": "invalidCustodyState",
      "msg": "Invalid custody state"
    },
    {
      "code": 6012,
      "name": "invalidPositionState",
      "msg": "Invalid position state"
    },
    {
      "code": 6013,
      "name": "invalidPerpetualsConfig",
      "msg": "Invalid perpetuals config"
    },
    {
      "code": 6014,
      "name": "invalidPoolConfig",
      "msg": "Invalid pool config"
    },
    {
      "code": 6015,
      "name": "invalidCustodyConfig",
      "msg": "Invalid custody config"
    },
    {
      "code": 6016,
      "name": "insufficientAmountReturned",
      "msg": "Insufficient token amount returned"
    },
    {
      "code": 6017,
      "name": "maxPriceSlippage",
      "msg": "Price slippage limit exceeded"
    },
    {
      "code": 6018,
      "name": "maxLeverage",
      "msg": "Position leverage limit exceeded"
    },
    {
      "code": 6019,
      "name": "custodyAmountLimit",
      "msg": "Custody amount limit exceeded"
    },
    {
      "code": 6020,
      "name": "positionAmountLimit",
      "msg": "Position amount limit exceeded"
    },
    {
      "code": 6021,
      "name": "unsupportedToken",
      "msg": "Token is not supported"
    },
    {
      "code": 6022,
      "name": "instructionNotAllowed",
      "msg": "Instruction is not allowed at this time"
    },
    {
      "code": 6023,
      "name": "maxUtilization",
      "msg": "Token utilization limit exceeded"
    },
    {
      "code": 6024,
      "name": "permissionlessOracleMissingSignature",
      "msg": "Permissionless oracle update must be preceded by Ed25519 signature verification instruction"
    },
    {
      "code": 6025,
      "name": "permissionlessOracleMalformedEd25519Data",
      "msg": "Ed25519 signature verification data does not match expected format"
    },
    {
      "code": 6026,
      "name": "permissionlessOracleSignerMismatch",
      "msg": "Ed25519 signature was not signed by the oracle authority"
    },
    {
      "code": 6027,
      "name": "permissionlessOracleMessageMismatch",
      "msg": "Signed message does not match instruction params"
    }
  ],
  "types": [
    {
      "name": "addCollateralParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collateral",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "addCustodyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oracle",
            "type": {
              "defined": {
                "name": "oracleParams"
              }
            }
          },
          {
            "name": "pricing",
            "type": {
              "defined": {
                "name": "pricingParams"
              }
            }
          },
          {
            "name": "permissions",
            "type": {
              "defined": {
                "name": "permissions"
              }
            }
          },
          {
            "name": "fees",
            "type": {
              "defined": {
                "name": "fees"
              }
            }
          },
          {
            "name": "borrowRate",
            "type": {
              "defined": {
                "name": "borrowRateParams"
              }
            }
          }
        ]
      }
    },
    {
      "name": "addLiquidityParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "minLpAmountOut",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "addPoolParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "amountAndFee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "assets",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collateral",
            "type": "u64"
          },
          {
            "name": "protocolFees",
            "type": "u64"
          },
          {
            "name": "owned",
            "type": "u64"
          },
          {
            "name": "locked",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "borrowRateParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseRate",
            "type": "u64"
          },
          {
            "name": "slope1",
            "type": "u64"
          },
          {
            "name": "slope2",
            "type": "u64"
          },
          {
            "name": "optimalUtilization",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "borrowRateState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "currentRate",
            "type": "u64"
          },
          {
            "name": "cumulativeInterest",
            "type": "u128"
          },
          {
            "name": "lastUpdate",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "closePositionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "custody",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "oracle",
            "type": {
              "defined": {
                "name": "oracleParams"
              }
            }
          },
          {
            "name": "pricing",
            "type": {
              "defined": {
                "name": "pricingParams"
              }
            }
          },
          {
            "name": "permissions",
            "type": {
              "defined": {
                "name": "permissions"
              }
            }
          },
          {
            "name": "fees",
            "type": {
              "defined": {
                "name": "fees"
              }
            }
          },
          {
            "name": "borrowRate",
            "type": {
              "defined": {
                "name": "borrowRateParams"
              }
            }
          },
          {
            "name": "assets",
            "type": {
              "defined": {
                "name": "assets"
              }
            }
          },
          {
            "name": "collectedFees",
            "type": {
              "defined": {
                "name": "feesStats"
              }
            }
          },
          {
            "name": "volumeStats",
            "type": {
              "defined": {
                "name": "volumeStats"
              }
            }
          },
          {
            "name": "tradeStats",
            "type": {
              "defined": {
                "name": "tradeStats"
              }
            }
          },
          {
            "name": "longPositions",
            "type": {
              "defined": {
                "name": "positionStats"
              }
            }
          },
          {
            "name": "borrowRateState",
            "type": {
              "defined": {
                "name": "borrowRateState"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "tokenAccountBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "customOracle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "expo",
            "type": "i32"
          },
          {
            "name": "conf",
            "type": "u64"
          },
          {
            "name": "ema",
            "type": "u64"
          },
          {
            "name": "publishTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "fees",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "utilizationMult",
            "type": "u64"
          },
          {
            "name": "addLiquidity",
            "type": "u64"
          },
          {
            "name": "removeLiquidity",
            "type": "u64"
          },
          {
            "name": "openPosition",
            "type": "u64"
          },
          {
            "name": "closePosition",
            "type": "u64"
          },
          {
            "name": "liquidation",
            "type": "u64"
          },
          {
            "name": "protocolShare",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "feesStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addLiquidityUsd",
            "type": "u64"
          },
          {
            "name": "removeLiquidityUsd",
            "type": "u64"
          },
          {
            "name": "openPositionUsd",
            "type": "u64"
          },
          {
            "name": "closePositionUsd",
            "type": "u64"
          },
          {
            "name": "liquidationUsd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "forceCloseParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "getAddLiquidityAmountAndFeeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountIn",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "getAssetsUnderManagementParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "getEntryPriceAndFeeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collateral",
            "type": "u64"
          },
          {
            "name": "size",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "getExitPriceAndFeeParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "getLiquidationPriceParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addCollateral",
            "type": "u64"
          },
          {
            "name": "removeCollateral",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "getLiquidationStateParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "getLpTokenPriceParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "getOraclePriceParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ema",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "getPnlParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "getRemoveLiquidityAmountAndFeeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lpAmountIn",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "initParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minSignatures",
            "type": "u8"
          },
          {
            "name": "allowAddLiquidity",
            "type": "bool"
          },
          {
            "name": "allowRemoveLiquidity",
            "type": "bool"
          },
          {
            "name": "allowOpenPosition",
            "type": "bool"
          },
          {
            "name": "allowClosePosition",
            "type": "bool"
          },
          {
            "name": "allowPnlWithdrawal",
            "type": "bool"
          },
          {
            "name": "allowCollateralWithdrawal",
            "type": "bool"
          },
          {
            "name": "allowSizeChange",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "liquidateParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "multisig",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "numSigners",
            "type": "u8"
          },
          {
            "name": "numSigned",
            "type": "u8"
          },
          {
            "name": "minSignatures",
            "type": "u8"
          },
          {
            "name": "instructionAccountsLen",
            "type": "u8"
          },
          {
            "name": "instructionDataLen",
            "type": "u16"
          },
          {
            "name": "instructionHash",
            "type": "u64"
          },
          {
            "name": "signers",
            "type": {
              "array": [
                "pubkey",
                6
              ]
            }
          },
          {
            "name": "signed",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "newPositionPricesAndFee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "liquidationPrice",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "openPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "borrowSizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "openPositionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "collateral",
            "type": "u64"
          },
          {
            "name": "size",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "oracleParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oracleAccount",
            "type": "pubkey"
          },
          {
            "name": "oracleType",
            "type": {
              "defined": {
                "name": "oracleType"
              }
            }
          },
          {
            "name": "oracleAuthority",
            "type": "pubkey"
          },
          {
            "name": "maxPriceError",
            "type": "u64"
          },
          {
            "name": "maxPriceAgeSec",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "oracleType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "none"
          },
          {
            "name": "custom"
          },
          {
            "name": "pyth"
          }
        ]
      }
    },
    {
      "name": "permissions",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "allowAddLiquidity",
            "type": "bool"
          },
          {
            "name": "allowRemoveLiquidity",
            "type": "bool"
          },
          {
            "name": "allowOpenPosition",
            "type": "bool"
          },
          {
            "name": "allowClosePosition",
            "type": "bool"
          },
          {
            "name": "allowPnlWithdrawal",
            "type": "bool"
          },
          {
            "name": "allowCollateralWithdrawal",
            "type": "bool"
          },
          {
            "name": "allowSizeChange",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "perpetuals",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "permissions",
            "type": {
              "defined": {
                "name": "permissions"
              }
            }
          },
          {
            "name": "pools",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "transferAuthorityBump",
            "type": "u8"
          },
          {
            "name": "perpetualsBump",
            "type": "u8"
          },
          {
            "name": "inceptionTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "custodies",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "aumUsd",
            "type": "u128"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "lpTokenBump",
            "type": "u8"
          },
          {
            "name": "inceptionTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "position",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "borrowSizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "unrealizedProfitUsd",
            "type": "u64"
          },
          {
            "name": "unrealizedLossUsd",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "positionStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "openPositions",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "borrowSizeUsd",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "weightedPrice",
            "type": "u128"
          },
          {
            "name": "totalQuantity",
            "type": "u128"
          },
          {
            "name": "cumulativeInterestUsd",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "priceAndFee",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pricingParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "useEma",
            "type": "bool"
          },
          {
            "name": "useUnrealizedPnlInAum",
            "type": "bool"
          },
          {
            "name": "tradeSpreadLong",
            "type": "u64"
          },
          {
            "name": "tradeSpreadShort",
            "type": "u64"
          },
          {
            "name": "minInitialLeverage",
            "type": "u64"
          },
          {
            "name": "maxInitialLeverage",
            "type": "u64"
          },
          {
            "name": "maxLeverage",
            "type": "u64"
          },
          {
            "name": "maxPayoffMult",
            "type": "u64"
          },
          {
            "name": "maxUtilization",
            "type": "u64"
          },
          {
            "name": "maxPositionLockedUsd",
            "type": "u64"
          },
          {
            "name": "maxTotalLockedUsd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "profitAndLoss",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profit",
            "type": "u64"
          },
          {
            "name": "loss",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "removeCollateralParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collateralUsd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "removeCustodyParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "removeLiquidityParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lpAmountIn",
            "type": "u64"
          },
          {
            "name": "minAmountOut",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "removePoolParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "setAdminSignersParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minSignatures",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "setCustodyConfigParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oracle",
            "type": {
              "defined": {
                "name": "oracleParams"
              }
            }
          },
          {
            "name": "pricing",
            "type": {
              "defined": {
                "name": "pricingParams"
              }
            }
          },
          {
            "name": "permissions",
            "type": {
              "defined": {
                "name": "permissions"
              }
            }
          },
          {
            "name": "fees",
            "type": {
              "defined": {
                "name": "fees"
              }
            }
          },
          {
            "name": "borrowRate",
            "type": {
              "defined": {
                "name": "borrowRateParams"
              }
            }
          }
        ]
      }
    },
    {
      "name": "setCustomOraclePriceParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "expo",
            "type": "i32"
          },
          {
            "name": "conf",
            "type": "u64"
          },
          {
            "name": "ema",
            "type": "u64"
          },
          {
            "name": "publishTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "setCustomOraclePricePermissionlessParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "custodyAccount",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "expo",
            "type": "i32"
          },
          {
            "name": "conf",
            "type": "u64"
          },
          {
            "name": "ema",
            "type": "u64"
          },
          {
            "name": "publishTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "setPermissionsParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "allowAddLiquidity",
            "type": "bool"
          },
          {
            "name": "allowRemoveLiquidity",
            "type": "bool"
          },
          {
            "name": "allowOpenPosition",
            "type": "bool"
          },
          {
            "name": "allowClosePosition",
            "type": "bool"
          },
          {
            "name": "allowPnlWithdrawal",
            "type": "bool"
          },
          {
            "name": "allowCollateralWithdrawal",
            "type": "bool"
          },
          {
            "name": "allowSizeChange",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tradeStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "profitUsd",
            "type": "u64"
          },
          {
            "name": "lossUsd",
            "type": "u64"
          },
          {
            "name": "oiLongUsd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "volumeStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "addLiquidityUsd",
            "type": "u64"
          },
          {
            "name": "removeLiquidityUsd",
            "type": "u64"
          },
          {
            "name": "openPositionUsd",
            "type": "u64"
          },
          {
            "name": "closePositionUsd",
            "type": "u64"
          },
          {
            "name": "liquidationUsd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "withdrawFeesParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "withdrawSolFeesParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
