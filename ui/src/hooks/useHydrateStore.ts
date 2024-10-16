import { useEffect } from "react";

import { useGlobalStore } from "@/stores/store";

import { getCustodyData } from "./storeHelpers/fetchCustodies";
import { getPoolData } from "./storeHelpers/fetchPools";
import { getPositionData } from "./storeHelpers/fetchPositions";

export const useHydrateStore = () => {
  const setCustodyData = useGlobalStore((state) => state.setCustodyData);
  const setPoolData = useGlobalStore((state) => state.setPoolData);
  const setPositionData = useGlobalStore((state) => state.setPositionData);

  useEffect(() => {
    (async () => {
      const custodyData = await getCustodyData();
      const poolData = await getPoolData(custodyData);
      const positionInfos = await getPositionData(custodyData);

      setCustodyData(custodyData);
      setPoolData(poolData);
      setPositionData(positionInfos);
    })();
  }, []);
};
