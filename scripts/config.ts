import { BN } from "@coral-xyz/anchor";
import { getPriceFeedAccountForProgram } from "@pythnetwork/pyth-solana-receiver";
import { PublicKey } from "@solana/web3.js";

import {
  BorrowRateParams,
  Fees,
  OracleParams,
  Permissions,
  PricingParams,
} from "../packages/cli/src/types.js";
import { universe } from "../packages/ui/src/lib/universe.js";

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  extensions: {
    coingeckoId: string;
    feedId: string;
  };
}
const tokens = universe.reduce(
  (acc, curr) => {
    acc[curr.symbol] = curr;
    return acc;
  },
  {} as Record<string, Token>,
);
export const tradeableTokens = Object.values(tokens)
  .filter((x) => !x.symbol.startsWith("US"))
  .sort((a, b) => a.symbol.localeCompare(b.symbol));

interface CustodyParams {
  oracle: OracleParams;
  pricing: PricingParams;
  permissions: Permissions;
  fees: Fees;
  borrowRate: BorrowRateParams;
}
export const getCustodyParam = (symbol: string): CustodyParams => {
  const token = tokens[symbol];
  const oracleAccount = getPriceFeedAccountForProgram(
    0,
    token.extensions.feedId,
  );

  // Where sponsored feeds commit to 0.02% deviation, we can offer higher leverage
  const maxInitialLeverage = ["SOL", "BTC", "WBTC", "JITOSOL", "BONK"].includes(
    symbol.toUpperCase(),
  )
    ? 10_000_000 // 1_000x
    : 1_000_000; // 100x

  const MAX_U64 = "18446744073709551615";
  return {
    oracle: {
      maxPriceError: new BN(2_000), // 20%
      maxPriceAgeSec: 130, // 130 seconds - Choosen by looking at devnet oracles
      oracleAccount,
      oracleType: { ["pyth"]: {} }, // None, custom, pyth
      oracleAuthority: PublicKey.default, // By default, permissionless oracle price update is not allowed. Pubkey allowed to sign permissionless off-chain price updates
    },
    // Figures are in BPS
    pricing: {
      useUnrealizedPnlInAum: true,
      tradeSpreadLong: new BN(0), // 0%
      tradeSpreadShort: new BN(0), // 0%
      minInitialLeverage: new BN(11_000), // 1.1
      maxInitialLeverage: new BN(maxInitialLeverage),
      maxLeverage: new BN(maxInitialLeverage * 2),
      maxPayoffMult: new BN(10_000), // 100%
      maxUtilization: new BN(9_000), // 90%
      maxPositionLockedUsd: new BN(1_000_000 * 10 ** 9), // 1M USD
      maxTotalLockedUsd: new BN(MAX_U64), // Cannot be "0" when max position locked is set
    },
    permissions: {
      allowAddLiquidity: true,
      allowRemoveLiquidity: true,
      allowOpenPosition: true,
      allowClosePosition: true,
      allowPnlWithdrawal: true,
      allowCollateralWithdrawal: true,
      allowSizeChange: true,
    },
    fees: {
      utilizationMult: new BN(10000), // 100%
      addLiquidity: new BN(0), // 0%
      removeLiquidity: new BN(20), // 0.2%
      openPosition: new BN(0), // 0%
      closePosition: new BN(0), // Not in use
      liquidation: new BN(0), // 0%
      protocolShare: new BN(2_000), // 20%
    },
    borrowRate: {
      baseRate: new BN(0),
      slope1: new BN(0), // 0.008%
      slope2: new BN(0),
      optimalUtilization: new BN(800_000_000), // 80%
    },
  };
};
