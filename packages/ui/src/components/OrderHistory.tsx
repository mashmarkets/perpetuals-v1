import { NewTab } from "@carbon/icons-react";
import { Event } from "@coral-xyz/anchor";
import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransactionResponse } from "@solana/web3.js";
import { useEffect, useState } from "react";

import {
  findPerpetualsPositionAddressSync,
  getPerpetualsEvents,
} from "@/actions/perpetuals";
import { useSignaturesForAddress, useTransactions } from "@/hooks/connection";
import { usePoolCustodies } from "@/hooks/perpetuals";
import { useGetTokenInfo } from "@/hooks/token";
import { useReadPerpetualsProgram } from "@/hooks/useProgram";
import { PRICE_POWER, USD_POWER } from "@/lib/types";
import { formatPrice, formatUsd, formatUsdWithSign } from "@/utils/formatters";
import { TRX_URL } from "@/utils/TransactionHandlers";

const parseOrderHistory = (event: VersionedTransactionResponse & Event) => {
  if (
    ![
      "openPosition",
      "closePosition",
      "liquidatePosition",
      "addCollateral",
      "removeCollateral",
    ].includes(event.name)
  ) {
    return undefined;
  }

  return {
    blockTime: new Date(Number(event.blockTime) * 1000),
    signature: event.transaction.signatures[0],
    owner: event.data.owner.toString(),
    pool: event.data.pool.toString(),
    custody: event.data.custody.toString(),
    action: {
      addCollateral: "Add Collateral",
      closePosition: "Close",
      liquidatePosition: "Liquidation",
      openPosition: "Open",
      removeCollateral: "Remove Collateral",
    }[event.name],
    sizeUsd: BigInt(event.data.sizeUsd.toString()),

    pnlUsd: ["liquidatePosition", "closePosition"].includes(event.name)
      ? BigInt(event.data.profitUsd.toString()) -
        BigInt(event.data.lossUsd.toString())
      : undefined,

    price: BigInt(event.data.price.toString()),

    fee: ["liquidatePosition", "closePosition"].includes(event.name)
      ? BigInt(event.data.feeAmount.toString())
      : undefined,

    transferAmount:
      BigInt(event.data.transferAmount.toString()) *
      (["addCollateral", "openPosition"].includes(event.name) ? -1n : 1n),
  };
};

export function OrderHistory({ poolAddress }: { poolAddress: Address }) {
  const { getTokenSymbol } = useGetTokenInfo();
  const [history, setHistory] = useState<
    NonNullable<ReturnType<typeof parseOrderHistory>>[]
  >([]);
  const program = useReadPerpetualsProgram();
  const { publicKey } = useWallet();
  const custodies = usePoolCustodies(poolAddress);
  const custody = custodies ? Object.values(custodies)[0] : undefined;

  const position =
    !publicKey || custody === undefined
      ? undefined
      : findPerpetualsPositionAddressSync(
          publicKey,
          poolAddress,
          custody.address,
        );

  const { data: sigs } = useSignaturesForAddress(position);
  const txs = useTransactions(sigs ?? []);

  useEffect(() => {
    Promise.all(
      Object.values(txs ?? {}).map((tx) => getPerpetualsEvents(program, tx)),
    ).then((x) => {
      const events = x
        .flat()
        .map(parseOrderHistory)
        .filter((x) => x !== undefined);

      events.sort((a, b) => b.blockTime.getTime() - a.blockTime.getTime());
      setHistory(events);
    });
  }, [txs, program]);

  if (!publicKey || custody === undefined) {
    return <>Loading...</>;
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg bg-zinc-900">
      <table className="min-w-full text-right text-white">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left">Symbol</th>
            <th className="px-4 py-3 text-left">Time</th>
            <th className="px-4 py-3 text-center">Action</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Transfer</th>
            <th className="px-4 py-3">Size</th>
            <th className="px-4 py-3">PnL</th>
            <th className="px-4 py-3">Fee</th>
            <th className="px-4 py-3">Tx</th>
          </tr>
        </thead>
        <tbody>
          {(history ?? []).map((h) => {
            const symbol = getTokenSymbol(custody.mint);
            const toUsd = (n: bigint | undefined) => {
              if (n === undefined) {
                return undefined;
              }

              return (
                (n * h.price * BigInt(USD_POWER)) /
                BigInt(PRICE_POWER) /
                BigInt(10 ** custody.decimals)
              );
            };
            const feeUsd = toUsd(h.fee);
            const transferUsd = toUsd(h.transferAmount);

            return (
              <tr
                key={h.signature}
                className="border-b border-gray-800 transition-colors hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-left">{symbol}</td>
                <td className="px-4 py-3 text-left">
                  {h.blockTime.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-left capitalize">{h.action}</td>
                <td className="px-4 py-3">
                  {"$" + formatPrice(Number(h.price) / PRICE_POWER)}
                </td>
                <td className="px-4 py-3">
                  {formatUsdWithSign(Number(transferUsd) / USD_POWER)}
                </td>
                <td className="px-4 py-3">
                  {formatUsd(Number(h.sizeUsd) / USD_POWER)}
                </td>
                <td className="px-4 py-3">
                  {h.pnlUsd && (
                    <span
                      className={
                        Number(h.pnlUsd) >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {formatUsdWithSign(Number(h.pnlUsd) / USD_POWER)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {feeUsd && formatUsd(Number(feeUsd) / USD_POWER)}
                </td>
                <td className="flex items-end justify-end px-4 py-3 text-center">
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`${TRX_URL(h.signature)}`}
                    className="text-center transition-opacity hover:opacity-80"
                  >
                    <NewTab className="h-4 w-4 fill-white" />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
