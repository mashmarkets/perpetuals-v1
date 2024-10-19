import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { BN } from "bn.js";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import {
  getEntryPriceAndFee,
  openPosition,
  OpenPositionParams,
} from "@/actions/perpetuals";
import { UserBalance } from "@/components/Atoms/UserBalance";
import { LeverageSlider } from "@/components/LeverageSlider";
import { LoadingDots } from "@/components/LoadingDots";
import { SolidButton } from "@/components/SolidButton";
import { TokenSelector } from "@/components/TokenSelector";
import { TradeDetails } from "@/components/TradeSidebar/TradeDetails";
import { useAllUserPositions, usePoolCustodies } from "@/hooks/perpetuals";
import { usePrice } from "@/hooks/price";
import { useBalance } from "@/hooks/token";
import { useProgram } from "@/hooks/useProgram";
import {
  getTokenInfo,
  getTokenPublicKey,
  tokenAddressToToken,
  TokenE,
} from "@/lib/Token";
import { Side } from "@/lib/types";
import { stringify } from "@/pages/pools/manage/[poolAddress]";

import { PoolSelector } from "../PoolSelector";

enum Input {
  Pay = "pay",
  Position = "position",
}

const useEntryEstimate = (params: Omit<OpenPositionParams, "price">) => {
  const program = useProgram();
  const debounced = useDebounce(params, 400);
  return useQuery({
    queryKey: [
      "getEntryPriceAndFee",
      debounced.poolAddress.toString(),
      debounced.mint.toString(),
      debounced.size.toString(),
      debounced.collateral.toString(),
    ],
    refetchInterval: 5 * 1000,
    enabled:
      !!program &&
      !debounced.collateral.eq(new BN(0)) &&
      !debounced.size.eq(new BN(0)),
    queryFn: async () => {
      return await getEntryPriceAndFee(program, debounced);
    },
  });
};

