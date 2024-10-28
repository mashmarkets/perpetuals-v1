export const MAX_U64 = BigInt("18446744073709551615");

export const BPS_DECIMALS = 4;
export const BPS_POWER = 10 ** BPS_DECIMALS;

export const PRICE_DECIMALS = 9;
export const PRICE_POWER = 10 ** PRICE_DECIMALS;

export const RATE_DECIMALS = 9;
export const RATE_POWER = 10 ** RATE_DECIMALS;

export const USD_DECIMALS = 9;
export const USD_POWER = 10 ** USD_DECIMALS;

export const LP_DECIMALS = USD_DECIMALS;
export const LP_POWER = 10 ** LP_DECIMALS;

export enum Side {
  Long = "Long",
  Short = "Short",
}
