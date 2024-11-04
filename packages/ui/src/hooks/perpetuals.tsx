import { BN, IdlAccounts, ProgramAccount } from "@coral-xyz/anchor";
import { Address } from "@solana/addresses";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getAddLiquidityAmountAndFee,
  getAssetsUnderManagement,
  getLiquidationPrice,
  getPnl,
  getRemoveLiquidityAmountAndFee,
} from "@/actions/perpetuals";
import { Perpetuals } from "@/target/perpetuals";
import { queryClient } from "@/utils/queryClient";

import { connectionBatcher } from "./accounts";
import {
  useReadPerpetualsProgram,
  useWritePerpetualsProgram,
} from "./useProgram";

const fromBN = (v: BN) => BigInt(v.toString());

const parsePool = (data: ProgramAccount<IdlAccounts<Perpetuals>["pool"]>) => {
  const p = data.account;
  return {
    address: data.publicKey.toString() as Address,
    aumUsd: fromBN(p.aumUsd),
    bump: p.bump,
    custodies: p.custodies.map((x) => x.toString() as Address),
    inceptionTime: new Date(p.inceptionTime.toNumber() * 1000),
    lpTokenBump: p.lpTokenBump,
    name: p.name,
  };
};

const parsePosition = (
  data: ProgramAccount<IdlAccounts<Perpetuals>["position"]>,
) => {
  const p = data.account;
  return {
    address: data.publicKey.toString() as Address,
    borrowSizeUsd: fromBN(p.borrowSizeUsd),
    bump: p.bump,
    collateralAmount: fromBN(p.collateralUsd),
    collateralUsd: fromBN(p.collateralUsd),
    cumulativeInterestSnapshot: fromBN(p.cumulativeInterestSnapshot),
    custody: p.custody.toString() as Address,
    lockedAmount: fromBN(p.lockedAmount),
    openTime: new Date(p.openTime.toNumber() * 1000),
    owner: p.owner.toString() as Address,
    pool: p.pool.toString() as Address,
    price: fromBN(p.price),
    sizeUsd: fromBN(p.sizeUsd),
    unrealizedLossUsd: fromBN(p.unrealizedLossUsd),
    unrealizedProfitUsd: fromBN(p.unrealizedProfitUsd),
    updateTime: new Date(p.openTime.toNumber() * 1000),
  };
};

