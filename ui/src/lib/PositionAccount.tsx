import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { CustodyAccount } from "@/lib/CustodyAccount";
import { TokenE } from "@/lib/Token";
import { Position, Side } from "@/lib/types";

export class PositionAccount {
  public owner: PublicKey;
  public pool: PublicKey;
  public custody: PublicKey;
  public collateralCustody: PublicKey;
  public collateralCustodyMint: PublicKey;
  public lockCustody: PublicKey;

  public openTime: BN;
  public updateTime: BN;

  public side: Side;
  public price: BN;
  public sizeUsd: BN;
  public collateralUsd: BN;
  public unrealizedProfitUsd: BN;
  public unrealizedLossUsd: BN;
  public cumulativeInterestSnapshot: BN;
  public lockedAmount: BN;
  public collateralAmount: BN;

  public token: TokenE;
  public collateralToken: TokenE;
  public address: PublicKey;
  public oracleAccount: PublicKey;
  public collateralCustodyOracleAccount: PublicKey;

  constructor(
    position: Position,
    address: PublicKey,
    custodies: Record<string, CustodyAccount>,
  ) {
    // console.log("printing entier new consturcture", position.openTime);
    this.owner = position.owner;
    this.pool = position.pool;
    this.custody = position.custody;
    this.collateralCustody = position.collateralCustody;
    this.lockCustody = position.lockCustody;

    this.collateralCustodyMint =
      custodies[this.collateralCustody.toString()]?.mint!;

    this.openTime = position.openTime;
    this.updateTime = position.updateTime;

    this.side = Side.Long;
    this.price = position.price;
    this.sizeUsd = position.sizeUsd;
    this.collateralUsd = position.collateralUsd;
    this.unrealizedProfitUsd = position.unrealizedProfitUsd;
    this.unrealizedLossUsd = position.unrealizedLossUsd;
    this.cumulativeInterestSnapshot = position.cumulativeInterestSnapshot;
    this.lockedAmount = position.lockedAmount;
    this.collateralAmount = position.collateralAmount;

    this.token = custodies[this.custody.toString()]?.getTokenE()!;
    this.collateralToken =
      custodies[this.collateralCustody.toString()]?.getTokenE()!;
    this.address = address;
    this.oracleAccount =
      custodies[this.custody.toString()]?.oracle.oracleAccount!;
    this.collateralCustodyOracleAccount =
      custodies[this.collateralCustody.toString()]?.oracle.oracleAccount!;
  }

  // TODO update leverage with pnl?
  getLeverage(): number {
    return this.sizeUsd.toNumber() / this.collateralUsd.toNumber();
  }

  // TODO fix getTimestamp to proper date
  getTimestamp(): string {
    const date = new Date(Number(this.openTime) * 1000);
    const dateString = date.toLocaleString();

    return dateString;
  }

  getCollateralUsd(): number {
    return Number(this.collateralUsd) / 10 ** 6;
  }

  getPrice(): number {
    return Number(this.price) / 10 ** 6;
  }

  getSizeUsd(): number {
    return Number(this.sizeUsd) / 10 ** 6;
  }

  getNetValue(pnl: number): number {
    // return this.getSizeUsd() - this.getCollateralUsd();
    return Number(this.getCollateralUsd()) + pnl;
  }
}
