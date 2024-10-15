import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { openPosition } from "src/actions/openPosition";
import { twMerge } from "tailwind-merge";

import { UserBalance } from "@/components/Atoms/UserBalance";
import { LeverageSlider } from "@/components/LeverageSlider";
import { LoadingDots } from "@/components/LoadingDots";
import { PoolSelector } from "@/components/PoolSelector";
import { SolidButton } from "@/components/SolidButton";
import { TokenSelector } from "@/components/TokenSelector";
import { TradeDetails } from "@/components/TradeSidebar/TradeDetails";
import { usePrice } from "@/hooks/price";
import { getPositionData } from "@/hooks/storeHelpers/fetchPositions";
import { useBalance } from "@/hooks/token";
import { PoolAccount } from "@/lib/PoolAccount";
import { getTokenPublicKey, TokenE, tokens } from "@/lib/Token";
import { Side } from "@/lib/types";
import { useGlobalStore } from "@/stores/store";
import { getPerpetualProgramAndProvider } from "@/utils/constants";
import { getUserPositionTokens } from "@/utils/organizers";
import { ViewHelper } from "@/utils/viewHelpers";

interface Props {
  className?: string;
  side: Side;
  token: TokenE;
}

enum Input {
  Pay = "pay",
  Position = "position",
}

