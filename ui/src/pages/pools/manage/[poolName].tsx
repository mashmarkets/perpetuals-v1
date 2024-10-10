import { useState } from "react";
import { useRouter } from "next/router";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { PerpetualsClient } from "@/app/client";
import {
  OracleParams,
  PricingParams,
  Permissions,
  Fees,
  BorrowRateParams,
} from "@/app/types";

const AddCustodyForm = () => {
  const router = useRouter();
  const { poolName } = router.query;

  const [tokenMint, setTokenMint] = useState("");
  const [tokenOracle, setTokenOracle] = useState("");
  const [isStable, setIsStable] = useState(false);
  const [isVirtual, setIsVirtual] = useState(false);

  // Oracle Config
  const [oracleType, setOracleType] =
    useState<keyof OracleParams["oracleType"]>("custom");
  const [maxPriceError, setMaxPriceError] = useState("10000");
  const [maxPriceAgeSec, setMaxPriceAgeSec] = useState("10");
  const [oracleAuthority, setOracleAuthority] = useState("");

  // Pricing Config
  const [useEma, setUseEma] = useState(true);
  const [useUnrealizedPnlInAum, setUseUnrealizedPnlInAum] = useState(true);
  const [tradeSpreadLong, setTradeSpreadLong] = useState("100");
  const [tradeSpreadShort, setTradeSpreadShort] = useState("100");
  const [swapSpread, setSwapSpread] = useState("200");
  const [minInitialLeverage, setMinInitialLeverage] = useState("10000");
  const [maxInitialLeverage, setMaxInitialLeverage] = useState("1000000");
  const [maxLeverage, setMaxLeverage] = useState("1000000");
  const [maxPayoffMult, setMaxPayoffMult] = useState("10000");
  const [maxUtilization, setMaxUtilization] = useState("10000");
  const [maxPositionLockedUsd, setMaxPositionLockedUsd] = useState("0");
  const [maxTotalLockedUsd, setMaxTotalLockedUsd] = useState("0");

  // Permissions
  const [permissions, setPermissions] = useState<Permissions>({
    allowSwap: true,
    allowAddLiquidity: true,
    allowRemoveLiquidity: true,
    allowOpenPosition: true,
    allowClosePosition: true,
    allowPnlWithdrawal: true,
    allowCollateralWithdrawal: true,
    allowSizeChange: true,
  });

  // Fees
  const [fees, setFees] = useState<Fees>({
    mode: { linear: {} },
    ratioMult: new BN("20000"),
    utilizationMult: new BN("20000"),
    swapIn: new BN("100"),
    swapOut: new BN("100"),
    stableSwapIn: new BN("100"),
    stableSwapOut: new BN("100"),
    addLiquidity: new BN("100"),
    removeLiquidity: new BN("100"),
    openPosition: new BN("100"),
    closePosition: new BN("100"),
    liquidation: new BN("100"),
    protocolShare: new BN("10"),
    feeMax: new BN("250"),
    feeOptimal: new BN("10"),
  });

  // Borrow Rate
  const [borrowRate, setBorrowRate] = useState<BorrowRateParams>({
    baseRate: new BN("0"),
    slope1: new BN("80000"),
    slope2: new BN("120000"),
    optimalUtilization: new BN("800000000"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Initialize your PerpetualsClient here
    const client = new PerpetualsClient(/* your parameters */);

    const oracleConfig: OracleParams = {
      maxPriceError: new BN(maxPriceError),
      maxPriceAgeSec: parseInt(maxPriceAgeSec),
      oracleType: { [oracleType]: {} },
      oracleAccount: new PublicKey(tokenOracle),
      oracleAuthority: new PublicKey(oracleAuthority),
    };

    const pricingConfig: PricingParams = {
      useEma,
      useUnrealizedPnlInAum,
      tradeSpreadLong: new BN(tradeSpreadLong),
      tradeSpreadShort: new BN(tradeSpreadShort),
      swapSpread: new BN(swapSpread),
      minInitialLeverage: new BN(minInitialLeverage),
      maxInitialLeverage: new BN(maxInitialLeverage),
      maxLeverage: new BN(maxLeverage),
      maxPayoffMult: new BN(maxPayoffMult),
      maxUtilization: new BN(maxUtilization),
      maxPositionLockedUsd: new BN(maxPositionLockedUsd),
      maxTotalLockedUsd: new BN(maxTotalLockedUsd),
    };

    // permissions, fees, and borrowRate are already in the correct format

    try {
      await client.addCustody(
        poolName as string,
        new PublicKey(tokenMint),
        isStable,
        isVirtual,
        oracleConfig,
        pricingConfig,
        permissions,
        fees,
        borrowRate,
        [] // ratios - you might want to add this as a form field if needed
      );
      alert("Custody added successfully!");
    } catch (error) {
      console.error("Error adding custody:", error);
      alert("Failed to add custody. Check console for details.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white ">
        Add Custody to {poolName}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div>
          <label htmlFor="tokenMint" className="block mb-1 text-white">
            Token Mint:
          </label>
          <input
            id="tokenMint"
            type="text"
            value={tokenMint}
            onChange={(e) => setTokenMint(e.target.value)}
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
            value={tokenOracle}
            onChange={(e) => setTokenOracle(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="flex items-center text-white">
            <input
              type="checkbox"
              checked={isStable}
              onChange={(e) => setIsStable(e.target.checked)}
              className="mr-2"
            />
            Is Stablecoin
          </label>
        </div>
        <div>
          <label className="flex items-center text-white">
            <input
              type="checkbox"
              checked={isVirtual}
              onChange={(e) => setIsVirtual(e.target.checked)}
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
            value={oracleType}
            onChange={(e) =>
              setOracleType(e.target.value as keyof OracleParams["oracleType"])
            }
            className="w-full p-2 border rounded"
          >
            <option value="custom">Custom</option>
            <option value="pyth">Pyth</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label htmlFor="maxPriceError" className="block mb-1 text-white">
            Max Price Error:
          </label>
          <input
            id="maxPriceError"
            type="number"
            value={maxPriceError}
            onChange={(e) => setMaxPriceError(e.target.value)}
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
            value={maxPriceAgeSec}
            onChange={(e) => setMaxPriceAgeSec(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="oracleAuthority" className="block mb-1 text-white">
            Oracle Authority:
          </label>
          <input
            id="oracleAuthority"
            type="text"
            value={oracleAuthority}
            onChange={(e) => setOracleAuthority(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Pricing Config */}
        <h2 className="text-white text-xl font-semibold mt-4">
          Pricing Configuration
        </h2>
        <div>
          <label className="text-white flex items-center">
            <input
              type="checkbox"
              checked={useEma}
              onChange={(e) => setUseEma(e.target.checked)}
              className="mr-2"
            />
            Use EMA
          </label>
        </div>
        <div>
          <label className="text-white flex items-center">
            <input
              type="checkbox"
              checked={useUnrealizedPnlInAum}
              onChange={(e) => setUseUnrealizedPnlInAum(e.target.checked)}
              className="mr-2"
            />
            Use Unrealized PnL in AUM
          </label>
        </div>
        <div>
          <label htmlFor="tradeSpreadLong" className="text-white block mb-1">
            Trade Spread Long:
          </label>
          <input
            id="tradeSpreadLong"
            type="number"
            value={tradeSpreadLong}
            onChange={(e) => setTradeSpreadLong(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="tradeSpreadShort" className="text-white block mb-1">
            Trade Spread Short:
          </label>
          <input
            id="tradeSpreadShort"
            type="number"
            value={tradeSpreadShort}
            onChange={(e) => setTradeSpreadShort(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="swapSpread" className="text-white block mb-1">
            Swap Spread:
          </label>
          <input
            id="swapSpread"
            type="number"
            value={swapSpread}
            onChange={(e) => setSwapSpread(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="minInitialLeverage" className="text-white block mb-1">
            Min Initial Leverage:
          </label>
          <input
            id="minInitialLeverage"
            type="number"
            value={minInitialLeverage}
            onChange={(e) => setMinInitialLeverage(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="maxInitialLeverage" className="text-white block mb-1">
            Max Initial Leverage:
          </label>
          <input
            id="maxInitialLeverage"
            type="number"
            value={maxInitialLeverage}
            onChange={(e) => setMaxInitialLeverage(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="maxLeverage" className="text-white block mb-1">
            Max Leverage:
          </label>
          <input
            id="maxLeverage"
            type="number"
            value={maxLeverage}
            onChange={(e) => setMaxLeverage(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="maxPayoffMult" className="text-white block mb-1">
            Max Payoff Mult:
          </label>
          <input
            id="maxPayoffMult"
            type="number"
            value={maxPayoffMult}
            onChange={(e) => setMaxPayoffMult(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="maxUtilization" className="text-white block mb-1">
            Max Utilization:
          </label>
          <input
            id="maxUtilization"
            type="number"
            value={maxUtilization}
            onChange={(e) => setMaxUtilization(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label
            htmlFor="maxPositionLockedUsd"
            className="text-white block mb-1"
          >
            Max Position Locked USD:
          </label>
          <input
            id="maxPositionLockedUsd"
            type="number"
            value={maxPositionLockedUsd}
            onChange={(e) => setMaxPositionLockedUsd(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="maxTotalLockedUsd" className="text-white block mb-1">
            Max Total Locked USD:
          </label>
          <input
            id="maxTotalLockedUsd"
            type="number"
            value={maxTotalLockedUsd}
            onChange={(e) => setMaxTotalLockedUsd(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Permissions */}
        <h2 className="text-white text-xl font-semibold mt-4">Permissions</h2>
        {Object.entries(permissions).map(([key, value]) => (
          <div key={key}>
            <label className="text-white flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  setPermissions((prev) => ({
                    ...prev,
                    [key]: e.target.checked,
                  }))
                }
                className="mr-2"
              />
              {key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}
            </label>
          </div>
        ))}

        {/* Fees */}
        <h2 className="text-white text-xl font-semibold mt-4">Fees</h2>
        <div>
          <label htmlFor="feeMode" className="text-white block mb-1">
            Fee Mode:
          </label>
          <select
            id="feeMode"
            value={Object.keys(fees.mode)[0]}
            onChange={(e) =>
              setFees((prev) => ({ ...prev, mode: { [e.target.value]: {} } }))
            }
            className="w-full p-2 border rounded"
          >
            <option value="fixed">Fixed</option>
            <option value="linear">Linear</option>
            <option value="optimal">Optimal</option>
          </select>
        </div>
        {Object.entries(fees).map(([key, value]) => {
          if (key === "mode") return null;
          return (
            <div key={key}>
              <label htmlFor={key} className="text-white block mb-1">
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
                :
              </label>
              <input
                id={key}
                type="number"
                value={value.toString()}
                onChange={(e) =>
                  setFees((prev) => ({
                    ...prev,
                    [key]: new BN(e.target.value),
                  }))
                }
                className="w-full p-2 border rounded"
                required
              />
            </div>
          );
        })}

        {/* Borrow Rate */}
        <h2 className="text-xl font-semibold mt-4 text-white">Borrow Rate</h2>
        {Object.entries(borrowRate).map(([key, value]) => (
          <div key={key}>
            <label htmlFor={key} className="text-white block mb-1">
              {key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())}
              :
            </label>
            <input
              id={key}
              type="number"
              value={value.toString()}
              onChange={(e) =>
                setBorrowRate((prev) => ({
                  ...prev,
                  [key]: new BN(e.target.value),
                }))
              }
              className="w-full p-2 border rounded"
              required
            />
          </div>
        ))}

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Custody
        </button>
      </form>
    </div>
  );
};

export default AddCustodyForm;
