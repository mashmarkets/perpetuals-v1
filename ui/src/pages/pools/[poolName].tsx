"use client";

import { useRouter } from "next/router";

import PoolBackButton from "@/components/Atoms/PoolBackButton";
import { LoadingSpinner } from "@/components/Icons/LoadingSpinner";
import { PoolLayout } from "@/components/Layouts/PoolLayout";
import { TitleHeader } from "@/components/Molecules/PoolHeaders/TitleHeader";
import LiquidityCard from "@/components/PoolModal/LiquidityCard";
import PoolGeneralStats from "@/components/PoolModal/PoolGeneralStats";
import PoolTokenStats from "@/components/PoolModal/PoolTokenStats";
import { useGlobalStore } from "@/stores/store";
import Link from "next/link";

export default function SinglePool() {
  const router = useRouter();

  const poolData = useGlobalStore((state) => state.poolData);
  let pool = poolData[router.query.poolName as string];

  if (!pool) {
    return <LoadingSpinner className="text-4xl" />;
  } else {
    return (
      <PoolLayout className="text-white">
        <div>
          <PoolBackButton className="mb-6" />
          <div className="flex align-center justify-start mb-8">

          <TitleHeader
            pool={pool!}
            iconClassName="w-10 h-10"
            // className="mb-8"
          />
          <Link href="/pools/manage/[poolAddress]" as={`/pools/manage/${router.query.poolName}`}>
            <div className="text-slate-200 px-4 py-2 rounded-lg text-white">
              Admin ↗️
            </div>
          </Link>
          </div>
        </div>
        <div className="flex w-full flex-col">
          <PoolGeneralStats pool={pool!} className="mb-8" />
          <PoolTokenStats pool={pool!} />
        </div>
        <LiquidityCard pool={pool} />
      </PoolLayout>
    );
  }
}
