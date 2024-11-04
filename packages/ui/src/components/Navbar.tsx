import ChartCandlestickIcon from "@carbon/icons-react/lib/ChartCandlestick";
import UserAdmin from "@carbon/icons-react/lib/UserAdmin";
import { Address } from "@solana/addresses";
import { NATIVE_MINT } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

import { useEpochCountdown, usePrizePool } from "@/hooks/competition";
import { useBalance } from "@/hooks/token";
import { getCurrentEpoch, getTokenIcon, USDC_MINT } from "@/lib/Token";
import { formatNumber } from "@/utils/formatters";

import AirdropButton from "./AirdropButton";
import { BuyInModal } from "./CompetitionEnter";

function NavbarLink(
  props: {
    href: string;
    icon: JSX.Element;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>,
) {
  const router = useRouter();

  const currentPath = router.pathname;
  const selected = currentPath.startsWith(props.href);

  return (
    <Link
      href={props.href}
      className={twMerge(
        "font-medium",
        "flex",
        "h-full",
        "items-center",
        "px-6",
        "text-sm",
        "text-gray-500",
        "transition-colors",
        "active:text-gray-200",
        "hover:text-white",
        selected && "text-white",
        selected && "border-b-2",
        selected && "border-blue-400",
      )}
    >
      <div className="hidden md:block">{props.children}</div>
      {cloneElement(props.icon, {
        className: twMerge(
          props.icon.props.className,
          "block",
          "fill-current",
          "h-4",
          "w-4",
          "md:hidden",
        ),
      })}
    </Link>
  );
}

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

export const Navbar = () => {
  const { publicKey } = useWallet();
  const countdown = useEpochCountdown();
  const { data: prize } = usePrizePool(getCurrentEpoch());

  const { data: usdc } = useBalance(USDC_MINT, publicKey);
  const { data: sol } = useBalance(
    NATIVE_MINT.toString() as Address,
    publicKey,
  );

  return (
    <nav
      className={twMerge(
        "bg-zinc-900",
        "fixed",
        "flex",
        "h-14",
        "justify-between",
        "items-center",
        "left-0",
        "px-4",
        "right-0",
        "top-0",
        "z-20",
      )}
    >
      <div className="flex h-full flex-row items-center space-x-2">
        <Link
          className="hidden items-center space-x-2 pr-4 text-xl font-bold text-blue-400 md:flex"
          href="/"
        >
          <h1 className="bg-white bg-[radial-gradient(100%_100%_at_top_left,rgb(255,255,255),rgb(255,255,255),rgb(6,182,212,.5))] bg-clip-text text-2xl font-semibold tracking-tighter text-transparent md:leading-none">
            Mash Markets
          </h1>
        </Link>
        <NavbarLink href="/trade" icon={<ChartCandlestickIcon />}>
          Trade
        </NavbarLink>
        {/* <NavbarLink href="/pools" icon={<StoragePoolIcon />}>
          Pools
        </NavbarLink>
        <NavbarLink href="/list" icon={<UserAdmin />}>
          List
        </NavbarLink> */}
        {/* <NavbarLink href="/positions" icon={<UserAdmin />}>
          My Positions
        </NavbarLink> */}
        <NavbarLink href="/leaderboard" icon={<UserAdmin />}>
          Leaderboard
        </NavbarLink>
      </div>
      <div className="flex h-full items-center space-x-2">
        <span className="text-sm text-gray-400">Ends in: </span>
        <p className="text-white" suppressHydrationWarning>
          {countdown} •{" "}
        </p>
        <p className="text-white">
          {(Number(prize ?? 0) / 10 ** 9).toFixed(2)} SOL
        </p>
        <span className="text-sm text-gray-400"> Prize Pool</span>
      </div>
      <div className="flex flex-row items-center gap-4">
        {publicKey &&
          (sol !== undefined && sol === BigInt(0) ? (
            <AirdropButton mint={NATIVE_MINT.toString() as Address} />
          ) : (
            <BuyInModal>
              <button className="flex flex-row gap-2 rounded-md px-4 py-2 text-blue-400">
                Buy in
                {usdc !== undefined && usdc > BigInt(0) && (
                  <p className="gap flex items-center gap-2 pr-2 text-blue-400">
                    {getTokenIcon(USDC_MINT)}
                    {formatNumber(Number(usdc) / 10 ** 6)}
                  </p>
                )}
              </button>
            </BuyInModal>
          ))}
        <WalletMultiButtonDynamic />
      </div>
    </nav>
  );
};