const parseCustody = (
  data: ProgramAccount<IdlAccounts<Perpetuals>["custody"]>,
) => {
  const c = data.account;
  return {
    address: data.publicKey.toString() as Address,
    bump: c.bump,
    decimals: c.decimals,
    mint: c.mint.toString() as Address,
    pool: c.pool.toString() as Address,
    tokenAccount: c.tokenAccount.toString() as Address,
    tokenAccountBump: c.tokenAccountBump.toString() as Address,
    assets: {
      collateral: fromBN(c.assets.collateral),
      locked: fromBN(c.assets.locked),
      owned: fromBN(c.assets.owned),
      protocolFees: fromBN(c.assets.protocolFees),
    },
    borrowRate: {
      baseRate: fromBN(c.borrowRate.baseRate),
      optimalUtilization: fromBN(c.borrowRate.optimalUtilization),
      slope1: fromBN(c.borrowRate.slope1),
      slope2: fromBN(c.borrowRate.slope2),
    },
    borrowRateState: {
      cumulativeInterest: fromBN(c.borrowRateState.cumulativeInterest),
      currentRate: fromBN(c.borrowRateState.currentRate),
      lastUpdate: new Date(c.borrowRateState.lastUpdate.toNumber() * 1000),
    },
    collectedFees: {
      addLiquidityUsd: fromBN(c.collectedFees.addLiquidityUsd),
      closePositionUsd: fromBN(c.collectedFees.closePositionUsd),
      liquidationUsd: fromBN(c.collectedFees.liquidationUsd),
      openPositionUsd: fromBN(c.collectedFees.openPositionUsd),
      removeLiquidityUsd: fromBN(c.collectedFees.removeLiquidityUsd),
    },
    fees: {
      addLiquidity: fromBN(c.fees.addLiquidity),
      closePosition: fromBN(c.fees.closePosition),
      liquidation: fromBN(c.fees.liquidation),
      openPosition: fromBN(c.fees.openPosition),
      protocolShare: fromBN(c.fees.protocolShare),
      removeLiquidity: fromBN(c.fees.removeLiquidity),
      utilizationMult: fromBN(c.fees.utilizationMult),
    },
    longPositions: {
      borrowSizeUsd: fromBN(c.longPositions.borrowSizeUsd),
      collateralUsd: fromBN(c.longPositions.collateralUsd),
      cumulativeInterestSnapshot: fromBN(
        c.longPositions.cumulativeInterestSnapshot,
      ),
      cumulativeInterestUsd: fromBN(c.longPositions.cumulativeInterestUsd),
      lockedAmount: fromBN(c.longPositions.lockedAmount),
      openPositions: fromBN(c.longPositions.openPositions),
      sizeUsd: fromBN(c.longPositions.sizeUsd),
      totalQuantity: fromBN(c.longPositions.totalQuantity),
      weightedPrice: fromBN(c.longPositions.weightedPrice),
    },
    oracle: {
      maxPriceAgeSec: c.oracle.maxPriceAgeSec,
      maxPriceError: fromBN(c.oracle.maxPriceError),
      oracleAccount: c.oracle.oracleAccount.toString() as Address,
      oracleAuthority: c.oracle.oracleAuthority.toString() as Address,
      oracleType: c.oracle.oracleType, // TODO: - Convert to "ENUM"
    },
    permissions: {
      allowAddLiquidity: c.permissions.allowAddLiquidity,
      allowClosePosition: c.permissions.allowClosePosition,
      allowCollateralWithdrawal: c.permissions.allowCollateralWithdrawal,
      allowOpenPosition: c.permissions.allowOpenPosition,
      allowPnlWithdrawal: c.permissions.allowPnlWithdrawal,
      allowRemoveLiquidity: c.permissions.allowRemoveLiquidity,
      allowSizeChange: c.permissions.allowSizeChange,
    },
    pricing: {
      maxInitialLeverage: fromBN(c.pricing.maxInitialLeverage),
      maxLeverage: fromBN(c.pricing.maxLeverage),
      maxPayoffMult: fromBN(c.pricing.maxPayoffMult),
      maxPositionLockedUsd: fromBN(c.pricing.maxPositionLockedUsd),
      maxTotalLockedUsd: fromBN(c.pricing.maxTotalLockedUsd),
      maxUtilization: fromBN(c.pricing.maxUtilization),
      minInitialLeverage: fromBN(c.pricing.minInitialLeverage),
      tradeSpreadLong: fromBN(c.pricing.tradeSpreadLong),
      tradeSpreadShort: fromBN(c.pricing.tradeSpreadShort),
      useEma: c.pricing.useEma,
      useUnrealizedPnlInAum: c.pricing.useUnrealizedPnlInAum,
    },
    tradeStats: {
      lossUsd: fromBN(c.tradeStats.lossUsd),
      oiLongUsd: fromBN(c.tradeStats.oiLongUsd),
      profitUsd: fromBN(c.tradeStats.profitUsd),
    },
    volumeStats: {
      addLiquidityUsd: fromBN(c.volumeStats.addLiquidityUsd),
      closePositionUsd: fromBN(c.volumeStats.closePositionUsd),
      liquidationUsd: fromBN(c.volumeStats.liquidationUsd),
      openPositionUsd: fromBN(c.volumeStats.openPositionUsd),
      removeLiquidityUsd: fromBN(c.volumeStats.removeLiquidityUsd),
    },
  };
};

// TODO:- Query Functions can't return undefined, so when account data is null, we cannot return undefined.
// So everything needs to null checked (like usePool)

export type Pool = ReturnType<typeof parsePool>;
export type Custody = ReturnType<typeof parseCustody>;
export type Position = ReturnType<typeof parsePosition>;

const ONE_MINUTE = 60 * 1000;
queryClient.setQueryDefaults(["pool"], {
  refetchInterval: ONE_MINUTE, // 1 MINUTE
});
queryClient.setQueryDefaults(["custody"], {
  refetchInterval: ONE_MINUTE, // 1 MINUTE
});
queryClient.setQueryDefaults(["position"], {
  refetchInterval: ONE_MINUTE, // 1 MINUTE
});

