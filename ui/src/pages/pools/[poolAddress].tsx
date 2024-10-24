"use client";

import { ChevronLeft } from "@carbon/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";

import { TitleHeader } from "@/components/Molecules/PoolHeaders/TitleHeader";
import LiquidityCard from "@/components/PoolModal/LiquidityCard";
import PoolGeneralStats from "@/components/PoolModal/PoolGeneralStats";
import PoolTokenStats from "@/components/PoolModal/PoolTokenStats";
import { safeAddress } from "@/utils/utils";

export default function SinglePool() {
  const router = useRouter();

  const poolAddress = safeAddress(router.query.poolAddress);

  if (poolAddress === undefined) {
    return <p className="2xl text-white">Invalid pool address</p>;
  }

  return (
    <div className="mx-auto mt-7 flex max-w-screen-2xl flex-col px-4 text-white lg:px-16">
      <div>
        <div
          className="mb-6 flex cursor-pointer items-center space-x-1.5"
          onClick={() => router.push("/pools")}
        >
          <ChevronLeft className="h-4 w-4 fill-zinc-500" />

          <p className="text-sm font-medium text-zinc-500">Back To Pools</p>
        </div>
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

      <div className="w-full max-w-[1550px] lg:grid lg:grid-cols-[1fr,424px] lg:gap-x-16">
        <div className="flex w-full flex-col">
          <PoolGeneralStats poolAddress={poolAddress} className="mb-8" />
          <PoolTokenStats poolAddress={poolAddress} />
        </div>
        <LiquidityCard poolAddress={poolAddress} />
      </div>
    </div>
  );
}
