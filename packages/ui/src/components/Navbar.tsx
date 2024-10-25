import ChartCandlestickIcon from "@carbon/icons-react/lib/ChartCandlestick";
import StoragePoolIcon from "@carbon/icons-react/lib/StoragePool";
import UserAdmin from "@carbon/icons-react/lib/UserAdmin";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

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
      <Link
        className="hidden items-center space-x-2 text-xl font-bold text-blue-400 md:flex"
        href="/"
      >
        <h1 className="bg-white bg-[radial-gradient(100%_100%_at_top_left,rgb(255,255,255),rgb(255,255,255),rgb(6,182,212,.5))] bg-clip-text text-2xl font-semibold tracking-tighter text-transparent md:leading-none">
          Mash Markets
        </h1>
      </Link>
      <div className="flex h-full items-center space-x-2">
        <NavbarLink href="/trade" icon={<ChartCandlestickIcon />}>
          Trade
        </NavbarLink>
        <NavbarLink href="/pools" icon={<StoragePoolIcon />}>
          Pools
        </NavbarLink>
        <NavbarLink href="/list" icon={<UserAdmin />}>
          List
        </NavbarLink>
        <NavbarLink href="/positions" icon={<UserAdmin />}>
          Positions
        </NavbarLink>
      </div>
      <div className="flex flex-row items-center">
        <WalletMultiButtonDynamic />
      </div>
    </nav>
  );
};
