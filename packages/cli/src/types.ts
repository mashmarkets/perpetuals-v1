import { IdlAccounts, IdlTypes, MethodsNamespace } from "@coral-xyz/anchor";

import { Perpetuals } from "./target/perpetuals.js";

export type Methods = MethodsNamespace<Perpetuals>;
export type Accounts = IdlAccounts<Perpetuals>;
export type Types = IdlTypes<Perpetuals>;

export type InitParams = Types["InitParams"];

export type OracleParams = Types["OracleParams"];
export type PricingParams = Types["PricingParams"];
export type Permissions = Types["Permissions"];
export type Fees = Types["Fees"];
export type BorrowRateParams = Types["BorrowRateParams"];
export type SetCustomOraclePriceParams = Types["SetCustomOraclePriceParams"];
export type AmountAndFee = Types["AmountAndFee"];
export type NewPositionPricesAndFee = Types["NewPositionPricesAndFee"];
export type PriceAndFee = Types["PriceAndFee"];
export type ProfitAndLoss = Types["ProfitAndLoss"];

export type Custody = Accounts["custody"];
export type Pool = Accounts["pool"];
export type Position = Accounts["position"];
export type PerpetualsAccount = Accounts["perpetuals"];
