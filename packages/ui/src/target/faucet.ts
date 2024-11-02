/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/faucet.json`.
 */
export type Faucet = {
  "address": "7TfpKdoDVa58JpZpMX3Tq8gYT9RcSr7XKqimYnGLrGQP",
  "metadata": {
    "name": "faucet",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "competitionClaim",
      "discriminator": [
        174,
        69,
        167,
        136,
        92,
        29,
        3,
        242
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintIn",
          "writable": true
        },
        {
          "name": "tokenAccountIn",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "competition"
        },
        {
          "name": "mintOut"
        },
        {
          "name": "tokenAccountOut",
          "writable": true
        },
        {
          "name": "tokenProgram"
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
              "name": "competitionClaimParams"
            }
          }
        }
      ]
    },
    {
      "name": "competitionEnd",
      "discriminator": [
        254,
        251,
        99,
        115,
        99,
        142,
        17,
        52
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "vault"
        },
        {
          "name": "competition",
          "writable": true
        },
        {
          "name": "tokenProgram"
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
              "name": "competitionEndParams"
            }
          }
        }
      ]
    },
    {
      "name": "competitionEnter",
      "discriminator": [
        73,
        206,
        144,
        92,
        200,
        255,
        246,
        160
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintIn",
          "writable": true
        },
        {
          "name": "tokenAccountIn",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "mintOut",
          "writable": true
        },
        {
          "name": "tokenAccountOut",
          "writable": true
        },
        {
          "name": "tokenProgram"
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
              "name": "competitionEnterParams"
            }
          }
        }
      ]
    },
    {
      "name": "mintCreate",
      "discriminator": [
        173,
        240,
        176,
        171,
        204,
        187,
        95,
        84
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "associatedTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram"
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
              "name": "mintCreateParams"
            }
          }
        }
      ]
    },
    {
      "name": "oracleAdd",
      "discriminator": [
        57,
        113,
        255,
        83,
        43,
        42,
        17,
        20
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "oracle",
          "writable": true
        },
        {
          "name": "priceUpdate"
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
              "name": "oracleAddParams"
            }
          }
        }
      ]
    },
    {
      "name": "swapBuy",
      "discriminator": [
        76,
        98,
        154,
        93,
        42,
        113,
        62,
        139
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "oracle"
        },
        {
          "name": "priceUpdate"
        },
        {
          "name": "mintIn",
          "writable": true
        },
        {
          "name": "tokenAccountIn",
          "writable": true
        },
        {
          "name": "mintOut",
          "writable": true
        },
        {
          "name": "tokenAccountOut",
          "writable": true
        },
        {
          "name": "tokenProgram"
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
              "name": "swapBuyParams"
            }
          }
        }
      ]
    },
    {
      "name": "swapSell",
      "discriminator": [
        176,
        40,
        55,
        165,
        110,
        62,
        84,
        97
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "oracle"
        },
        {
          "name": "priceUpdate"
        },
        {
          "name": "mintIn",
          "writable": true
        },
        {
          "name": "tokenAccountIn",
          "writable": true
        },
        {
          "name": "mintOut",
          "writable": true
        },
        {
          "name": "tokenAccountOut",
          "writable": true
        },
        {
          "name": "tokenProgram"
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
              "name": "swapSellParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "competition",
      "discriminator": [
        193,
        49,
        76,
        118,
        106,
        22,
        221,
        106
      ]
    },
    {
      "name": "oracle",
      "discriminator": [
        139,
        194,
        131,
        179,
        140,
        179,
        229,
        244
      ]
    },
    {
      "name": "priceUpdateV2",
      "discriminator": [
        34,
        241,
        35,
        99,
        157,
        126,
        244,
        205
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientFunds",
      "msg": "An account's balance was too small to complete the instruction"
    },
    {
      "code": 6001,
      "name": "invalidQuoteMint",
      "msg": "Invalid Quote Mint"
    },
    {
      "code": 6002,
      "name": "invalidPaymentMint",
      "msg": "Invalid Entry Amount"
    },
    {
      "code": 6003,
      "name": "invalidEntryAmount",
      "msg": "Invalid Payment Mint"
    },
    {
      "code": 6004,
      "name": "competitionNotEnded",
      "msg": "Competition has not ended yet"
    },
    {
      "code": 6005,
      "name": "alreadyClaimed",
      "msg": "Already claimed"
    }
  ],
  "types": [
    {
      "name": "competition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "total",
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
      "name": "competitionClaimParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "competitionEndParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "competitionEnterParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "mintCreateParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "canonical",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "oracle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feedId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "maxPriceAgeSec",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "oracleAddParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "canonical",
            "type": "pubkey"
          },
          {
            "name": "feedId",
            "type": "string"
          },
          {
            "name": "maxPriceAgeSec",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "priceFeedMessage",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feedId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "price",
            "type": "i64"
          },
          {
            "name": "conf",
            "type": "u64"
          },
          {
            "name": "exponent",
            "type": "i32"
          },
          {
            "name": "publishTime",
            "docs": [
              "The timestamp of this price update in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "prevPublishTime",
            "docs": [
              "The timestamp of the previous price update. This field is intended to allow users to",
              "identify the single unique price update for any moment in time:",
              "for any time t, the unique update is the one such that prev_publish_time < t <= publish_time.",
              "",
              "Note that there may not be such an update while we are migrating to the new message-sending logic,",
              "as some price updates on pythnet may not be sent to other chains (because the message-sending",
              "logic may not have triggered). We can solve this problem by making the message-sending mandatory",
              "(which we can do once publishers have migrated over).",
              "",
              "Additionally, this field may be equal to publish_time if the message is sent on a slot where",
              "where the aggregation was unsuccesful. This problem will go away once all publishers have",
              "migrated over to a recent version of pyth-agent."
            ],
            "type": "i64"
          },
          {
            "name": "emaPrice",
            "type": "i64"
          },
          {
            "name": "emaConf",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "priceUpdateV2",
      "docs": [
        "A price update account. This account is used by the Pyth Receiver program to store a verified price update from a Pyth price feed.",
        "It contains:",
        "- `write_authority`: The write authority for this account. This authority can close this account to reclaim rent or update the account to contain a different price update.",
        "- `verification_level`: The [`VerificationLevel`] of this price update. This represents how many Wormhole guardian signatures have been verified for this price update.",
        "- `price_message`: The actual price update.",
        "- `posted_slot`: The slot at which this price update was posted."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "writeAuthority",
            "type": "pubkey"
          },
          {
            "name": "verificationLevel",
            "type": {
              "defined": {
                "name": "verificationLevel"
              }
            }
          },
          {
            "name": "priceMessage",
            "type": {
              "defined": {
                "name": "priceFeedMessage"
              }
            }
          },
          {
            "name": "postedSlot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "swapBuyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountOut",
            "type": "u64"
          },
          {
            "name": "canonicalIn",
            "type": "pubkey"
          },
          {
            "name": "canonicalOut",
            "type": "pubkey"
          },
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "swapSellParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "canonicalIn",
            "type": "pubkey"
          },
          {
            "name": "canonicalOut",
            "type": "pubkey"
          },
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "verificationLevel",
      "docs": [
        "Pyth price updates are bridged to all blockchains via Wormhole.",
        "Using the price updates on another chain requires verifying the signatures of the Wormhole guardians.",
        "The usual process is to check the signatures for two thirds of the total number of guardians, but this can be cumbersome on Solana because of the transaction size limits,",
        "so we also allow for partial verification.",
        "",
        "This enum represents how much a price update has been verified:",
        "- If `Full`, we have verified the signatures for two thirds of the current guardians.",
        "- If `Partial`, only `num_signatures` guardian signatures have been checked.",
        "",
        "# Warning",
        "Using partially verified price updates is dangerous, as it lowers the threshold of guardians that need to collude to produce a malicious price update."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "partial",
            "fields": [
              {
                "name": "numSignatures",
                "type": "u8"
              }
            ]
          },
          {
            "name": "full"
          }
        ]
      }
    }
  ]
};
