import { zodResolver } from "@hookform/resolvers/zod";
import { address, Address } from "@solana/addresses";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAllPools } from "@/hooks/perpetuals";
import {
  getTokenInfo,
  getTokensKeyedBy,
  getTokenSymbol,
  TRADEABLE_MINTS,
} from "@/lib/Token";
import { BPS_DECIMALS, RATE_DECIMALS, USD_DECIMALS } from "@/lib/types";
import { parseUnits } from "@/utils/viem";

const transformToBigInt = (decimals: number) => (x: string) =>
  parseUnits(x, decimals);

const transformToAddress = (x: string, ctx: z.RefinementCtx) => {
  try {
    return address(x);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Not a valid address",
    });
    return z.NEVER;
  }
};

const addCustodySchema = z.object({
  poolName: z.string(),
  tokenMint: z.string().transform(transformToAddress),
  oracle: z.object({
    oracleType: z.enum(["pyth", "custom"]),
    oracleAccount: z.string().transform(transformToAddress),
    oracleAuthority: z.string().transform(transformToAddress),
    maxPriceAgeSec: z.string().transform((x) => parseInt(x)),
    maxPriceError: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
  }),
  pricing: z.object({
    useEma: z.boolean(),
    useUnrealizedPnlInAum: z.boolean(),
    tradeSpreadLong: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    tradeSpreadShort: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    minInitialLeverage: z.string().transform(transformToBigInt(BPS_DECIMALS)),
    maxInitialLeverage: z.string().transform(transformToBigInt(BPS_DECIMALS)),
    maxLeverage: z.string().transform(transformToBigInt(BPS_DECIMALS)),
    maxPayoffMult: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    maxUtilization: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    maxPositionLockedUsd: z.string().transform(transformToBigInt(USD_DECIMALS)),
    maxTotalLockedUsd: z.string().transform(transformToBigInt(USD_DECIMALS)),
  }),
  permissions: z.object({
    allowAddLiquidity: z.boolean(),
    allowRemoveLiquidity: z.boolean(),
    allowOpenPosition: z.boolean(),
    allowClosePosition: z.boolean(),
    allowPnlWithdrawal: z.boolean(),
    allowCollateralWithdrawal: z.boolean(),
    allowSizeChange: z.boolean(),
  }),
  fees: z.object({
    utilizationMult: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    addLiquidity: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    removeLiquidity: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    openPosition: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    closePosition: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    liquidation: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
    protocolShare: z.string().transform(transformToBigInt(BPS_DECIMALS - 2)),
  }),
  borrowRate: z.object({
    baseRate: z.string().transform(transformToBigInt(RATE_DECIMALS - 2)),
    slope1: z.string().transform(transformToBigInt(RATE_DECIMALS - 2)),
    slope2: z.string().transform(transformToBigInt(RATE_DECIMALS - 2)),
    optimalUtilization: z
      .string()
      .transform(transformToBigInt(RATE_DECIMALS - 2)),
  }),
});

export type AddCustodyParams = z.infer<typeof addCustodySchema>;
// This is input type values (i.e. before transformation)
type AddCustodyState = z.input<typeof addCustodySchema>;

