import Add from "@carbon/icons-react/lib/Add";
import Subtract from "@carbon/icons-react/lib/Subtract";
import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import {
  addLiquidity,
  findPerpetualsAddressSync,
  removeLiquidity,
} from "@/actions/perpetuals";
import { LpSelector } from "@/components/PoolModal/LpSelector";
import { TokenSelector } from "@/components/TokenSelector";
import { SidebarTab } from "@/components/ui/SidebarTab";
import { SolidButton } from "@/components/ui/SolidButton";
import {
  useGetAddLiquidityAmountAndFee,
  useGetRemoveLiquidityAmountAndFee,
  usePool,
  usePoolCustodies,
} from "@/hooks/perpetuals";
import { useBalance, useMint } from "@/hooks/token";
import { useWritePerpetualsProgram } from "@/hooks/useProgram";
import { getTokenSymbol } from "@/lib/Token";
import { LP_POWER } from "@/lib/types";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

import { Tab } from "../ui/SidebarTab";

export default function LiquidityCard({
  poolAddress,
  className,
}: {
  className?: string;
  poolAddress: Address;
}) {
  const [tab, setTab] = useState(Tab.Add);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [liqAmount, setLiqAmount] = useState(0);

  const queryClient = useQueryClient();
  const program = useWritePerpetualsProgram();
  const { publicKey } = useWallet();
  const { data: pool } = usePool(poolAddress);
  const custodies = usePoolCustodies(poolAddress);

  const custody = Object.values(custodies ?? {})[0];
  const payToken = custody ? custody.mint : undefined;

  const { data: payTokenBalance } = useBalance(payToken, publicKey);

  const lpMintAddress = findPerpetualsAddressSync("lp_token_mint", poolAddress);
  const { data: lpMint } = useMint(lpMintAddress);
  const lp = useBalance(
    lpMintAddress,
    publicKey === null ? undefined : publicKey,
  );

  const liqBalance = lp?.data === undefined ? 0 : Number(lp.data) / LP_POWER;

  const debounced = useDebounce({ tokenAmount, tab, liqAmount }, 400);
  const { data: addLiquidityEstimate } = useGetAddLiquidityAmountAndFee({
    pool,
    amountIn:
      debounced.tab === Tab.Add && custody?.decimals
        ? BigInt(debounced.tokenAmount * 10 ** custody.decimals)
        : BigInt(0),
  });
  const { data: removeLiquidityEstimate } = useGetRemoveLiquidityAmountAndFee({
    pool,
    lpAmountIn:
      debounced.tab === Tab.Remove
        ? BigInt(debounced.liqAmount * LP_POWER)
        : BigInt(0),
  });

  const changeLiquidityMutation = useMutation({
    onSuccess: () => {
      if (tab === Tab.Add) {
        setTokenAmount(0);
      } else {
        setLiqAmount(0);
      }
      // LP Balance
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), lpMintAddress],
      });
      // Collateral balance
      queryClient.invalidateQueries({
        queryKey: ["account", publicKey?.toString(), custody?.mint],
      });
      // LP Shares
      queryClient.invalidateQueries({
        queryKey: ["mint", lpMintAddress],
      });
      // Pool
      queryClient.invalidateQueries({
        queryKey: ["pool", poolAddress],
      });
      // Custody
      queryClient.invalidateQueries({
        queryKey: ["custody", custody?.address],
      });
    },
    mutationFn: async () => {
      if (
        program === undefined ||
        custody === undefined ||
        !pool ||
        lpMint === undefined
      ) {
        return;
      }
      if (tab === Tab.Add && addLiquidityEstimate) {
        const params = {
          pool,
          custody,
          amountIn: BigInt(Math.round(tokenAmount * 10 ** custody.decimals)),
          mintLpAmountOut:
            (addLiquidityEstimate.amount * BigInt(95)) / BigInt(100),
        };
        console.log("Adding liquidity with params", params);
        return wrapTransactionWithNotification(
          program.provider.connection,
          addLiquidity(program, params),
          {
            pending: "Adding Liquidity",
            success: "Liquidity Added",
            error: "Failed to add liquidity",
          },
        );
      }
      if (tab === Tab.Remove && removeLiquidityEstimate) {
        const params = {
          pool,
          custody,
          lpAmountIn: BigInt(Math.round(liqAmount * LP_POWER)),
          minAmountOut:
            (removeLiquidityEstimate.amount * BigInt(95)) / BigInt(100),
        };
        console.log("Removing liquidity with params", params);
        return await wrapTransactionWithNotification(
          program.provider.connection,
          removeLiquidity(program, params),
          {
            pending: "Removing Liquidity",
            success: "Liquidity Removed",
            error: "Failed to remove liquidity",
          },
        );
      }

      return;
    },
  });

  const payTokenBalanceUi =
    payTokenBalance === undefined || custody === undefined
      ? 0
      : Number(payTokenBalance) / 10 ** custody.decimals;

  return (
    <div className={className}>
      <div
        className={twMerge("bg-zinc-800", "p-4", "rounded", "overflow-hidden")}
      >
        <div className="mb-4 grid grid-cols-2 gap-x-1 rounded bg-black p-1">
          <SidebarTab
            selected={tab === Tab.Add}
            onClick={() => setTab(Tab.Add)}
          >
            <Add className="h-4 w-4" />
            <div>Add</div>
          </SidebarTab>
          <SidebarTab
            selected={tab === Tab.Remove}
            onClick={() => setTab(Tab.Remove)}
          >
            <Subtract className="h-4 w-4" />
            <div>Remove</div>
          </SidebarTab>
        </div>

        <div>
          <div className="flex items-center justify-between">
            {tab === Tab.Add ? (
              <>
                <div className="text-sm font-medium text-white">You Add</div>
                {publicKey && (
                  <div>Balance: {payTokenBalanceUi.toFixed(2)}</div>
                )}
              </>
            ) : (
              <>
                <div className="text-sm font-medium text-white">You Remove</div>
                {publicKey && (
                  <div>Balance: {liqBalance && liqBalance.toFixed(2)}</div>
                )}
              </>
            )}
          </div>
          {tab === Tab.Add ? (
            <TokenSelector
              className="mt-2"
              amount={tokenAmount}
              token={payToken!}
              onChangeAmount={setTokenAmount}
              tokenList={[payToken!]}
              maxBalance={payTokenBalanceUi}
            />
          ) : (
            <LpSelector
              className="mt-2"
              amount={liqAmount}
              onChangeAmount={setLiqAmount}
              maxBalance={liqBalance ? liqBalance : 0}
            />
          )}
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">You Receive</div>
            {tab === Tab.Add ? (
              <>
                {publicKey && (
                  <div>Balance: {liqBalance && liqBalance.toFixed(2)}</div>
                )}
              </>
            ) : (
              <>
                {publicKey && (
                  <div>Balance: {payTokenBalanceUi.toFixed(2)}</div>
                )}
              </>
            )}
          </div>

          {tab === Tab.Add ? (
            <LpSelector
              className="mt-2"
              amount={
                tokenAmount === 0
                  ? 0
                  : lpMint && addLiquidityEstimate?.amount
                    ? Number(addLiquidityEstimate.amount) / LP_POWER
                    : undefined
              }
            />
          ) : (
            <TokenSelector
              className="mt-2"
              amount={
                liqAmount === 0
                  ? 0
                  : removeLiquidityEstimate && custody
                    ? Number(removeLiquidityEstimate.amount) /
                      10 ** custody.decimals
                    : undefined
              }
              token={payToken!}
              tokenList={[payToken!]}
            />
          )}
        </div>

        <div className="mt-2 flex flex-row justify-end space-x-2">
          <p className="text-sm text-zinc-500">Fee</p>
          <p className="text-sm text-white">
            {tab == Tab.Add &&
              (addLiquidityEstimate?.fee !== undefined
                ? (
                    Number(addLiquidityEstimate.fee) /
                    10 ** custody.decimals
                  ).toFixed(4)
                : "-")}
            {tab == Tab.Remove &&
              (removeLiquidityEstimate?.fee !== undefined
                ? (
                    Number(removeLiquidityEstimate.fee) /
                    10 ** custody.decimals
                  ).toFixed(4)
                : "-")}
          </p>
          <p className="text-sm text-white">{getTokenSymbol(custody?.mint)}</p>
        </div>
        <SolidButton
          className="mt-4 w-full"
          onClick={() => changeLiquidityMutation.mutate()}
          disabled={!publicKey || (tokenAmount === 0 && liqAmount === 0)}
        >
          {tab == Tab.Add ? "Add" : "Remove"} Liquidity
        </SolidButton>
        {!publicKey && (
          <p className="mt-2 text-center text-xs text-orange-500">
            Please connect wallet to add liquidity
          </p>
        )}
        {tokenAmount === 0 && liqAmount === 0 && (
          <p className="mt-2 text-center text-xs text-orange-500">
            Please enter a valid amount of to{" "}
            {tab === Tab.Add ? "add" : "remove"} liquidity
          </p>
        )}
      </div>
    </div>
  );
}
