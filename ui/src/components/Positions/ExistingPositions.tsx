"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { twMerge } from "tailwind-merge";

import { NoPositions } from "@/components/Positions/NoPositions";
import PoolPositionRow from "@/components/Positions/PoolPositionRow";
import {
  Position,
  useAllUserPositions,
  useCustodies,
  usePools,
  usePositions,
} from "@/hooks/perpetuals";
import { asToken } from "@/lib/Token";
import { dedupe } from "@/utils/utils";

import { LoadingSpinner } from "../Atoms/LoadingSpinner";
import { PoolTokens } from "../PoolTokens";
import { PositionColumn } from "./PositionColumn";

const groupPositionsByPool = (positions: Position[]) => {
  return positions.reduce(
    (acc, pos) => {
      const key = pos.pool.toString();
      acc[key] = acc[key] ?? [];
      acc[key]!.push(pos);
      return acc;
    },
    {} as Record<string, Position[]>,
  );
};

export function ExistingPositions() {
  const { publicKey } = useWallet();

  const { data: allPositions } = useAllUserPositions(publicKey);
  const positions = usePositions(allPositions ?? []);

  const custodies = useCustodies(
    dedupe(Object.values(positions ?? {}).flatMap((x) => x.custody)),
  );
  const pools = usePools(
    dedupe(Object.values(positions ?? {}).map((x) => x.pool)),
  );

  if (positions === undefined) {
    return <LoadingSpinner className="text-4xl" />;
  }

  if (Object.values(positions ?? {}).length === 0) {
    return <NoPositions emptyString="No Open Positions" />;
  }

  const groupedPositions = groupPositionsByPool(Object.values(positions ?? {}));
  return (
    <>
      {Object.entries(groupedPositions).map(([pool, positions]) => {
        if (positions.length === 0) {
          return <p key={pool}>No Positions</p>;
        }
        const allTokens = positions
          .map((position) => {
            const custody = custodies[position.custody.toString()];
            return custody ? asToken(custody.mint) : undefined;
          })
          .filter((x) => x !== undefined);

        const tokens = Array.from(new Set(allTokens));

        return (
          <div className="mb-4" key={pool}>
            <div
              className={twMerge(
                "border-b",
                "border-zinc-700",
                "flex",
                "items-center",
                "text-xs",
                "text-zinc-500",
              )}
            >
              {/* We cannot use a real grid layout here since we have nested grids.
                Instead, we're going to fake a grid by assinging column widths to
                percentages. */}
              <PositionColumn num={1}>
                <div className="flex max-w-fit items-center rounded-t bg-zinc-800 px-2 py-1.5">
                  <PoolTokens tokens={tokens} />
                  <div className="ml-1 text-sm font-medium text-white">
                    {pools[pool]?.name ?? ""}
                  </div>
                </div>
              </PositionColumn>
              <PositionColumn num={2}>Leverage</PositionColumn>
              <PositionColumn num={3}>Net Value</PositionColumn>
              <PositionColumn num={4}>Size</PositionColumn>
              <PositionColumn num={5}>Collateral</PositionColumn>
              <PositionColumn num={6}>Entry/Mark Price</PositionColumn>
              <PositionColumn num={7}>Liq. Price</PositionColumn>
            </div>
            {positions.map((position, index) => (
              <PoolPositionRow
                className={twMerge(
                  "border-zinc-700",
                  index < positions.length - 1 && "border-b",
                )}
                positionAddress={position.address}
                key={position.address.toString()}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
