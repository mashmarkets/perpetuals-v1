import BigNumber from "bignumber.js";

import { useForm } from "react-hook-form";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { parseUnits } from "@/utils/viem";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pool } from "@/hooks/perpetuals";
import { BN } from "bn.js";

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

export const addCustodySchema = z.object({
  poolName: z.string(),
  tokenMint: z.string().transform(transformToPublicKey),
  isStable: z.boolean(),
  isVirtual: z.boolean(),
  // These should be nested under oracle, but i realized too late and it was too much work...
  tokenOracle: z.string().transform(transformToPublicKey),
  oracleType: z
    .enum(["pyth", "custom"])
    .transform((x) => ({ [x]: {} } as { pyth: {} } | { custom: {} })),
  maxPriceError: z.string().transform(transformToBN(0)),
  maxPriceAgeSec: z.string().transform((x) => parseInt(x)),
  oracleAuthority: z.string().transform((x) => new PublicKey(x)),
  pricingConfig: z.object({
    useEma: z.boolean(),
    useUnrealizedPnlInAum: z.boolean(),
    tradeSpreadLong: z.string().transform(transformToBN(4 - 2)),
    tradeSpreadShort: z.string().transform(transformToBN(4 - 2)),
    swapSpread: z.string().transform(transformToBN(4 - 2)),
    minInitialLeverage: z.string().transform(transformToBN(4)),
    maxInitialLeverage: z.string().transform(transformToBN(4)),
    maxLeverage: z.string().transform(transformToBN(4)),
    maxPayoffMult: z.string().transform(transformToBN(4 - 2)),
    maxUtilization: z.string().transform(transformToBN(4 - 2)),
    maxPositionLockedUsd: z.string().transform(transformToBN(6)),
    maxTotalLockedUsd: z.string().transform(transformToBN(6)),
  }),
  permissions: z.object({
    allowSwap: z.boolean(),
    allowAddLiquidity: z.boolean(),
    allowRemoveLiquidity: z.boolean(),
    allowOpenPosition: z.boolean(),
    allowClosePosition: z.boolean(),
    allowPnlWithdrawal: z.boolean(),
    allowCollateralWithdrawal: z.boolean(),
    allowSizeChange: z.boolean(),
  }),
  fees: z.object({
    mode: z
      .enum(["fixed", "linear", "optimal"])
      .transform(
        (x) => ({ [x]: {} } as { fixed: {} } | { linear: {} } | { optimal: {} })
      ),
    ratioMult: z.string().transform(transformToBN(4 - 2)),
    utilizationMult: z.string().transform(transformToBN(4 - 2)),
    swapIn: z.string().transform(transformToBN(4 - 2)),
    swapOut: z.string().transform(transformToBN(4 - 2)),
    stableSwapIn: z.string().transform(transformToBN(4 - 2)),
    stableSwapOut: z.string().transform(transformToBN(4 - 2)),
    addLiquidity: z.string().transform(transformToBN(4 - 2)),
    removeLiquidity: z.string().transform(transformToBN(4 - 2)),
    openPosition: z.string().transform(transformToBN(4 - 2)),
    closePosition: z.string().transform(transformToBN(4 - 2)),
    liquidation: z.string().transform(transformToBN(4 - 2)),
    protocolShare: z.string().transform(transformToBN(4 - 2)),
    feeMax: z.string().transform(transformToBN(4 - 2)),
    feeOptimal: z.string().transform(transformToBN(4 - 2)),
  }),
  borrowRate: z.object({
    baseRate: z.string().transform(transformToBN(9 - 2)),
    slope1: z.string().transform(transformToBN(9 - 2)),
    slope2: z.string().transform(transformToBN(9 - 2)),
    optimalUtilization: z.string().transform(transformToBN(9 - 2)),
  }),
  ratios: z
    .array(
      z.object({
        target: z.string().transform(transformToBN(4 - 2)),
        min: z.string().transform(transformToBN(4 - 2)),
        max: z.string().transform(transformToBN(4 - 2)),
      })
    )
    .refine(
      (vals) => {
        return new BN("10000").eq(
          vals.reduce((acc, val) => acc.add(val.target), new BN(0))
        );
      },
      {
        message: "Target ratios don't add up to 100%",
      }
    ),
});

export type AddCustodyParams = z.infer<typeof addCustodySchema>;
// This is input type values (i.e. before transformation)
type AddCustodyState = z.input<typeof addCustodySchema>;