export function TradePosition(props: Props) {
  const queryClient = useQueryClient();
  const poolData = useGlobalStore((state) => state.poolData);
  const custodyData = useGlobalStore((state) => state.custodyData);
  const positionData = useGlobalStore((state) => state.positionData);

  const setPositionData = useGlobalStore((state) => state.setPositionData);

  const { publicKey, wallet } = useWallet();
  const walletContextState = useWallet();
  const { connection } = useConnection();
  const timeoutRef = useRef(null);

  const [lastChanged, setLastChanged] = useState<Input>(Input.Pay);
  const [pool, setPool] = useState<PoolAccount>();

  const [payToken, setPayToken] = useState<TokenE>(props.token);
  const [positionToken, setPositionToken] = useState<TokenE>(props.token);

  const [payAmount, setPayAmount] = useState(0);
  const [positionAmount, setPositionAmount] = useState(0);
  const [leverage, setLeverage] = useState(1);
  const [conversionRatio, setConversionRatio] = useState(1);
  const [entryPrice, setEntryPrice] = useState(0);
  const [liquidationPrice, setLiquidationPrice] = useState(0);
  const [fee, setFee] = useState(0);

  const { data: price } = usePrice(getTokenPublicKey(positionToken));

  const [pendingRateConversion, setPendingRateConversion] = useState(false);
  const { data: balance } = useBalance(getTokenPublicKey(payToken), publicKey);
  const { decimals } = tokens[getTokenPublicKey(payToken).toString()]!;

  const payTokenBalance = balance
    ? Number(balance) / 10 ** decimals
    : undefined;

  async function handleTrade() {
    // console.log("in handle trade");
    await openPosition({
      walletContextState,
      connection,
      pool,
      payToken,
      positionToken,
      payAmount,
      positionAmount,
      price: price?.currentPrice ?? 0,
      side: props.side,
      leverage,
    });
    const positionInfos = await getPositionData(custodyData);
    setPositionData(positionInfos);

    queryClient.invalidateQueries({
      queryKey: ["balance", publicKey?.toString(), getTokenPublicKey(payToken)],
    });
  }

  useEffect(() => {
    if (Object.values(poolData).length > 0) {
      setPool(Object.values(poolData)[0]);
    }
  }, [poolData]);

  useEffect(() => {
    async function updateSelectors() {
      if (lastChanged === Input.Pay) {
        if (!payAmount || payAmount === 0) {
          setPositionAmount(0);
        } else {
          // console.log("last change Pay", payAmount, conversionRatio, leverage);
          setPositionAmount(payAmount * conversionRatio * leverage);
        }
      } else {
        if (!positionAmount || positionAmount === 0) {
          setPayAmount(0);
        } else {
          // console.log(
          //   "last change Position",
          //   positionAmount / leverage / conversionRatio
          // );
          setPayAmount(positionAmount / leverage / conversionRatio);
        }
      }
    }
    updateSelectors();
  }, [conversionRatio, payAmount, positionAmount, leverage]);

  useEffect(() => {
    async function fetchData() {
      if (!(payAmount > 0 && positionAmount > 0)) {
        return;
      }

      setPendingRateConversion(true);

      // console.log("after check in trade amounts", payAmount, positionAmount);

      let { perpetual_program } =
        await getPerpetualProgramAndProvider(walletContextState);

      const View = new ViewHelper(
        perpetual_program.provider.connection,
        perpetual_program.provider,
      );

      let getEntryPrice = await View.getEntryPriceAndFee(
        payAmount * conversionRatio,
        positionAmount,
        props.side,
        pool!,
        pool!.getCustodyAccount(positionToken)!,
      );

      // console.log("get entry values", getEntryPrice);
      // console.log("entry price", Number(getEntryPrice.entryPrice) / 10 ** 6);

      setEntryPrice(Number(getEntryPrice.entryPrice) / 10 ** 6);
      setLiquidationPrice(Number(getEntryPrice.liquidationPrice) / 10 ** 6);
      setFee(Number(getEntryPrice.fee) / 10 ** 9);

      setPendingRateConversion(false);
    }

    if (pool && props.side) {
      clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        fetchData();
      }, 1000);
    }
    return () => {
      clearTimeout(timeoutRef.current);
    };
    // @ts-ignore
  }, [payAmount, positionAmount]);

  function isLiquityExceeded() {
    return (
      price &&
      positionAmount * price.currentPrice >
        pool
          .getCustodyAccount(positionToken!)
          ?.getCustodyLiquidity(price.currentPrice)!
    );
  }

  function isPositionAlreadyOpen() {
    if (!positionToken || !publicKey) return false;
    try {
      return Object.keys(
        getUserPositionTokens(positionData, publicKey),
      ).includes(positionToken);
    } catch {
      return false;
    }
  }

  function isBalanceValid() {
    return payAmount <= (payTokenBalance ? payTokenBalance : 0);
  }

  if (!pool || price === undefined) {
    return (
      <div>
        <LoadingDots />
      </div>
    );
  }

  return (
    <div className={props.className}>
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
        tokenList={pool.getTokenList()}
        maxBalance={payTokenBalance ? payTokenBalance : 0}
      />
      <div className="mt-4 text-sm font-medium text-white">
        Your {props.side}
      </div>
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
          router.push("/trade/" + token, undefined, { shallow: true });
        }}
        tokenList={pool.getTokenList([TokenE.USDC, TokenE.USDT])}
        pendingRateConversion={pendingRateConversion}
      />
      <div className="mt-4 text-xs text-zinc-400">Pool</div>
      <PoolSelector className="mt-2" pool={pool} onSelectPool={setPool} />
      <LeverageSlider
        className="mt-6"
        value={leverage}
        minLeverage={Number(
          pool.getCustodyAccount(positionToken)?.pricing.minInitialLeverage /
            10000,
        )}
        maxLeverage={Number(
          pool.getCustodyAccount(positionToken)?.pricing.maxLeverage / 10000,
        )}
        onChange={(e) => {
          setLeverage(e);
        }}
      />
      <p className="mt-2 text-center text-xs text-orange-500">
        Leverage current only works until 25x due to immediate loss from fees
      </p>
      <SolidButton
        className="mt-6 w-full"
        onClick={handleTrade}
        disabled={
          !publicKey ||
          payAmount === 0 ||
          isLiquityExceeded() ||
          isPositionAlreadyOpen() ||
          !isBalanceValid()
        }
      >
        Place Order
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
      {isLiquityExceeded() && (
        <p className="mt-2 text-center text-xs text-orange-500">
          This position exceeds pool liquidity, reduce your position size or
          leverage
        </p>
      )}
      {!isBalanceValid() && (
        <p className="mt-2 text-center text-xs text-orange-500">
          Insufficient balance
        </p>
      )}

      {isPositionAlreadyOpen() && (
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
        entryPrice={entryPrice}
        liquidationPrice={liquidationPrice}
        fees={fee}
        availableLiquidity={
          pool
            .getCustodyAccount(positionToken!)
            ?.getCustodyLiquidity(price.currentPrice)!
        }
        borrowRate={
          Number(
            pool.getCustodyAccount(positionToken!!)?.borrowRateState
              .currentRate,
          ) /
          10 ** 9
        }
        side={props.side}
      />
    </div>
  );
}
