import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import {
  findPerpetualsPositionAddressSync,
  getEntryPriceAndFee,
  OpenPositionParams,
  openPositionWithSwap,
} from "@/actions/perpetuals";
import { TokenSelector } from "@/components/TokenSelector";
import { TradeDetails } from "@/components/TradeSidebar/TradeDetails";
import { LeverageSlider } from "@/components/ui/LeverageSlider";
import { LoadingDots } from "@/components/ui/LoadingDots";
import { SolidButton } from "@/components/ui/SolidButton";
import { UserBalance } from "@/components/ui/UserBalance";
import { useCompetitionMint, useCurrentEpoch } from "@/hooks/competition";
import {
  useAllUserPositions,
  usePoolCustodies,
  usePositions,
} from "@/hooks/perpetuals";
import { usePrice } from "@/hooks/pyth";
import { useBalance, useGetTokenInfo } from "@/hooks/token";
import {
  useWriteFaucetProgram,
  useWritePerpetualsProgram,
} from "@/hooks/useProgram";
import { BPS_POWER, PRICE_POWER, RATE_POWER, Side } from "@/lib/types";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";
import { dedupe } from "@/utils/utils";

enum Input {
  Pay = "pay",
  Position = "position",
}

const useEntryEstimate = (params: Omit<OpenPositionParams, "price">) => {
  const program = useWritePerpetualsProgram();
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
      debounced.collateral !== BigInt(0) &&
      debounced.size !== BigInt(0),
    queryFn: async () => {
      if (program === undefined) {
        return;
      }
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
  mint: Address;
  poolAddress: Address;
}) {
  const epoch = useCurrentEpoch();
  const { getTokenInfo } = useGetTokenInfo();
  const payToken = useCompetitionMint();
  const perpetuals = useWritePerpetualsProgram();
  const faucet = useWriteFaucetProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const { data: allPositions } = useAllUserPositions(publicKey);
  const positions = usePositions(allPositions ?? []);

  const custodies = usePoolCustodies(poolAddress);
  const custody = Object.values(custodies)[0];

  const positionToken = mint;
  const [lastChanged, setLastChanged] = useState<Input>(Input.Pay);
  const [payAmount, setPayAmount] = useState(100);
  const [positionAmount, setPositionAmount] = useState(0);

  const { data: price } = usePrice(positionToken);
  const { data: balance } = useBalance(payToken, publicKey);
  const { decimals } = getTokenInfo(mint);
  const payDecimals = getTokenInfo(payToken).decimals;

  const collateralAmount = price ? payAmount / price : 0;
  const params = {
    collateral: BigInt(Math.round(collateralAmount * 10 ** decimals)),
    mint: positionToken,
    payMint: payToken,
    poolAddress,
    price: BigInt(Math.round((price ?? 0) * PRICE_POWER * 1.05)),
    size: BigInt(Math.round(positionAmount * 10 ** decimals)),
    epoch,
  };
  const { data: estimate } = useEntryEstimate(params);

  const fees = custody
    ? Number(
        custody.pricing.tradeSpreadShort +
          custody.pricing.tradeSpreadLong +
          custody.fees.openPosition +
          custody.fees.closePosition,
      ) / BPS_POWER
    : 0;

  const payTokenBalance = balance
    ? Number(balance) / 10 ** payDecimals
    : undefined;

  const openPositionMutation = useMutation({
    onSuccess: () => {
      // Collateral Balance
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), payToken.toString()],
      });
      // Pool
      queryClient.invalidateQueries({
        queryKey: ["pool", poolAddress?.toString()],
      });

      // Add position, so its fetched
      queryClient.setQueryData(
        ["positions", publicKey?.toString()],
        (p: Address[] | undefined) =>
          dedupe([
            ...(p ?? []),
            findPerpetualsPositionAddressSync(
              publicKey!,
              poolAddress,
              custody.address,
            ),
          ]),
      );
    },
    mutationFn: async () => {
      if (
        perpetuals === undefined ||
        price === undefined ||
        faucet === undefined
      ) {
        return;
      }

      return wrapTransactionWithNotification(
        perpetuals.provider.connection,
        openPositionWithSwap({ perpetuals, faucet }, params),
        {
          pending: "Opening position",
          success: "Position opened",
          error: "Failed to open position",
        },
      );
    },
  });

  if (custody === undefined || price === undefined) {
    return (
      <div>
        <LoadingDots />
      </div>
    );
  }
  const isPositionAlreadyOpen = Object.values(positions ?? {}).some(
    (position) => position.custody.toString() === Object.keys(custodies)[0],
  );

  const isBalanceValid = payAmount <= (payTokenBalance ? payTokenBalance : 0);

  const availableLiquidity =
    (price * Number(custody.assets.owned - custody.assets.locked)) /
    10 ** custody.decimals;

  const isLiquidityExceeded =
    price && positionAmount * price > availableLiquidity;

  const leverage = positionAmount / (collateralAmount - fees * positionAmount);

  const isLeverageAboveMax =
    custody && leverage > Number(custody.pricing.maxInitialLeverage) / 10000;
  const isLeverageBelowMin =
    custody && leverage < Number(custody.pricing.minInitialLeverage) / 10000;

  const isAboveMaxPositionSize =
    positionAmount * Number(price) >
    Number(custody.pricing.maxPositionLockedUsd) / 10 ** custody.decimals;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-sm">
        <div className="font-medium text-white">Your Collateral</div>
        <UserBalance mint={payToken} />
      </div>
      <TokenSelector
        className="mt-2"
        amount={payAmount}
        token={payToken}
        onChangeAmount={(e) => {
          setPayAmount(e);
          setLastChanged(Input.Pay);
        }}
        onSelectToken={() => {
          // setPayToken(token);
          // setPositionToken(token);
        }}
        tokenList={[mint]}
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
        onSelectToken={() => {
          // setPayToken(token);
          // setPositionToken(token);
        }}
        tokenList={[mint]}
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
        value={Math.max(leverage, 0)}
        minLeverage={Number(custody.pricing.minInitialLeverage) / 10000}
        maxLeverage={Number(custody.pricing.maxInitialLeverage) / 10000}
        onChange={(l) => {
          if (lastChanged === Input.Pay) {
            setPositionAmount((l * collateralAmount) / (1 + fees * l));
          } else {
            setPayAmount((positionAmount / l) * price);
          }
        }}
      />
      <SolidButton
        className="mt-6 w-full bg-emerald-500 font-medium text-black"
        onClick={() => openPositionMutation.mutateAsync()}
        disabled={
          !publicKey ||
          payAmount === 0 ||
          isLiquidityExceeded ||
          !isBalanceValid ||
          isPositionAlreadyOpen ||
          isLeverageAboveMax ||
          isLeverageBelowMin ||
          isAboveMaxPositionSize
        }
      >
        Place Long
      </SolidButton>
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
      {isLeverageAboveMax && (
        <p className="mt-2 text-center text-xs text-orange-500">
          Leverage is too high
        </p>
      )}
      {isLeverageBelowMin && (
        <p className="mt-2 text-center text-xs text-orange-500">
          Leverage is too low
        </p>
      )}
      {isAboveMaxPositionSize && (
        <p className="mt-2 text-center text-xs text-orange-500">
          This position exceeds the maximum position size
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
        collateralToken={positionToken!}
        positionToken={positionToken!}
        entryPrice={Number(estimate?.entryPrice ?? 0) / PRICE_POWER}
        liquidationPrice={Number(estimate?.liquidationPrice ?? 0) / PRICE_POWER}
        fees={Number(estimate?.fee ?? 0) / 10 ** custody.decimals}
        availableLiquidity={availableLiquidity}
        borrowRate={Number(custody.borrowRateState.currentRate) / RATE_POWER}
        side={side}
      />
    </div>
  );
}