const AddCustodyForm = ({
  custodies,
  poolName,
  onSubmit,
}: {
  poolName: string;
  custodies: { mint: Address }[];
  onSubmit: (x: AddCustodyParams) => void;
}) => {
  const pools = useAllPools();
  const defaultValues: AddCustodyState = {
    poolName: poolName,
    tokenMint: "",
    oracle: {
      oracleAccount: "",
      oracleType: "pyth",
      maxPriceError: "100.00" as string,
      maxPriceAgeSec: "600",
      oracleAuthority: "11111111111111111111111111111111",
    },
    pricing: {
      useEma: false,
      useUnrealizedPnlInAum: true,
      tradeSpreadLong: "0.10",
      tradeSpreadShort: "0.10",
      minInitialLeverage: "1.1000",
      maxInitialLeverage: "100.0000",
      maxLeverage: "500.0000",
      maxPayoffMult: "100.00",
      maxUtilization: "100.00",
      maxPositionLockedUsd: "0",
      maxTotalLockedUsd: "0",
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
      utilizationMult: "200.00",
      addLiquidity: "0.00",
      removeLiquidity: "0.50",
      openPosition: "0.00",
      closePosition: "0.00",
      liquidation: "1.00",
      protocolShare: "0.10",
    },
    borrowRate: {
      baseRate: "0.0050000",
      slope1: "0.0080000",
      slope2: "0.0120000",
      optimalUtilization: "80.0000000",
    },
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isValid, errors },
  } =
    // Different input outputs due to zod transform https://github.com/react-hook-form/documentation/issues/1078
    useForm<AddCustodyState, unknown, AddCustodyParams>({
      defaultValues,
      mode: "onChange",
      resolver: zodResolver(addCustodySchema),
    });

  const oracleType = watch("oracle.oracleType");
  const list = TRADEABLE_MINTS.map(getTokenInfo);
  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="tokenSelect" className="text-white">
            Prefill Token:
          </label>
          <select
            id="tokenSelect"
            value=""
            onChange={(e) => {
              e.preventDefault();
              const token = getTokenInfo(e.target.value as Address);
              setValue("tokenMint", token.address, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("oracle.oracleAccount", token.extensions.oracle, {
                shouldTouch: true,
                shouldValidate: true,
              });
              const symbol = getTokenSymbol(token.address);
              // If no current pool is using this symbol as name, use it as "canonical" name
              if (!Object.values(pools ?? {}).find((x) => x.name === symbol)) {
                setValue("poolName", symbol, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
            className="w-full rounded border p-2"
          >
            <option value="">Prefill For</option>
            {list
              .sort((a, b) => a.symbol.localeCompare(b.symbol))
              .map((value) => {
                if (
                  custodies
                    .map((x) => x.mint.toString())
                    .includes(value.address)
                )
                  return null;
                return (
                  <option key={value.address} value={value.address}>
                    {value.symbol} ({value.address})
                  </option>
                );
              })}
          </select>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="poolName" className="text-white">
            Unique Pool Name:
          </label>
          <div>
            <input
              id="poolName"
              type="text"
              {...register("poolName")}
              className="w-full rounded border p-2"
              required
            />
            {errors.poolName && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.poolName.message as string}
              </p>
            )}
          </div>
        </div>
        {/* Basic Info */}
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="tokenMint" className="text-white">
            Token Mint:
          </label>
          <div>
            <input
              id="tokenMint"
              type="text"
              {...register("tokenMint")}
              className="w-full rounded border p-2"
              required
            />
            {errors.tokenMint && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.tokenMint.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="tokenOracle" className="text-white">
            Token Oracle:
          </label>
          <div>
            <input
              id="tokenOracle"
              type="text"
              {...register("oracle.oracleAccount")}
              className="w-full rounded border p-2"
              required
            />
            {errors.oracle?.oracleAccount && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.oracle.oracleAccount.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Oracle Config */}
        <h2 className="mb-4 mt-6 text-xl font-semibold text-white">
          Oracle Configuration
        </h2>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="maxPriceError" className="text-white">
            Max Price Error (%):
          </label>
          <div>
            <input
              id="maxPriceError"
              type="number"
              {...register("oracle.maxPriceError")}
              className="w-full rounded border p-2"
              required
              step="0.01"
              min="0"
            />
            {errors.oracle?.maxPriceError && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.oracle.maxPriceError.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="maxPriceAgeSec" className="text-white">
            Max Price Age (seconds):
          </label>
          <div>
            <input
              id="maxPriceAgeSec"
              type="number"
              min="0"
              {...register("oracle.maxPriceAgeSec")}
              className="w-full rounded border p-2"
              required
            />
            {errors.oracle?.maxPriceAgeSec && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.oracle.maxPriceAgeSec.message as string}
              </p>
            )}
          </div>
        </div>
        {oracleType === "custom" && (
          <div>
            <label htmlFor="oracleAuthority" className="mb-1 block text-white">
              Oracle Authority:
            </label>
            <input
              id="oracleAuthority"
              type="text"
              {...register("oracle.oracleAuthority")}
              className="w-full rounded border p-2"
              required
            />
          </div>
        )}

        {/* Pricing Config */}
        <h2 className="mb-4 mt-6 text-xl font-semibold text-white">
          Pricing Configuration
        </h2>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label className="text-white">Options:</label>
          <div className="space-y-2">
            <label className="flex items-center text-white">
              <input
                type="checkbox"
                {...register("pricing.useEma")}
                className="mr-2"
              />
              Use EMA
            </label>
            <label className="flex items-center text-white">
              <input
                type="checkbox"
                {...register("pricing.useUnrealizedPnlInAum")}
                className="mr-2"
              />
              Use Unrealized PnL in AUM
            </label>
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="tradeSpreadLong" className="text-white">
            Trade Spread Open (%):
          </label>
          <div>
            <input
              id="tradeSpreadLong"
              type="number"
              min="0"
              {...register("pricing.tradeSpreadLong")}
              className="w-full rounded border p-2"
              required
              step="0.01"
            />
            {errors.pricing?.tradeSpreadLong && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.tradeSpreadLong.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="tradeSpreadShort" className="text-white">
            Trade Spread Close (%):
          </label>
          <div>
            <input
              id="tradeSpreadShort"
              type="number"
              {...register("pricing.tradeSpreadShort")}
              className="w-full rounded border p-2"
              required
              step="0.01"
              min="0"
            />
            {errors.pricing?.tradeSpreadShort && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.tradeSpreadShort.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="minInitialLeverage" className="text-white">
            Min Initial Leverage (x):
          </label>
          <div>
            <input
              id="minInitialLeverage"
              type="number"
              {...register("pricing.minInitialLeverage")}
              className="w-full rounded border p-2"
              required
              step="0.0001"
              min="0"
            />
            {errors.pricing?.minInitialLeverage && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.minInitialLeverage.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="maxInitialLeverage" className="text-white">
            Max Initial Leverage (x):
          </label>
          <div>
            <input
              id="maxInitialLeverage"
              type="number"
              {...register("pricing.maxInitialLeverage")}
              className="w-full rounded border p-2"
              required
              step="0.0001"
              min="0"
            />
            {errors.pricing?.maxInitialLeverage && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.maxInitialLeverage.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="maxLeverage" className="text-white">
            Max Leverage (x):
          </label>
          <div>
            <input
              id="maxLeverage"
              type="number"
              {...register("pricing.maxLeverage")}
              className="w-full rounded border p-2"
              required
              step="0.0001"
              min="0"
            />
            {errors.pricing?.maxLeverage && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.maxLeverage.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="maxPayoffMult" className="text-white">
            Max Payoff Mult (%):
          </label>
          <div>
            <input
              id="maxPayoffMult"
              type="number"
              {...register("pricing.maxPayoffMult")}
              className="w-full rounded border p-2"
              required
              step="0.01"
              min="0"
            />
            {errors.pricing?.maxPayoffMult && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.maxPayoffMult.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="maxUtilization" className="text-white">
            Max Utilization (%):
          </label>
          <div>
            <input
              id="maxUtilization"
              type="number"
              {...register("pricing.maxUtilization")}
              className="w-full rounded border p-2"
              required
              step="0.01"
              min="0"
            />
            {errors.pricing?.maxUtilization && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.maxUtilization.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="maxPositionLockedUsd" className="text-white">
            Max Position Locked (USD):
          </label>
          <div>
            <input
              id="maxPositionLockedUsd"
              type="number"
              {...register("pricing.maxPositionLockedUsd")}
              className="w-full rounded border p-2"
              required
              step="0.000001"
              min="0"
            />
            {errors.pricing?.maxPositionLockedUsd && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.maxPositionLockedUsd.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4">
          <label htmlFor="maxTotalLockedUsd" className="text-white">
            Max Total Locked (USD):
          </label>
          <div>
            <input
              id="maxTotalLockedUsd"
              type="number"
              {...register("pricing.maxTotalLockedUsd")}
              className="w-full rounded border p-2"
              required
              step="0.000001"
              min="0"
            />
            {errors.pricing?.maxTotalLockedUsd && (
              <p className="col-start-2 mt-1 text-sm text-red-500">
                {errors.pricing.maxTotalLockedUsd.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Permissions */}
        <h2 className="mb-4 mt-6 text-xl font-semibold text-white">
          Permissions
        </h2>
        <div className="form-row">
          <label className="text-white">Options:</label>
          <div className="space-y-2">
            {Object.keys(defaultValues.permissions).map((key) => {
              if (["allowPnlWithdrawal", "allowSizeChange"].includes(key)) {
                return null;
              }
              return (
                <label key={key} className="flex items-center text-white">
                  <input
                    type="checkbox"
                    {...register(
                      `permissions.${key as keyof typeof defaultValues.permissions}`,
                    )}
                    className="mr-2"
                  />
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())}
                </label>
              );
            })}
          </div>
        </div>

        {/* Fees */}
        <h2 className="mb-4 mt-6 text-xl font-semibold text-white">Fees</h2>
        {Object.keys(defaultValues.fees).map((key) => {
          if (["addLiquidity", "protocolShare"].includes(key)) {
            return null;
          }
          return (
            <div
              key={key}
              className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4"
            >
              <label htmlFor={key} className="text-white">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}{" "}
                (%):
              </label>
              <div>
                <input
                  id={key}
                  type="number"
                  {...register(
                    `fees.${key as keyof typeof defaultValues.fees}`,
                  )}
                  className="w-full rounded border p-2"
                  required
                  step="0.01"
                  min="0"
                />
                {errors.fees?.[key as keyof typeof defaultValues.fees] && (
                  <p className="col-start-2 mt-1 text-sm text-red-500">
                    {
                      errors.fees[key as keyof typeof defaultValues.fees]
                        ?.message as string
                    }
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Borrow Rate */}
        <h2 className="mb-4 mt-6 text-xl font-semibold text-white">
          Borrow Rate
        </h2>
        {Object.keys(defaultValues.borrowRate).map((key) => (
          <div
            key={key}
            className="mb-2 grid grid-cols-[200px_1fr] items-center gap-4"
          >
            <label htmlFor={key} className="text-white">
              {key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}{" "}
              (%):
            </label>
            <div>
              <input
                id={key}
                type="number"
                {...register(
                  `borrowRate.${key as keyof typeof defaultValues.borrowRate}`,
                )}
                className="w-full rounded border p-2"
                required
                step="0.0000001"
                min="0"
              />
              {errors.borrowRate?.[
                key as keyof typeof defaultValues.borrowRate
              ] && (
                <p className="col-start-2 mt-1 text-sm text-red-500">
                  {
                    errors.borrowRate[
                      key as keyof typeof defaultValues.borrowRate
                    ]?.message as string
                  }
                </p>
              )}
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-slate-300"
          disabled={!isValid}
        >
          List Asset
        </button>
      </form>
    </div>
  );
};

export default AddCustodyForm;