export const usePool = (pool: Address | undefined) => {
  const { connection } = useConnection();
  const program = useReadPerpetualsProgram();

  return useQuery<Pool | null>({
    queryKey: ["pool", pool],
    enabled: !!program && !!pool,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(pool!)
        .then((info) => {
          if (info === null) {
            return null;
          }
          const coder = program!.account.pool.coder;
          return parsePool({
            publicKey: new PublicKey(pool!),
            account: coder.accounts.decode("pool", info!.data!),
          });
        }) as Promise<Pool>,
  });
};

export const usePools = (pools: Address[]) => {
  const { connection } = useConnection();
  const program = useReadPerpetualsProgram();
  return useQueries({
    queries: pools.map((pool) => ({
      queryKey: ["pool", pool],
      enabled: !!program,
      queryFn: () =>
        connectionBatcher(connection)
          .fetch(pool)
          .then((info) => {
            const coder = program!.account.pool.coder;
            return parsePool({
              publicKey: new PublicKey(pool!),
              account: coder.accounts.decode("pool", info!.data!),
            });
          }) as Promise<Pool>,
    })),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          if (v.data === undefined) {
            return acc;
          }
          acc[pools[i]!.toString()] = v.data!;
          return acc;
        },
        {} as Record<string, Pool>,
      );
    },
  });
};

const useAllPoolsAddress = () => {
  const program = useReadPerpetualsProgram();
  const client = useQueryClient();
  return useQuery<Address[]>({
    queryKey: ["pools"],
    enabled: !!program,
    refetchInterval: 5 * ONE_MINUTE,
    queryFn: async () => {
      const data = await program!.account.pool.all();
      const pools = data.map(parsePool);

      // Update individual pool cache
      pools.forEach((pool) => {
        client.setQueryData(["pool", pool.address.toString()], pool);
      });
      return pools.map((p) => p.address);
    },
  });
};

export const useAllPools = () => {
  // Do it this way, so we can optimistically add pools to the query cache to fetch it
  const list = useAllPoolsAddress();
  return usePools(list.data ?? []);
};

export const useCustody = (custody: Address | undefined) => {
  const { connection } = useConnection();
  const program = useReadPerpetualsProgram();

  return useQuery({
    queryKey: ["custody", custody?.toString()],
    enabled: !!program && !!custody,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(custody!)
        .then((info) => {
          const coder = program!.account.custody.coder;
          return parseCustody({
            publicKey: new PublicKey(custody!),
            account: coder.accounts.decode("custody", info!.data!),
          });
        }) as Promise<Custody>,
  });
};
// Inspired by https://github.com/TanStack/query/discussions/6305
export const useCustodies = (custodies: Address[]) => {
  const { connection } = useConnection();
  const program = useReadPerpetualsProgram();

  return useQueries({
    queries: custodies.map((custody) => ({
      queryKey: ["custody", custody.toString()],
      enabled: !!program,
      queryFn: () =>
        connectionBatcher(connection)
          .fetch(custody)
          .then((info) => {
            const coder = program!.account.custody.coder;
            return parseCustody({
              publicKey: new PublicKey(custody!),
              account: coder.accounts.decode("custody", info!.data!),
            });
          }) as Promise<Custody>,
    })),
    combine: (results) => {
      return results.reduce(
        (acc, v) => {
          if (v.data === undefined) {
            return acc;
          }
          acc[v.data.address] = v.data!;
          return acc;
        },
        {} as Record<string, Custody>,
      );
    },
  });
};

export const usePoolCustodies = (poolKey: Address | undefined) => {
  const { connection } = useConnection();
  const program = useReadPerpetualsProgram();
  const pool = usePool(poolKey);

  const custodies = pool?.data?.custodies ?? [];

  return useQueries({
    queries: custodies.map((custody) => ({
      queryKey: ["custody", custody.toString()],
      enabled: !!program || pool.data !== undefined,
      queryFn: () =>
        connectionBatcher(connection)
          .fetch(custody)
          .then((info) => {
            const coder = program!.account.custody.coder;
            return parseCustody({
              publicKey: new PublicKey(custody!),
              account: coder.accounts.decode("custody", info!.data!),
            });
          }) as Promise<Custody>,
    })),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          if (v.data === undefined) {
            return acc;
          }
          acc[custodies[i]!.toString()] = v.data!;
          return acc;
        },
        {} as Record<string, Custody>,
      );
    },
  });
};

