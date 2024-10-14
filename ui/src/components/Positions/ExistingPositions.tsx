"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { twMerge } from "tailwind-merge";

import { NoPositions } from "@/components/Positions/NoPositions";
import PoolPositionRow from "@/components/Positions/PoolPositionRow";
import { useGlobalStore } from "@/stores/store";
import { countDictList, getPoolSortedPositions } from "@/utils/organizers";

import { PoolTokens } from "../PoolTokens";
import { PositionColumn } from "./PositionColumn";

interface Props {
  className?: string;
}

export function ExistingPositions(props: Props) {
  const { publicKey } = useWallet();

  const positionData = useGlobalStore((state) => state.positionData);
  const poolData = useGlobalStore((state) => state.poolData);

  let allPositions;

  if (publicKey) {
    allPositions = getPoolSortedPositions(positionData, publicKey);
  } else {
    allPositions = getPoolSortedPositions(positionData);
  }

  if (countDictList(allPositions) === 0) {
    return <NoPositions emptyString="No Open Positions" />;
  }

  return (
    <>
      {Object.entries(allPositions).map(([pool, positions]) => {
        if (positions.length === 0) {
          return <p>No Positions</p>;
        }
        const allTokens = positions.map((position) => {
          return position.token;
        });

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
                    {poolData[positions[0]!.pool.toString()]?.name}
                  </div>
                </div>
              </PositionColumn>
              <PositionColumn num={2}>Leverage</PositionColumn>
              <PositionColumn num={3}>Net Value</PositionColumn>
              <PositionColumn num={4}>Collateral</PositionColumn>
              <PositionColumn num={5}>Entry Price</PositionColumn>
              <PositionColumn num={6}>Mark Price</PositionColumn>
              <PositionColumn num={7}>Liq. Price</PositionColumn>
            </div>
            {positions.map((position, index) => (
              // eslint-disable-next-line react/jsx-no-undef
              <PoolPositionRow
                className={twMerge(
                  "border-zinc-700",
                  index < positions.length - 1 && "border-b",
                )}
                position={position}
                key={index}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
