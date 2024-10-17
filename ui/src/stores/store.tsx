import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { PositionRequest } from "@/hooks/storeHelpers/fetchPositions";
import { CustodyAccount } from "@/lib/CustodyAccount";
import { PoolAccount } from "@/lib/PoolAccount";

interface StoreState {
  positionData: PositionRequest;
  setPositionData: (position: PositionRequest) => void;

  poolData: Record<string, PoolAccount>;
  setPoolData: (pool: Record<string, PoolAccount>) => void;

  custodyData: Record<string, CustodyAccount>;
  setCustodyData: (custody: Record<string, CustodyAccount>) => void;
}

export const useGlobalStore = create<StoreState>()(
  devtools((set, get) => ({
    devtools: false,

    positionData: {
      status: "pending",
    },
    setPositionData: (position: PositionRequest) =>
      set({ positionData: position }),

    poolData: {},
    setPoolData: (poolObjs: Record<string, PoolAccount>) =>
      set({ poolData: poolObjs }),

    custodyData: {},
    setCustodyData: (custody: Record<string, CustodyAccount>) =>
      set({ custodyData: custody }),
  })),
);