export const usePosition = (position: Address | undefined) => {
  const { connection } = useConnection();
  const program = useReadPerpetualsProgram();

  return useQuery({
    queryKey: ["position", position?.toString()],
    enabled: !!program && position !== undefined,
    queryFn: () =>
      connectionBatcher(connection)
        .fetch(position!)
        .then((info) => {
          if (info === null) {
            return null;
          }
          const coder = program!.account.position.coder;
          return parsePosition({
            publicKey: new PublicKey(position!),
            account: coder.accounts.decode("position", info?.data),
          });
        }) as Promise<Position>,
  });
};

export const usePositions = (positions: Address[]) => {
  const { connection } = useConnection();
  const program = useReadPerpetualsProgram();

  return useQueries({
    queries: positions.map((position) => ({
      queryKey: ["position", position.toString()],
      enabled: !!program,
      queryFn: () =>
        connectionBatcher(connection)
          .fetch(position)
          .then((info) => {
            if (info === null) {
              return null;
            }
            const coder = program!.account.position.coder;
            return parsePosition({
              publicKey: new PublicKey(position!),
              account: coder.accounts.decode("position", info!.data!),
            });
          }) as Promise<Position>,
    })),
    combine: (results) => {
      return results.reduce(
        (acc, v) => {
          if (v.data === undefined || v.data === null) {
            return acc;
          }
          acc[v.data.address] = v.data!;
          return acc;
        },
        {} as Record<string, Position>,
      );
    },
  });
};

export const useAllPositions = () => {
  const program = useReadPerpetualsProgram();
  const client = useQueryClient();
  return useQuery<Record<Address, Address[]>>({
    queryKey: ["positions"],
    enabled: !!program,
    queryFn: async () => {
      const data = await program!.account.position.all();
      const positions = data.map(parsePosition);

      // Update individual cache
      positions.forEach((position) => {
        client.setQueryData(
          ["position", position.address.toString()],
          position,
        );
      });

      const groupedPositions = positions.reduce(
        (acc, position) => {
          const key = position.owner.toString();
          acc[key] = acc[key] ?? [];
          acc[key].push(position.address);
          return acc;
        },
        {} as Record<string, Address[]>,
      );

      // Update positions cache
      Object.entries(groupedPositions).forEach(([key, positions]) => {
        client.setQueryData(["positions", key], positions);
      });

      return groupedPositions;
    },
  });
};

export const useAllUserPositions = (user: PublicKey | null) => {
  const program = useReadPerpetualsProgram();
  const client = useQueryClient();
  return useQuery<Address[]>({
    queryKey: ["positions", user?.toString()],
    enabled: !!program && user !== null && user !== undefined,
    refetchInterval: 2 * ONE_MINUTE,
    queryFn: async () => {
      const data = await program!.account.position.all();
      const positions = data.map(parsePosition);

      // Update individual cache
      positions.forEach((position) => {
        client.setQueryData(
          ["position", position.address.toString()],
          position,
        );
      });

      const groupedPositions = positions.reduce(
        (acc, position) => {
          const key = position.owner.toString();
          acc[key] = acc[key] ?? [];
          acc[key].push(position.address);
          return acc;
        },
        {} as Record<string, Address[]>,
      );

      // Update positions cache
      Object.entries(groupedPositions).forEach(([key, positions]) => {
        if (key === user?.toString()) {
          return;
        }
        client.setQueryData(["positions", key], positions);
      });

      const userKey = user?.toString();
      return userKey ? (groupedPositions[userKey] ?? []) : [];
    },
  });
};

export const useGetLiquidationPrice = ({
  position,
  addCollateral = BigInt(0),
  removeCollateral = BigInt(0),
}: {
  position: Position | undefined;
  addCollateral?: bigint;
  removeCollateral?: bigint;
}) => {
  const program = useWritePerpetualsProgram();
  const { data: custody } = useCustody(position?.custody);

  return useQuery({
    queryKey: [
      "getLiquidationPrice",
      position?.address.toString(),
      addCollateral?.toString(),
      removeCollateral?.toString(),
    ],
    enabled:
      program !== undefined &&
      position?.address !== undefined &&
      position?.address !== null &&
      custody !== undefined,

    queryFn: () =>
      getLiquidationPrice(program!, {
        position: position!,
        custody: custody!,
        addCollateral,
        removeCollateral,
      }),
  });
};