const prefills: Record<any, Partial<AddCustodyState>> = {
  USDC: {
    tokenMint: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
    tokenOracle: "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX",
    isStable: true,
    isVirtual: false,
    oracleType: "pyth",
  },
  SOL: {
    tokenMint: "So11111111111111111111111111111111111111112",
    tokenOracle: "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE",
    isStable: false,
    isVirtual: false,
    oracleType: "pyth",
  },
  RAY: {
    tokenMint: "GFz5gtptPcqJpV5dUHqiwtDwvrVamjQyKaLaFrQ9iwH2",
    tokenOracle: "Hhipna3EoWR7u8pDruUg8RxhP5F6XLh6SEHMVDmZhWi8",
    isStable: false,
    isVirtual: false,
    oracleType: "pyth",
  },
  ORCA: {
    tokenMint: "A5sPEFgEF2ET1Xdo6ZT8vMxwKqdBgQ6bAUaKdqoNApo8",
    tokenOracle: "4CBshVeNBEXz24GZpoj8SrqP5L7VGG3qjGd6tCST1pND",
    isStable: false,
    isVirtual: false,
    oracleType: "pyth",
  },
  BONK: {
    tokenMint: "Ek9RtoqksVzPfMRFN2BTgCxM7e5QoJ3rZLL18phtz2Ri",
    tokenOracle: "DBE3N8uNjhKPRHfANdwGvCZghWXyLPdqdSbEW2XFwBiX",
    isStable: false,
    isVirtual: false,
    oracleType: "pyth",
  },
};

