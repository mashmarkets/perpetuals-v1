import NewTab from "@carbon/icons-react/lib/NewTab";
import { Address } from "@solana/addresses";
import { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

import { usePoolCustodies } from "@/hooks/perpetuals";
import { usePrices } from "@/hooks/price";
import { getTokenIcon, getTokenLabel, getTokenSymbol } from "@/lib/Token";
import { formatNumberCommas } from "@/utils/formatters";
import { ACCOUNT_URL } from "@/utils/TransactionHandlers";
import { dedupe } from "@/utils/utils";

export default function PoolTokenStats({
  poolAddress,
}: {
  poolAddress: Address;
}) {
  const custodies = usePoolCustodies(poolAddress);
  const prices = usePrices(
    dedupe(Object.values(custodies ?? {}).map((x) => x.mint)),
  );

  return (
    <div className="w-full">
      <div className="bg-zinc-900 p-8">
        <table className={twMerge("table-auto", "text-white", "w-full")}>
          <thead className={twMerge("text-xs", "text-zinc-500", "p-10")}>
            <tr className="">
              <td className="pb-5 text-white">Pool Tokens</td>
              <td className="pb-5">Deposit Fee</td>
              <td className="pb-5">Liquidity</td>
              <td className="pb-5">Price</td>
              <td className="pb-5">Amount</td>
              <td className="pb-5">Utilization</td>
              <td className="pb-5"></td>
            </tr>
          </thead>
          <tbody className={twMerge("text-xs")}>
            {Object.values(custodies ?? {}).map((custody) => {
              const price = prices[custody.mint.toString()]?.currentPrice;
              return (
                <tr
                  key={custody.mint.toString()}
                  className="border-t border-zinc-700"
                >
                  <td className="py-4">
                    <div className="flex flex-row items-center space-x-1">
                      {cloneElement(getTokenIcon(custody.mint), {
                        className: "h-10 w-10",
                      })}
                      <div className="flex flex-col">
                        <p className="font-medium">
                          {getTokenSymbol(custody.mint)}
                        </p>
                        <p className={twMerge("text-xs", "text-zinc-500")}>
                          {getTokenLabel(custody.mint)}
                        </p>
                      </div>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`${ACCOUNT_URL(custody.mint.toString())}`}
                      >
                        <NewTab />
                      </a>
                    </div>
                  </td>
                  <td>{Number(custody.fees.addLiquidity) / 100}%</td>
                  <td>
                    $
                    {formatNumberCommas(
                      price
                        ? (price *
                            Number(
                              custody.assets.owned - custody.assets.locked,
                            )) /
                            10 ** custody.decimals
                        : 0,
                    )}
                  </td>
                  <td>${formatNumberCommas(price)}</td>
                  <td>
                    {formatNumberCommas(
                      Number(custody.assets.owned) / 10 ** custody.decimals,
                    )}
                  </td>
                  <td>
                    {formatNumberCommas(
                      custody.assets.owned !== BigInt(0)
                        ? 100 *
                            (Number(custody.assets.locked) /
                              Number(custody.assets.owned))
                        : 0,
                    )}
                    %
                  </td>
                  <td>
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`${ACCOUNT_URL(custody.address.toString())}`}
                    >
                      <NewTab />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
