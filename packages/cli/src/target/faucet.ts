export type Faucet = {
  "metadata": {
    "address": "AVyirMo5eEE9KMmpfD8B5otX1MBcPbQdfrBAnxBjTMJQ"
  },
  "version": "0.1.0",
  "name": "faucet",
  "instructions": [
    {
      "name": "mintCreate",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "associatedTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "MintCreateParams"
          }
        }
      ]
    },
    {
      "name": "oracleAdd",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "oracle",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "priceUpdate",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "OracleAddParams"
          }
        }
      ]
    },
    {
      "name": "swapBuy",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "oracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "priceUpdate",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SwapBuyParams"
          }
        }
      ]
    },
    {
      "name": "swapSell",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "oracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "priceUpdate",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SwapSellParams"
          }
        }
      ]
    }
  ],
  "accounts": [
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
    }
  ],
  "types": [
    {
      "name": "MintCreateParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "canonical",
            "type": "publicKey"
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
      "name": "OracleAddParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "canonical",
            "type": "publicKey"
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
      "name": "SwapBuyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountOut",
            "type": "u64"
          },
          {
            "name": "canonicalIn",
            "type": "publicKey"
          },
          {
            "name": "canonicalOut",
            "type": "publicKey"
          },
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "SwapSellParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "canonicalIn",
            "type": "publicKey"
          },
          {
            "name": "canonicalOut",
            "type": "publicKey"
          },
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InsufficientFunds",
      "msg": "An account's balance was too small to complete the instruction"
    },
    {
      "code": 6001,
      "name": "InvalidQuoteMint",
      "msg": "Invalid Quote Mint"
    }
  ]
};

export const IDL: Faucet = {
  "metadata": {
    "address": "AVyirMo5eEE9KMmpfD8B5otX1MBcPbQdfrBAnxBjTMJQ"
  },
  "version": "0.1.0",
  "name": "faucet",
  "instructions": [
    {
      "name": "mintCreate",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "associatedTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "MintCreateParams"
          }
        }
      ]
    },
    {
      "name": "oracleAdd",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "oracle",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "priceUpdate",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "OracleAddParams"
          }
        }
      ]
    },
    {
      "name": "swapBuy",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "oracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "priceUpdate",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SwapBuyParams"
          }
        }
      ]
    },
    {
      "name": "swapSell",
      "accounts": [
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "oracle",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "priceUpdate",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "mintIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountIn",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mintOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenAccountOut",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": "SwapSellParams"
          }
        }
      ]
    }
  ],
  "accounts": [
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
    }
  ],
  "types": [
    {
      "name": "MintCreateParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "canonical",
            "type": "publicKey"
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
      "name": "OracleAddParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "canonical",
            "type": "publicKey"
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
      "name": "SwapBuyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountOut",
            "type": "u64"
          },
          {
            "name": "canonicalIn",
            "type": "publicKey"
          },
          {
            "name": "canonicalOut",
            "type": "publicKey"
          },
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "SwapSellParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "canonicalIn",
            "type": "publicKey"
          },
          {
            "name": "canonicalOut",
            "type": "publicKey"
          },
          {
            "name": "epoch",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InsufficientFunds",
      "msg": "An account's balance was too small to complete the instruction"
    },
    {
      "code": 6001,
      "name": "InvalidQuoteMint",
      "msg": "Invalid Quote Mint"
    }
  ]
};
