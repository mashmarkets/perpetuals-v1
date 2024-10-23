import { zodResolver } from "@hookform/resolvers/zod";
import { address, Address } from "@solana/addresses";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAllPools } from "@/hooks/perpetuals";
import { getTokenInfo, getTokensKeyedBy, getTokenSymbol } from "@/lib/Token";
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
    maxPriceError: z.string().transform(transformToBigInt(4 - 2)),
  }),
  pricing: z.object({
    useEma: z.boolean(),
    useUnrealizedPnlInAum: z.boolean(),
    tradeSpreadLong: z.string().transform(transformToBigInt(4 - 2)),
    tradeSpreadShort: z.string().transform(transformToBigInt(4 - 2)),
    minInitialLeverage: z.string().transform(transformToBigInt(4)),
    maxInitialLeverage: z.string().transform(transformToBigInt(4)),
    maxLeverage: z.string().transform(transformToBigInt(4)),
    maxPayoffMult: z.string().transform(transformToBigInt(4 - 2)),
    maxUtilization: z.string().transform(transformToBigInt(4 - 2)),
    maxPositionLockedUsd: z.string().transform(transformToBigInt(6)),
    maxTotalLockedUsd: z.string().transform(transformToBigInt(6)),
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
    utilizationMult: z.string().transform(transformToBigInt(4 - 2)),
    addLiquidity: z.string().transform(transformToBigInt(4 - 2)),
    removeLiquidity: z.string().transform(transformToBigInt(4 - 2)),
    openPosition: z.string().transform(transformToBigInt(4 - 2)),
    closePosition: z.string().transform(transformToBigInt(4 - 2)),
    liquidation: z.string().transform(transformToBigInt(4 - 2)),
    protocolShare: z.string().transform(transformToBigInt(4 - 2)),
  }),
  borrowRate: z.object({
    baseRate: z.string().transform(transformToBigInt(9 - 2)),
    slope1: z.string().transform(transformToBigInt(9 - 2)),
    slope2: z.string().transform(transformToBigInt(9 - 2)),
    optimalUtilization: z.string().transform(transformToBigInt(9 - 2)),
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
      oracleAuthority: "111111111111111111111111111111111",
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
    formState: { isValid },
  } =
    // Different input outputs due to zod transform https://github.com/react-hook-form/documentation/issues/1078
    useForm<AddCustodyState, unknown, AddCustodyParams>({
      defaultValues,
      mode: "onChange",
      resolver: zodResolver(addCustodySchema),
    });

  const oracleType = watch("oracle.oracleType");
  const list = getTokensKeyedBy("address");
  return (
    <div>
      <form onSubmit={() => handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <select
            id="tokenSelect"
            value=""
            onChange={(e) => {
              e.preventDefault();
              const token = getTokenInfo(e.target.value as Address);
              setValue("tokenMint", token.address, { shouldDirty: true });
              setValue("oracle.oracleAccount", token.extensions.oracle, {
                shouldDirty: true,
              });
              const symbol = getTokenSymbol(token.address);
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
            {...register("oracle.oracleAccount")}
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
            {...register("oracle.maxPriceError")}
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
            {...register("oracle.maxPriceAgeSec")}
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
              {...register("oracle.oracleAuthority")}
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
              {...register("pricing.useEma")}
              className="mr-2"
            />
            Use EMA
          </label>
        </div>
        <div>
          <label className="flex items-center text-white">
            <input
              type="checkbox"
              {...register("pricing.useUnrealizedPnlInAum")}
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
            {...register("pricing.tradeSpreadLong")}
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
            {...register("pricing.tradeSpreadShort")}
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
            {...register("pricing.minInitialLeverage")}
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
            {...register("pricing.maxInitialLeverage")}
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
            {...register("pricing.maxLeverage")}
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
            {...register("pricing.maxPayoffMult")}
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
            {...register("pricing.maxUtilization")}
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
            {...register("pricing.maxPositionLockedUsd")}
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
            {...register("pricing.maxTotalLockedUsd")}
            className="w-full rounded border p-2"
            required
            step="0.000001"
            min="0"
          />
        </div>

        {/* Permissions */}
        <h2 className="mt-4 text-xl font-semibold text-white">Permissions</h2>
        {Object.keys(defaultValues.permissions).map((key) => {
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
        {Object.keys(defaultValues.fees).map((key) => {
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
        {Object.keys(defaultValues.borrowRate).map((key) => (
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