const AddCustodyForm = ({
  custodies,
  pool,
  onSubmit,
}: {
  pool: Pool;
  custodies: { mint: PublicKey }[];
  onSubmit: (x: any) => void;
}) => {
  const defaultValues: AddCustodyState = {
    poolName: pool.name,
    tokenMint: "",
    tokenOracle: "",
    isStable: false,
    isVirtual: false,
    oracleType: "pyth",
    maxPriceError: "10000" as string,
    maxPriceAgeSec: "60",
    oracleAuthority: PublicKey.default.toString(),
    pricingConfig: {
      useEma: true,
      useUnrealizedPnlInAum: true,
      tradeSpreadLong: "1.00",
      tradeSpreadShort: "1.00",
      swapSpread: "2.00",
      minInitialLeverage: "1.0000",
      maxInitialLeverage: "100.0000",
      maxLeverage: "100.0000",
      maxPayoffMult: "100.00",
      maxUtilization: "100.00",
      maxPositionLockedUsd: "0",
      maxTotalLockedUsd: "0",
    },
    permissions: {
      allowSwap: true,
      allowAddLiquidity: true,
      allowRemoveLiquidity: true,
      allowOpenPosition: true,
      allowClosePosition: true,
      allowPnlWithdrawal: true,
      allowCollateralWithdrawal: true,
      allowSizeChange: true,
    },
    fees: {
      mode: "linear",
      ratioMult: "200.00",
      utilizationMult: "200.00",
      swapIn: "1.00",
      swapOut: "1.00",
      stableSwapIn: "1.00",
      stableSwapOut: "1.00",
      addLiquidity: "1.00",
      removeLiquidity: "1.00",
      openPosition: "1.00",
      closePosition: "1.00",
      liquidation: "1.00",
      protocolShare: "0.10",
      feeMax: "2.50",
      feeOptimal: "0.10",
    },
    borrowRate: {
      baseRate: "0.0000000",
      slope1: "0.0080000",
      slope2: "0.0120000",
      optimalUtilization: "80.0000000",
    },
    ratios: [
      ...pool.ratios,
      { min: new BN("0"), max: new BN("10000"), target: new BN("5000") },
    ].map((x) => ({
      max: BigNumber(x.max.toString()).div(100).toFixed(2),
      min: BigNumber(x.min.toString()).div(100).toFixed(2),
      target: BigNumber(x.target.toString()).div(100).toFixed(2),
    })),
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
  const feeMode = watch("fees.mode");
  const tokenMint = watch("tokenMint");
  return (
    <div className="container mx-auto p-4 bg-zinc-900">
      <div>
        <select
          id="tokenSelect"
          value=""
          onChange={(e) => {
            e.preventDefault();
            Object.entries(prefills[e.target.value]).forEach(([key, value]) => {
              setValue(key as keyof typeof defaultValues, value as any);
            });
          }}
          className="w-full p-2 border rounded mb-4"
        >
          <option value="">Prefill For</option>
          {Object.entries(prefills).map(([key, value]) => {
            if (
              custodies.map((x) => x.mint.toString()).includes(value.tokenMint)
            )
              return null;
            return (
              <option key={key} value={key}>
                {key}
              </option>
            );
          })}
        </select>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Info */}
        <div>
          <label htmlFor="tokenMint" className="block mb-1 text-white">
            Token Mint:
          </label>
          <input
            id="tokenMint"
            type="text"
            {...register("tokenMint")}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="tokenOracle" className="block mb-1 text-white">
            Token Oracle:
          </label>
          <input
            id="tokenOracle"
            type="text"
            {...register("tokenOracle")}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="flex items-center text-white">
            <input type="checkbox" {...register("isStable")} className="mr-2" />
            Is Stablecoin
          </label>
        </div>
        <div>
          <label className="flex items-center text-white">
            <input
              type="checkbox"
              {...register("isVirtual")}
              className="mr-2"
            />
            Is Virtual
          </label>
        </div>

        {/* Oracle Config */}
        <h2 className="text-xl font-semibold mt-4 text-white">
          Oracle Configuration
        </h2>
        <div>
          <label htmlFor="oracleType" className="block mb-1 text-white">
            Oracle Type:
          </label>
          <select
            id="oracleType"
            {...register("oracleType")}
            className="w-full p-2 border rounded"
          >
            <option value="custom">Custom</option>
            <option value="pyth">Pyth</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label htmlFor="maxPriceError" className="block mb-1 text-white">
            Max Price Error ?????:
          </label>
          <input
            id="maxPriceError"
            type="number"
            {...register("maxPriceError")}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="maxPriceAgeSec" className="block mb-1 text-white">
            Max Price Age (seconds):
          </label>
          <input
            id="maxPriceAgeSec"
            type="number"
            min="0"
            {...register("maxPriceAgeSec")}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        {oracleType === "custom" && (
          <div>
            <label htmlFor="oracleAuthority" className="block mb-1 text-white">
              Oracle Authority:
            </label>
            <input
              id="oracleAuthority"
              type="text"
              {...register("oracleAuthority")}
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}

        {/* Pricing Config */}
        <h2 className="text-white text-xl font-semibold mt-4">
          Pricing Configuration
        </h2>
        <div>
          <label className="text-white flex items-center">
            <input
              type="checkbox"
              {...register("pricingConfig.useEma")}
              className="mr-2"
            />
            Use EMA
          </label>
        </div>
        <div>
          <label className="text-white flex items-center">
            <input
              type="checkbox"
              {...register("pricingConfig.useUnrealizedPnlInAum")}
              className="mr-2"
            />
            Use Unrealized PnL in AUM
          </label>
        </div>
        <div>
          <label htmlFor="tradeSpreadLong" className="text-white block mb-1">
            Trade Spread Long (%):
          </label>
          <input
            id="tradeSpreadLong"
            type="number"
            min="0"
            {...register("pricingConfig.tradeSpreadLong")}
            className="w-full p-2 border rounded"
            required
            step="0.01"
          />
        </div>
        <div>
          <label htmlFor="tradeSpreadShort" className="text-white block mb-1">
            Trade Spread Short (%):
          </label>
          <input
            id="tradeSpreadShort"
            type="number"
            {...register("pricingConfig.tradeSpreadShort")}
            className="w-full p-2 border rounded"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="swapSpread" className="text-white block mb-1">
            Swap Spread (%):
          </label>
          <input
            id="swapSpread"
            type="number"
            {...register("pricingConfig.swapSpread")}
            className="w-full p-2 border rounded"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="minInitialLeverage" className="text-white block mb-1">
            Min Initial Leverage (x):
          </label>
          <input
            id="minInitialLeverage"
            type="number"
            {...register("pricingConfig.minInitialLeverage")}
            className="w-full p-2 border rounded"
            required
            step="0.0001"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxInitialLeverage" className="text-white block mb-1">
            Max Initial Leverage (x):
          </label>
          <input
            id="maxInitialLeverage"
            type="number"
            {...register("pricingConfig.maxInitialLeverage")}
            className="w-full p-2 border rounded"
            required
            step="0.0001"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxLeverage" className="text-white block mb-1">
            Max Leverage (x):
          </label>
          <input
            id="maxLeverage"
            type="number"
            {...register("pricingConfig.maxLeverage")}
            className="w-full p-2 border rounded"
            required
            step="0.0001"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxPayoffMult" className="text-white block mb-1">
            Max Payoff Mult (%):
          </label>
          <input
            id="maxPayoffMult"
            type="number"
            {...register("pricingConfig.maxPayoffMult")}
            className="w-full p-2 border rounded"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxUtilization" className="text-white block mb-1">
            Max Utilization (%):
          </label>
          <input
            id="maxUtilization"
            type="number"
            {...register("pricingConfig.maxUtilization")}
            className="w-full p-2 border rounded"
            required
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label
            htmlFor="maxPositionLockedUsd"
            className="text-white block mb-1"
          >
            Max Position Locked (USD):
          </label>
          <input
            id="maxPositionLockedUsd"
            type="number"
            {...register("pricingConfig.maxPositionLockedUsd")}
            className="w-full p-2 border rounded"
            required
            step="0.000001"
            min="0"
          />
        </div>
        <div>
          <label htmlFor="maxTotalLockedUsd" className="text-white block mb-1">
            Max Total Locked (USD):
          </label>
          <input
            id="maxTotalLockedUsd"
            type="number"
            {...register("pricingConfig.maxTotalLockedUsd")}
            className="w-full p-2 border rounded"
            required
            step="0.000001"
            min="0"
          />
        </div>

        {/* Permissions */}
        <h2 className="text-white text-xl font-semibold mt-4">Permissions</h2>
        {Object.entries(defaultValues.permissions).map(([key, value]) => {
          if (["allowPnlWithdrawal", "allowSizeChange"].includes(key)) {
            return null;
          }
          return (
            <div key={key}>
              <label className="text-white flex items-center">
                <input
                  type="checkbox"
                  {...register(`permissions.${key}`)}
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
        <h2 className="text-white text-xl font-semibold mt-4">Fees</h2>
        <div>
          <label htmlFor="feeMode" className="text-white block mb-1">
            Fee Mode:
          </label>
          <select
            id="feeMode"
            {...register("fees.mode")}
            className="w-full p-2 border rounded"
          >
            <option value="fixed">Fixed</option>
            <option value="linear">Linear</option>
            <option value="optimal">Optimal</option>
          </select>
        </div>
        {Object.entries(defaultValues.fees).map(([key, value]) => {
          if (key === "mode") return null;
          if (["ratioMult"].includes(key) && feeMode !== "linear") {
            return null;
          }
          if (["feeMax", "feeOptimal"].includes(key) && feeMode !== "optimal") {
            return null;
          }
          return (
            <div key={key}>
              <label htmlFor={key} className="text-white block mb-1">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}{" "}
                (%):
              </label>
              <input
                id={key}
                type="number"
                {...register(`fees.${key}`)}
                className="w-full p-2 border rounded"
                required
                step="0.01"
                min="0"
              />
            </div>
          );
        })}

        {/* Borrow Rate */}
        <h2 className="text-xl font-semibold mt-4 text-white">Borrow Rate</h2>
        {Object.entries(defaultValues.borrowRate).map(([key, value]) => (
          <div key={key}>
            <label htmlFor={key} className="text-white block mb-1">
              {key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}{" "}
              (%):
            </label>
            <input
              id={key}
              type="number"
              {...register(`borrowRate.${key}`)}
              className="w-full p-2 border rounded"
              required
              step="0.0000001"
              min="0"
            />
          </div>
        ))}

        <h2 className="text-xl font-semibold mt-4 text-white">Ratios</h2>
        <table className="w-full text-white">
          <thead>
            <tr>
              <th>Custody</th>
              <th>Target (%)</th>
              <th>Min (%)</th>
              <th>Max (%)</th>
            </tr>
          </thead>
          <tbody>
            {[...pool.custodies, tokenMint].map((custody, i) => (
              <tr key={custody.toString()}>
                <td>{custody === "" ? "To be added" : custody.toString()}</td>
                <td>
                  <input
                    type="number"
                    // defaultValue={ratio.target}
                    className="w-full p-2 border rounded bg-gray-700 text-white"
                    {...register(`ratios.${i}.target`)}
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    {...register(`ratios.${i}.min`)}
                    className="w-full p-2 border rounded bg-gray-700 text-white"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-gray-700 text-white"
                    {...register(`ratios.${i}.max`)}
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={!isValid}
        >
          Add Custody
        </button>
      </form>
    </div>
  );
};

export default AddCustodyForm;