export const useGetPnl = (position: Position | undefined) => {
  const program = useWritePerpetualsProgram();
  const { data: custody } = useCustody(position?.custody);

  return useQuery({
    queryKey: ["getPnl", position?.address.toString()],
    refetchInterval: 5 * 1000,
    enabled: !!program && !!position && !!custody,
    queryFn: () => getPnl(program!, { position: position!, custody: custody! }),
  });
};

export const useGetAddLiquidityAmountAndFee = ({
  pool,
  amountIn,
}: {
  pool: Pick<Pool, "address" | "custodies"> | undefined | null;
  amountIn: bigint;
}) => {
  const program = useWritePerpetualsProgram();
  const { data: custody } = useCustody(pool?.custodies[0]);

  return useQuery({
    refetchInterval: 5 * 1000,
    queryKey: [
      "getAddLiquidityAmountAndFee",
      pool?.address.toString(),
      amountIn.toString(),
    ],
    enabled:
      !!program &&
      pool !== undefined &&
      custody !== undefined &&
      amountIn > BigInt(0),
    queryFn: () =>
      getAddLiquidityAmountAndFee(program!, {
        pool: pool!,
        custody: custody!,
        amountIn,
      }),
  });
};

export const useGetRemoveLiquidityAmountAndFee = ({
  pool,
  lpAmountIn,
}: {
  pool: Pick<Pool, "address" | "custodies"> | undefined | null;
  lpAmountIn: bigint;
}) => {
  const program = useWritePerpetualsProgram();
  const { data: custody } = useCustody(pool?.custodies[0]);

  return useQuery({
    refetchInterval: 5 * 1000,
    queryKey: [
      "getRemoveLiquidityAmountAndFee",
      pool?.address.toString(),
      lpAmountIn.toString(),
    ],
    enabled:
      !!program &&
      pool !== undefined &&
      custody !== undefined &&
      lpAmountIn > BigInt(0),
    queryFn: () =>
      getRemoveLiquidityAmountAndFee(program!, {
        pool: pool!,
        custody: custody!,
        lpAmountIn,
      }),
  });
};

queryClient.setQueryDefaults(["getGetAssetsUnderManagement"], {
  refetchInterval: 30 * 1000,
  staleTime: 5 * ONE_MINUTE,
});
export const useGetAssetsUnderManagement = (pool: Pool | undefined | null) => {
  const program = useWritePerpetualsProgram();
  const { data: custody } = useCustody(pool?.custodies[0]);

  return useQuery({
    queryKey: [
      "getGetAssetsUnderManagement",
      pool?.address.toString(),
      pool?.aumUsd.toString(), // Add aum so we force a refresh if account data changes
    ],
    enabled: !!program && !!pool && custody !== undefined,
    initialData: pool ? BigInt(pool?.aumUsd.toString()) : undefined,
    queryFn: () =>
      getAssetsUnderManagement(program!, {
        pool: pool!,
        custody: custody!,
      }),
  });
};

export const useMultipleGetAssetsUnderManagement = (pools: Pool[]) => {
  const program = useReadPerpetualsProgram();
  const custodies = useCustodies((pools ?? []).flatMap((x) => x.custodies));
  return useQueries({
    queries: pools.map((pool) => ({
      queryKey: [
        "getGetAssetsUnderManagement",
        pool.address.toString(),
        pool?.aumUsd.toString(),
      ],
      enabled: !!pool && !!program,
      initialData: pool ? BigInt(pool.aumUsd.toString()) : undefined,
      queryFn: () =>
        getAssetsUnderManagement(program!, {
          pool: pool!,
          custody: custodies[pool!.custodies[0].toString()]!,
        }),
    })),
    combine: (results) => {
      return results.reduce(
        (acc, v, i) => {
          acc[pools[i]!.address.toString()] = v.data!;
          return acc;
        },
        {} as Record<string, bigint>,
      );
    },
  });
};
