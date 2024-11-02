import ChevronDownIcon from "@carbon/icons-react/lib/ChevronDown";
import ChevronUpIcon from "@carbon/icons-react/lib/ChevronUp";
import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

import { CompetitionClaim } from "@/components/CompetitionClaim";
import { usePrizePool } from "@/hooks/competition";
import {
  useAllPositions,
  useCustodies,
  usePositions,
} from "@/hooks/perpetuals";
import { usePrices } from "@/hooks/price";
import { useAllMintHolders, useBalances } from "@/hooks/token";
import { getTokenInfo, getTokenSymbol, USDC_MINT } from "@/lib/Token";
import { PRICE_POWER, USD_POWER } from "@/lib/types";
import { formatNumber, formatPrice } from "@/utils/formatters";
import { ACCOUNT_URL } from "@/utils/TransactionHandlers";
import { dedupe } from "@/utils/utils";

const useLeaderboardData = () => {
  const { data: positionsMapping } = useAllPositions();
  const { data: holders } = useAllMintHolders(USDC_MINT);

  const users = dedupe([
    ...(holders ?? []),
    ...Object.keys(positionsMapping ?? {}),
  ]) as Address[];

  const balances = useBalances(USDC_MINT, users);
  const allPositions = usePositions(
    Object.values(positionsMapping ?? {}).flat(),
  );
  const custodies = useCustodies(
    Object.values(allPositions ?? {}).map((x) => x.custody),
  );
  const prices = usePrices(Object.values(custodies ?? {}).map((x) => x.mint));

  return users
    .map((user) => {
      const balance = balances[user] ?? BigInt(0);
      const positions = (positionsMapping?.[user] ?? []).map((address) => {
        const p = allPositions[address];
        const c = custodies[p.custody];

        const mark =
          c && prices[c.mint]
            ? BigInt(Math.round(prices[c.mint].currentPrice * USD_POWER))
            : BigInt(0);

        // TODO:- Need to incorporate borrow fees
        const pnl = (p.sizeUsd * (mark - p.price)) / p.price;

        return {
          mint: c?.mint,
          sizeUsd: p.sizeUsd,
          price: p.price,
          mark,
          pnl: pnl,
          netValue: p.collateralUsd + pnl,
        };
      });

      const equityFromPositions =
        positions.reduce((acc, x) => acc + x.netValue, BigInt(0)) /
        BigInt(10 ** 3);

      return {
        user,
        balance,
        equity: balance + equityFromPositions,
        equityFromPositions,
        positions: positions,
      };
    })
    .sort((a, b) => Number(b.equity) - Number(a.equity));
};
export default function Leaderboard() {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const { publicKey } = useWallet();
  const leaderboard = useLeaderboardData();
  const { data: prize } = usePrizePool();

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const { symbol, decimals } = getTokenInfo(USDC_MINT);
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
      <p className="text-lg font-bold text-gray-200">
        Prize Pool:
        {(Number(prize) / 10 ** 9).toFixed(2)} SOL
      </p>

      <div className="mx-auto max-w-lg py-6">
        <CompetitionClaim />
      </div>
      <div className="shadow">
        {leaderboard.map(
          ({ user, balance, equity, positions, equityFromPositions }, i) => (
            <div
              key={user}
              className={twMerge(
                "border-b-black bg-zinc-800 text-white",
                publicKey !== null &&
                  user === publicKey.toString() &&
                  "bg-blue-400",
              )}
            >
              <div
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() => toggleUser(user)}
              >
                <div className="mr-4 flex flex-1 items-center justify-between">
                  <p className="">
                    <span className="font-medium text-gray-600">
                      {i + 1}
                      {". "}
                    </span>
                    <a href={ACCOUNT_URL(user)} target="_blank">
                      {`${user.slice(0, 4)}...${user.slice(-4)}`}
                    </a>
                  </p>
                  <span className="text-gray-600">
                    {formatNumber(Number(equity) / 10 ** decimals)} {symbol}
                  </span>
                </div>
                {expandedUsers.has(user) ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {expandedUsers.has(user) && (
                <div className="bg-zinc-900 p-4 pr-12">
                  <div className="mb-4 flex justify-between">
                    <h3 className="mb-1 font-medium">Spot</h3>
                    <div className="text-right text-gray-600">
                      {formatNumber(Number(balance) / 10 ** decimals)} {symbol}
                    </div>
                  </div>
                  {positions.length > 0 && (
                    <>
                      <div className="mb-4 flex justify-between">
                        <h3 className="mb-1 font-medium">Positions</h3>
                        <div className="text-right text-gray-600">
                          {formatNumber(
                            Number(equityFromPositions) / 10 ** decimals,
                          )}{" "}
                          {symbol}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {positions.map((position, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              <a
                                href={ACCOUNT_URL(position.mint)}
                                target="_blank"
                              >
                                {getTokenSymbol(position.mint)}
                              </a>
                            </span>
                            <div className="space-x-4">
                              <span>
                                <span>Entry/</span>
                                <span className="text-gray-600">Mark: </span>
                                <span className="text-white">
                                  {formatPrice(
                                    Number(position.price) / PRICE_POWER,
                                  )}
                                </span>
                                <span className="text-gray-600">
                                  {"/"}
                                  {formatPrice(
                                    Number(position.mark) / PRICE_POWER,
                                  )}
                                </span>
                              </span>
                              <span>
                                Size: $
                                {formatNumber(
                                  Number(position.sizeUsd) / USD_POWER,
                                )}
                              </span>
                              <span
                                className={
                                  position.pnl >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                PnL: $
                                {formatNumber(Number(position.pnl) / USD_POWER)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
