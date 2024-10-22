import { BN } from "@coral-xyz/anchor";
import { zodResolver } from "@hookform/resolvers/zod";
import { PublicKey } from "@solana/web3.js";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAllPools } from "@/hooks/perpetuals";
import { getTokensKeyedBy, getTokenSymbol } from "@/lib/Token";
import { parseUnits } from "@/utils/viem";

const transformToBN = (decimals: number) => (x: string) =>
  new BN(parseUnits(x, decimals).toString());

const transformToPublicKey = (x: string, ctx: z.RefinementCtx) => {
  try {
    return new PublicKey(x);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Not a public key",
    });
    return z.NEVER;
  }
};

const addCustodySchema = z.object({
  poolName: z.string(),
  tokenMint: z.string().transform(transformToPublicKey),
  // These should be nested under oracle, but i realized too late and it was too much work...
  tokenOracle: z.string().transform(transformToPublicKey),
  oracleType: z
    .enum(["pyth", "custom"])
    .transform((x) => ({ [x]: {} }) as { pyth: {} } | { custom: {} }),
  maxPriceError: z.string().transform(transformToBN(4 - 2)),
  maxPriceAgeSec: z.string().transform((x) => parseInt(x)),
  oracleAuthority: z.string().transform((x) => new PublicKey(x)),
  pricingConfig: z.object({
    useEma: z.boolean(),
    useUnrealizedPnlInAum: z.boolean(),
    tradeSpreadLong: z.string().transform(transformToBN(4 - 2)),
    tradeSpreadShort: z.string().transform(transformToBN(4 - 2)),
    minInitialLeverage: z.string().transform(transformToBN(4)),
    maxInitialLeverage: z.string().transform(transformToBN(4)),
    maxLeverage: z.string().transform(transformToBN(4)),
    maxPayoffMult: z.string().transform(transformToBN(4 - 2)),
    maxUtilization: z.string().transform(transformToBN(4 - 2)),
    maxPositionLockedUsd: z.string().transform(transformToBN(6)),
    maxTotalLockedUsd: z.string().transform(transformToBN(6)),
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
    utilizationMult: z.string().transform(transformToBN(4 - 2)),
    addLiquidity: z.string().transform(transformToBN(4 - 2)),
    removeLiquidity: z.string().transform(transformToBN(4 - 2)),
    openPosition: z.string().transform(transformToBN(4 - 2)),
    closePosition: z.string().transform(transformToBN(4 - 2)),
    liquidation: z.string().transform(transformToBN(4 - 2)),
    protocolShare: z.string().transform(transformToBN(4 - 2)),
  }),
  borrowRate: z.object({
    baseRate: z.string().transform(transformToBN(9 - 2)),
    slope1: z.string().transform(transformToBN(9 - 2)),
    slope2: z.string().transform(transformToBN(9 - 2)),
    optimalUtilization: z.string().transform(transformToBN(9 - 2)),
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
  custodies: { mint: PublicKey }[];
  onSubmit: (x: any) => void;
}) => {
  const pools = useAllPools();
  const defaultValues: AddCustodyState = {
    poolName: poolName,
    tokenMint: "",
    tokenOracle: "",
    oracleType: "pyth",
    maxPriceError: "100.00" as string,
    maxPriceAgeSec: "600",
    oracleAuthority: PublicKey.default.toString(),
    pricingConfig: {
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
    formState: { isValid },
  } = useForm({
    defaultValues,
    mode: "onChange",
    resolver: zodResolver(addCustodySchema),
  });

  const oracleType = watch("oracleType");
  const list = getTokensKeyedBy("address");
  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <select
            id="tokenSelect"
            value=""
            onChange={(e) => {
              e.preventDefault();
              const token = list[e.target.value]!;
              setValue("tokenMint", token.address, { shouldDirty: true });
              setValue("tokenOracle", token.extensions.oracle, {
                shouldDirty: true,
              });
              const symbol = getTokenSymbol(new PublicKey(token.address));
              // If no current pool is using this symbol as name, use it as "canonical" name
              if (!Object.values(pools ?? {}).find((x) => x.name === symbol)) {
                setValue("poolName", symbol, { shouldDirty: true });
              }
            }}
            className="w-full rounded border p-2"
          >
            <option value="">Prefill For</option>
            {Object.entries(list).map(([key, value]) => {
              if (
                custodies.map((x) => x.mint.toString()).includes(value.address)
              )
                return null;
              return (
                <option key={key} value={key}>
                  {value.symbol} ({key})
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label htmlFor="poolName" className="mb-1 block text-white">
            Unique Pool Name:
          </label>
          <input
            id="poolName"
            type="text"
            {...register("poolName")}
            className="mb-2 w-full rounded border p-2"
            required
          />
        </div>
        {/* Basic Info */}
        <div>
          <label htmlFor="tokenMint" className="mb-1 block text-white">
            Token Mint:
          </label>
          <input
            id="tokenMint"
            type="text"
            {...register("tokenMint")}
            className="w-full rounded border p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="tokenOracle" className="mb-1 block text-white">
            Token Oracle:
          </label>
          <input
            id="tokenOracle"
            type="text"
            {...register("tokenOracle")}
            className="w-full rounded border p-2"
            required
          />
        </div>

        {/* Oracle Config */}
        <h2 className="mt-4 text-xl font-semibold text-white">
          Oracle Configuration
        </h2>
        {/* <div>
          <label htmlFor="oracleType" className="mb-1 block text-white">
            Oracle Type:
          </label>
          <select
            id="oracleType"
            {...register("oracleType")}
            className="w-full rounded border p-2"
          >
            <option value="custom">Custom</option>
            <option value="pyth">Pyth</option>
            <option value="none">None</option>
          </select>
        </div> */}
        <div>
          <label htmlFor="maxPriceError" className="mb-1 block text-white">
            Max Price Error (%)
          </label>
          <input
            id="maxPriceError"
            type="number"
            {...register("maxPriceError")}
            className="w-full rounded border p-2"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxPriceAgeSec" className="mb-1 block text-white">
            Max Price Age (seconds):
          </label>
          <input
            id="maxPriceAgeSec"
            type="number"
            min="0"
            {...register("maxPriceAgeSec")}
            className="w-full rounded border p-2"
            required
          />
        </div>
        {oracleType === "custom" && (
          <div>
            <label htmlFor="oracleAuthority" className="mb-1 block text-white">
              Oracle Authority:
            </label>
            <input
              id="oracleAuthority"
              type="text"
              {...register("oracleAuthority")}
              className="w-full rounded border p-2"
              required
            />
          </div>
        )}

        {/* Pricing Config */}
        <h2 className="mt-4 text-xl font-semibold text-white">
          Pricing Configuration
        </h2>
        <div>
          <label className="flex items-center text-white">
            <input
              type="checkbox"
              {...register("pricingConfig.useEma")}
              className="mr-2"
            />
            Use EMA
          </label>
        </div>
        <div>
          <label className="flex items-center text-white">
            <input
              type="checkbox"
              {...register("pricingConfig.useUnrealizedPnlInAum")}
              className="mr-2"
            />
            Use Unrealized PnL in AUM
          </label>
        </div>
        <div>
          <label htmlFor="tradeSpreadLong" className="mb-1 block text-white">
            Trade Spread Open (%):
          </label>
          <input
            id="tradeSpreadLong"
            type="number"
            min="0"
            {...register("pricingConfig.tradeSpreadLong")}
            className="w-full rounded border p-2"
            required
            step="0.01"
          />
        </div>
        <div>
          <label htmlFor="tradeSpreadShort" className="mb-1 block text-white">
            Trade Spread Close (%):
          </label>
          <input
            id="tradeSpreadShort"
            type="number"
            {...register("pricingConfig.tradeSpreadShort")}
            className="w-full rounded border p-2"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="minInitialLeverage" className="mb-1 block text-white">
            Min Initial Leverage (x):
          </label>
          <input
            id="minInitialLeverage"
            type="number"
            {...register("pricingConfig.minInitialLeverage")}
            className="w-full rounded border p-2"
            required
            step="0.0001"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxInitialLeverage" className="mb-1 block text-white">
            Max Initial Leverage (x):
          </label>
          <input
            id="maxInitialLeverage"
            type="number"
            {...register("pricingConfig.maxInitialLeverage")}
            className="w-full rounded border p-2"
            required
            step="0.0001"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxLeverage" className="mb-1 block text-white">
            Max Leverage (x):
          </label>
          <input
            id="maxLeverage"
            type="number"
            {...register("pricingConfig.maxLeverage")}
            className="w-full rounded border p-2"
            required
            step="0.0001"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxPayoffMult" className="mb-1 block text-white">
            Max Payoff Mult (%):
          </label>
          <input
            id="maxPayoffMult"
            type="number"
            {...register("pricingConfig.maxPayoffMult")}
            className="w-full rounded border p-2"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxUtilization" className="mb-1 block text-white">
            Max Utilization (%):
          </label>
          <input
            id="maxUtilization"
            type="number"
            {...register("pricingConfig.maxUtilization")}
            className="w-full rounded border p-2"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label
            htmlFor="maxPositionLockedUsd"
            className="mb-1 block text-white"
          >
            Max Position Locked (USD):
          </label>
          <input
            id="maxPositionLockedUsd"
            type="number"
            {...register("pricingConfig.maxPositionLockedUsd")}
            className="w-full rounded border p-2"
            required
            step="0.000001"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxTotalLockedUsd" className="mb-1 block text-white">
            Max Total Locked (USD):
          </label>
          <input
            id="maxTotalLockedUsd"
            type="number"
            {...register("pricingConfig.maxTotalLockedUsd")}
            className="w-full rounded border p-2"
            required
            step="0.000001"
            min="0"
          />
        </div>

        {/* Permissions */}
        <h2 className="mt-4 text-xl font-semibold text-white">Permissions</h2>
        {Object.entries(defaultValues.permissions).map(([key, value]) => {
          if (["allowPnlWithdrawal", "allowSizeChange"].includes(key)) {
            return null;
          }
          return (
            <div key={key}>
              <label className="flex items-center text-white">
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
            </div>
          );
        })}

        {/* Fees */}
        <h2 className="mt-4 text-xl font-semibold text-white">Fees</h2>
        {Object.entries(defaultValues.fees).map(([key, value]) => {
          if (["addLiquidity", "protocolShare"].includes(key)) {
            return null;
          }
          return (
            <div key={key}>
              <label htmlFor={key} className="mb-1 block text-white">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}{" "}
                (%):
              </label>
              <input
                id={key}
                type="number"
                {...register(`fees.${key as keyof typeof defaultValues.fees}`)}
                className="w-full rounded border p-2"
                required
                step="0.01"
                min="0"
              />
            </div>
          );
        })}

        {/* Borrow Rate */}
        <h2 className="mt-4 text-xl font-semibold text-white">Borrow Rate</h2>
        {Object.entries(defaultValues.borrowRate).map(([key, value]) => (
          <div key={key}>
            <label htmlFor={key} className="mb-1 block text-white">
              {key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}{" "}
              (%):
            </label>
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
          </div>
        ))}

        <button
          type="submit"
          className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          disabled={!isValid}
        >
          List Asset
        </button>
      </form>
    </div>
  );
};

export default AddCustodyForm;