export function TradePosition({
  className,
  side,
  mint,
  poolAddress,
}: {
  className?: string;
  side: Side;
  mint: PublicKey;
  poolAddress: PublicKey;
}) {
  const program = useProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const { data: positions } = useAllUserPositions(publicKey);

  const custodies = usePoolCustodies(poolAddress);
  const custody = Object.values(custodies)[0];
  const token = tokenAddressToToken(mint.toString())!;

  const [lastChanged, setLastChanged] = useState<Input>(Input.Pay);
  const [payToken, setPayToken] = useState<TokenE>(token);
  const [positionToken, setPositionToken] = useState<TokenE>(token);
  const [payAmount, setPayAmount] = useState(1);
  const [positionAmount, setPositionAmount] = useState(0);

  const { data: price } = usePrice(getTokenPublicKey(positionToken));
  const { data: balance } = useBalance(getTokenPublicKey(payToken), publicKey);
  const { decimals } = getTokenInfo(mint);

  const params = {
    collateral: new BN(Math.round(payAmount * 10 ** decimals)),
    mint,
    poolAddress,
    price: new BN(Math.round((price?.currentPrice ?? 0) * 10 ** 6 * 1.05)),
    size: new BN(Math.round(positionAmount * 10 ** decimals)),
  };
  const { data: estimate } = useEntryEstimate(params);

  const payTokenBalance = balance
    ? Number(balance) / 10 ** decimals
    : undefined;

  async function handleTrade() {
    if (price === undefined) {
      return;
    }

    console.log("Opening position: ", stringify(params));
    await openPosition(program, params);

    queryClient.invalidateQueries({
      queryKey: ["balance", publicKey?.toString(), getTokenPublicKey(payToken)],
    });
  }

  if (custody === undefined || price === undefined) {
    return (
      <div>
        <LoadingDots />
      </div>
    );
  }
  const isPositionAlreadyOpen = (positions ?? []).some(
    (position) => position.custody.toString() === Object.keys(custodies)[0],
  );

  const isBalanceValid = payAmount <= (payTokenBalance ? payTokenBalance : 0);

  const availableLiquidity =
    (price.currentPrice *
      Number(custody.assets.owned - custody.assets.locked)) /
    10 ** custody.decimals;

  const isLiquidityExceeded =
    price && positionAmount * price.currentPrice > availableLiquidity;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm">
        <div className="font-medium text-white">Your Collateral</div>
        <UserBalance mint={getTokenPublicKey(payToken)} />
      </div>
      <TokenSelector
        className="mt-2"
        amount={payAmount}
        token={payToken}
        onChangeAmount={(e) => {
          setPayAmount(e);
          setLastChanged(Input.Pay);
        }}
        onSelectToken={(token) => {
          setPayToken(token);
          setPositionToken(token);
        }}
        tokenList={[token]}
        maxBalance={payTokenBalance ? payTokenBalance : 0}
      />
      <div className="mt-4 text-sm font-medium text-white">Your {side}</div>
      <TokenSelector
        className="mt-2"
        amount={positionAmount}
        token={positionToken}
        onChangeAmount={(e) => {
          setPositionAmount(e);
          setLastChanged(Input.Position);
        }}
        onSelectToken={(token) => {
          setPayToken(token);
          setPositionToken(token);
        }}
        tokenList={[token]}
      />
      {/* <div className="mt-4 text-xs text-zinc-400">Pool</div> */}
      {/* <PoolSelector
        className="mt-2"
        poolAddress={poolAddress}
        onSelectPool={(x) => {
          console.log("CHanging to pool: ", x.toString());
        }}
      /> */}
      <LeverageSlider
        className="mt-6"
        value={positionAmount / payAmount}
        minLeverage={Number(custody.pricing.minInitialLeverage) / 10000}
        maxLeverage={Number(custody.pricing.maxInitialLeverage) / 10000}
        onChange={(e) => {
          if (lastChanged === Input.Pay) {
            setPositionAmount(e * payAmount);
          } else {
            setPayAmount(positionAmount / e);
          }
        }}
      />
      <SolidButton
        className="mt-6 w-full bg-emerald-500 font-medium text-black"
        onClick={handleTrade}
        disabled={
          !publicKey ||
          payAmount === 0 ||
          isLiquidityExceeded ||
          isPositionAlreadyOpen ||
          !isBalanceValid
        }
      >
        Place Long
      </SolidButton>
      <p className="mt-2 text-center text-xs text-orange-500">
        Leverage current only works until 25x due to immediate loss from fees
      </p>
      {!publicKey && (
        <p className="mt-2 text-center text-xs text-orange-500">
          Connect wallet to execute order
        </p>
      )}
      {!payAmount && (
        <p className="mt-2 text-center text-xs text-orange-500">
          Specify a valid nonzero amount to pay
        </p>
      )}
      {isLiquidityExceeded && (
        <p className="mt-2 text-center text-xs text-orange-500">
          This position exceeds pool liquidity, reduce your position size or
          leverage
        </p>
      )}
      {!isBalanceValid && (
        <p className="mt-2 text-center text-xs text-orange-500">
          Insufficient balance
        </p>
      )}

      {isPositionAlreadyOpen && (
        <p className="mt-2 text-center text-xs text-orange-500">
          Position exists, modify or close current holding
        </p>
      )}
      <TradeDetails
        className={twMerge(
          "-mb-4",
          "-mx-4",
          "bg-zinc-900",
          "mt-4",
          "pb-5",
          "pt-4",
          "px-4",
        )}
        collateralToken={payToken!}
        positionToken={positionToken!}
        entryPrice={Number(estimate?.entryPrice ?? 0) / 10 ** 6}
        liquidationPrice={Number(estimate?.liquidationPrice ?? 0) / 10 ** 6}
        fees={Number(estimate?.fee ?? 0) / 10 ** 9}
        availableLiquidity={availableLiquidity}
        borrowRate={Number(custody.borrowRateState.currentRate) / 10 ** 9}
        side={side}
      />
    </div>
  );
}
