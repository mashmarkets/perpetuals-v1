import { PublicKey } from "@solana/web3.js";

import { tokenAddressToToken, TokenE } from "./Token";
import {
  Assets,
  BorrowRateParams,
  BorrowRateState,
  Custody,
  Fees,
  OracleParams,
  Permissions,
  PositionStats,
  PricingParams,
  Stats,
  TradeStats,
} from "./types";

export class CustodyAccount {
  public pool: PublicKey;
  public mint: PublicKey;
  public tokenAccount: PublicKey;
  public decimals: number;
  public isStable: boolean;
  public oracle: OracleParams;
  public pricing: PricingParams;
  public permissions: Permissions;
  public fees: Fees;
  public borrowRate: BorrowRateParams;

  // dynamic variable;
  public assets: Assets;
  public collectedFees: Stats;
  public volumeStats: Stats;
  public tradeStats: TradeStats;
  public longPositions: PositionStats;
  public borrowRateState: BorrowRateState;

  // bumps for address validatio;
  public bump: number;
  public tokenAccountBump: number;

  public address: PublicKey;

  constructor(custody: Custody, address: PublicKey) {
    this.pool = custody.pool;
    this.mint = custody.mint;
    this.tokenAccount = custody.tokenAccount;
    this.decimals = custody.decimals;
    this.isStable = custody.isStable;
    this.oracle = custody.oracle;
    this.pricing = custody.pricing;
    this.permissions = custody.permissions;
    this.fees = custody.fees;
    this.borrowRate = custody.borrowRate;

    console.log("custody assets", custody.assets);
    this.assets = custody.assets;
    this.collectedFees = custody.collectedFees;
    this.volumeStats = custody.volumeStats;
    this.tradeStats = custody.tradeStats;
    this.longPositions = custody.longPositions;
    this.borrowRateState = custody.borrowRateState;

    this.bump = custody.bump;
    this.tokenAccountBump = custody.tokenAccountBump;

    this.address = address;
  }

  getTokenE(): TokenE {
    return tokenAddressToToken(this.mint.toString())!;
  }

  getCustodyLiquidity(price: number | undefined): number {
    if (price === undefined) {
      return 0;
    }
    return (
      (price * Number(this.assets.owned.sub(this.assets.locked))) /
      10 ** this.decimals
    );
  }

  getAmount(): number {
    return Number(this.assets.owned) / 10 ** this.decimals;
  }

  getAddFee(): number {
    return Number(this.fees.addLiquidity) / 100;
  }
  getUtilizationRate(): number {
    return Number(this.assets.owned) != 0
      ? 100 * Number(this.assets.locked.div(this.assets.owned))
      : 0;
  }
}
