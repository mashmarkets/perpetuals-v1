import Add from "@carbon/icons-react/lib/Add";
import Subtract from "@carbon/icons-react/lib/Subtract";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import {
  addLiquidity,
  findPerpetualsAddressSync,
  removeLiquidity,
} from "@/actions/perpetuals";
import AirdropButton from "@/components/AirdropButton";
import { LpSelector } from "@/components/PoolModal/LpSelector";
import { SidebarTab } from "@/components/SidebarTab";
import { SolidButton } from "@/components/SolidButton";
import { TokenSelector } from "@/components/TokenSelector";
import {
  useGetAddLiquidityAmountAndFee,
  useGetRemoveLiquidityAmountAndFee,
  usePool,
  usePoolCustodies,
} from "@/hooks/perpetuals";
import { useBalance, useMint } from "@/hooks/token";
import { useProgram } from "@/hooks/useProgram";
import { asToken, getTokenPublicKey } from "@/lib/Token";
import { Tab } from "@/lib/types";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";
import { stringify } from "@/utils/utils";

export default function LiquidityCard({
  poolAddress,
  className,
}: {
  className?: string;
  poolAddress: PublicKey;
}) {
  const [tab, setTab] = useState(Tab.Add);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [liqAmount, setLiqAmount] = useState(0);

  const queryClient = useQueryClient();
  const program = useProgram();
  const { publicKey } = useWallet();
  const { data: pool } = usePool(poolAddress);
  const custodies = usePoolCustodies(poolAddress);

  const custody = Object.values(custodies ?? {})[0];
  const payToken = custody ? asToken(custody.mint) : undefined;

  const { data: payTokenBalance } = useBalance(
    getTokenPublicKey(payToken!),
    publicKey,
  );

  const lpMintAddress = findPerpetualsAddressSync(
    "lp_token_mint",
    new PublicKey(poolAddress),
  );
  const { data: lpMint } = useMint(lpMintAddress);
  const lp = useBalance(
    lpMintAddress,
    publicKey === null ? undefined : publicKey,
  );

  let liqBalance =
    lp?.data === undefined || lpMint === undefined
      ? 0
      : Number(lp.data) / 10 ** lpMint.decimals;

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
      debounced.tab === Tab.Remove && lpMint?.decimals
        ? BigInt(debounced.liqAmount * 10 ** lpMint.decimals)
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
        queryKey: ["balance", publicKey?.toString(), lpMintAddress?.toString()],
      });
      // Collateral balance
      queryClient.invalidateQueries({
        queryKey: ["balance", publicKey?.toString(), custody?.mint.toString()],
      });
      // LP Shares
      queryClient.invalidateQueries({
        queryKey: ["mint", lpMintAddress?.toString()],
      });
      // Pool
      queryClient.invalidateQueries({
        queryKey: ["pool", poolAddress?.toString()],
      });
      // Custody
      queryClient.invalidateQueries({
        queryKey: ["custody", custody?.address.toString()],
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
        console.log("Adding liquidity with params", stringify(params));
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
          lpAmountIn: BigInt(Math.round(liqAmount * 10 ** lpMint.decimals)),
          minAmountOut:
            (removeLiquidityEstimate.amount * BigInt(95)) / BigInt(100),
        };
        console.log("Removing liquidity with params", stringify(params));
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

        {Object.values(custodies ?? {}).map((custody) => {
          return (
            <AirdropButton
              key={custody.address.toString()}
              mint={custody.mint}
            />
          );
        })}

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
                    ? Number(addLiquidityEstimate.amount) /
                      10 ** lpMint.decimals
                    : undefined
              }
            />
          ) : (
            // @ts-ignore
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
          <p className="text-sm text-white">
            {tab == Tab.Add &&
              (addLiquidityEstimate?.fee !== undefined
                ? "$" + (Number(addLiquidityEstimate.fee) / 10 ** 6).toFixed(4)
                : "-")}
            {tab == Tab.Remove &&
              (removeLiquidityEstimate?.fee !== undefined
                ? "$" +
                  (Number(removeLiquidityEstimate.fee) / 10 ** 6).toFixed(4)
                : "-")}
          </p>
          <p className="text-sm text-zinc-500">Fee</p>
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
