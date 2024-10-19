"use client";

import Link from "next/link";
import { useRouter } from "next/router";

import PoolBackButton from "@/components/Atoms/PoolBackButton";
import { PoolLayout } from "@/components/Layouts/PoolLayout";
import { TitleHeader } from "@/components/Molecules/PoolHeaders/TitleHeader";
import LiquidityCard from "@/components/PoolModal/LiquidityCard";
import PoolGeneralStats from "@/components/PoolModal/PoolGeneralStats";
import PoolTokenStats from "@/components/PoolModal/PoolTokenStats";
import { safePublicKey } from "@/utils/utils";

export default function SinglePool() {
  const router = useRouter();

  const poolAddress = safePublicKey(router.query.poolAddress);

  if (poolAddress === undefined) {
    return <p className="2xl text-white">Invalid pool address</p>;
  }

  return (
    <PoolLayout className="text-white">
      <div>
        <PoolBackButton className="mb-6" />
        <div className="align-center mb-8 flex justify-start">
          <TitleHeader
            poolAddress={poolAddress!}
            iconClassName="w-10 h-10"
            // className="mb-8"
          />
          <Link href="/trade/[poolAddress]" as={`/trade/${poolAddress}`}>
            <div className="rounded-lg px-4 py-2 text-slate-200">Trade ↗</div>
          </Link>
        </div>
      </div>
      <div className="flex w-full flex-col">
        <PoolGeneralStats poolAddress={poolAddress} className="mb-8" />
        <PoolTokenStats poolAddress={poolAddress} />
      </div>
      <LiquidityCard poolAddress={poolAddress} />
    </PoolLayout>
  );
}
