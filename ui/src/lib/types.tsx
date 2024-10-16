import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { TokenE } from "@/lib/Token";

export interface Pool {
  name: string;
  custodies: PublicKey[];
  aumUsd: BN;
  bump: number;
  lpTokenBump: number;
  inceptionTime: BN;
}

export interface Custody {
  pool: PublicKey;
  mint: PublicKey;
  tokenAccount: PublicKey;
  decimals: number;
  oracle: OracleParams;
  pricing: PricingParams;
  permissions: Permissions;
  fees: Fees;
  borrowRate: BorrowRateParams;

  assets: Assets;
  collectedFees: Stats;
  volumeStats: Stats;
  tradeStats: TradeStats;
  longPositions: PositionStats;
  borrowRateState: BorrowRateState;

  bump: number;
  tokenAccountBump: number;
}

export interface BorrowRateParams {
  baseRate: BN;
  slope1: BN;
  slope2: BN;
  optimalUtilization: BN;
}

export interface BorrowRateState {
  currentRate: BN;
  cumulativeRate: BN;
  lastUpdate: BN;
}

export interface PositionStats {
  openPositions: BN;
  collateralUsd: BN;
  sizeUsd: BN;
  lockedAmount: BN;
  weightedLeverage: BN;
  totalLeverage: BN;
  cumulativeInterest: BN;
  cumulativeInterestSnapshot: BN;
}

export interface Assets {
  collateral: BN;
  protocolFees: BN;
  owned: BN;
  locked: BN;
}

export interface Stats {
  addLiquidityUsd: BN;
  removeLiquidityUsd: BN;
  openPositionUsd: BN;
  closePositionUsd: BN;
  liquidationUsd: BN;
}

export interface Fees {
  maxIncrease: BN;
  maxDecrease: BN;
  addLiquidity: BN;
  removeLiquidity: BN;
  openPosition: BN;
  closePosition: BN;
  liquidation: BN;
  protocolShare: BN;
}

export interface OracleParams {
  oracleAccount: PublicKey;
  oracleType: OracleType;
  maxPriceError: BN;
  maxPriceAgeSec: number;
}

export enum OracleType {
  None,
  Test,
  Pyth,
}

export interface Permissions {
  allowAddLiquidity: boolean;
  allowRemoveLiquidity: boolean;
  allowOpenPosition: boolean;
  allowClosePosition: boolean;
  allowPnlWithdrawal: boolean;
  allowCollateralWithdrawal: boolean;
  allowSizeChange: boolean;
}

export interface PricingParams {
  useEma: boolean;
  tradeSpreadLong: BN;
  tradeSpreadShort: BN;
  minInitialLeverage: BN;
  maxLeverage: BN;
  maxPayoffMult: BN;
}

export interface TradeStats {
  profitUsd: BN;
  lossUsd: BN;
  oiLongUsd: BN;
}

export enum Side {
  None = "None",
  Long = "Long",
  Short = "Short",
}

export enum Tab {
  Add,
  Remove,
}

export interface AccountMeta {
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
}

export class TradeSide {
  static Long = { long: {} };
  static Short = { short: {} };
}

export interface Position {
  owner: PublicKey;
  pool: PublicKey;
  custody: PublicKey;
  lockCustody: PublicKey;
  collateralCustody: PublicKey;

  openTime: BN;
  updateTime: BN;

  side: Side;
  price: BN;
  sizeUsd: BN;
  collateralUsd: BN;
  unrealizedProfitUsd: BN;
  unrealizedLossUsd: BN;
  cumulativeInterestSnapshot: BN;
  lockedAmount: BN;
  collateralAmount: BN;
}

export interface PriceStat {
  change24hr: number;
  currentPrice: number;
  high24hr: number;
  low24hr: number;
}
