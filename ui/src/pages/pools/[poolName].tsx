"use client";

import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { useRouter } from "next/router";

import { LoadingSpinner } from "@/components/Atoms/LoadingSpinner";
import PoolBackButton from "@/components/Atoms/PoolBackButton";
import { PoolLayout } from "@/components/Layouts/PoolLayout";
import { TitleHeader } from "@/components/Molecules/PoolHeaders/TitleHeader";
import LiquidityCard from "@/components/PoolModal/LiquidityCard";
import PoolGeneralStats from "@/components/PoolModal/PoolGeneralStats";
import PoolTokenStats from "@/components/PoolModal/PoolTokenStats";
import { useGlobalStore } from "@/stores/store";

export default function SinglePool() {
  const router = useRouter();

  const poolKey = router.query.poolName as string;
  const poolData = useGlobalStore((state) => state.poolData);
  let pool = poolData[poolKey];

  if (!pool) {
    return <LoadingSpinner className="text-4xl" />;
  } else {
    return (
      <PoolLayout className="text-white">
        <div>
          <PoolBackButton className="mb-6" />
          <div className="align-center mb-8 flex justify-start">
            <TitleHeader
              pool={pool!}
              iconClassName="w-10 h-10"
              // className="mb-8"
            />
            <Link
              href="/pools/manage/[poolAddress]"
              as={`/pools/manage/${poolKey}`}
            >
              <div className="rounded-lg px-4 py-2 text-slate-200 text-white">
                Admin ↗️
              </div>
            </Link>
          </div>
        </div>
        <div className="flex w-full flex-col">
          <PoolGeneralStats poolKey={new PublicKey(poolKey)} className="mb-8" />
          <PoolTokenStats pool={pool!} poolKey={new PublicKey(poolKey)} />
        </div>
        <LiquidityCard pool={pool} poolKey={new PublicKey(poolKey)} />
      </PoolLayout>
    );
  }
}
