import ChartCandlestickIcon from "@carbon/icons-react/lib/ChartCandlestick";
import StoragePoolIcon from "@carbon/icons-react/lib/StoragePool";
import UserAdmin from "@carbon/icons-react/lib/UserAdmin";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { cloneElement } from "react";
import { twMerge } from "tailwind-merge";

import { ADMIN_KEY, sendInstructions } from "@/actions/perpetuals";
import { useBalance } from "@/hooks/token";
import { useWriteFaucetProgram } from "@/hooks/useProgram";
import { getTokenIcon, USDC_MINT } from "@/lib/Token";
import { formatNumber } from "@/utils/formatters";
import { wrapTransactionWithNotification } from "@/utils/TransactionHandlers";

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
  const { data: balance } = useBalance(USDC_MINT, publicKey);
  const program = useWriteFaucetProgram();
  const queryClient = useQueryClient();
  const buyIn = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["balance", publicKey?.toString(), USDC_MINT],
      });
    },
    mutationFn: async () => {
      if (!program || !publicKey) {
        return;
      }
      const ataUser = getAssociatedTokenAddressSync(
        new PublicKey(USDC_MINT),
        publicKey,
      );
      const instructions = [
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: ADMIN_KEY.publicKey,
          lamports: 0.01 * LAMPORTS_PER_SOL,
        }),
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey, // payer
          ataUser, // associatedToken
          publicKey, // owner
          new PublicKey(USDC_MINT), // PublicKey
        ),
        createTransferInstruction(
          getAssociatedTokenAddressSync(
            new PublicKey(USDC_MINT),
            ADMIN_KEY.publicKey,
          ), // source
          ataUser, // destination
          ADMIN_KEY.publicKey, // owner
          10_000 * 10 ** 6, //amount
        ),
      ];
      return await wrapTransactionWithNotification(
        program.provider.connection,
        sendInstructions(program.provider, instructions, [ADMIN_KEY]),
      );
    },
  });

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
      <div className="flex flex-row items-center gap-4">
        {publicKey &&
          (balance && balance > BigInt(0) ? (
            <p className="gap flex items-center gap-2 pr-2 text-blue-400">
              {getTokenIcon(USDC_MINT)}
              {formatNumber(Number(balance) / 10 ** 6)}
            </p>
          ) : (
            <button
              onClick={() => buyIn.mutate()}
              disabled={buyIn.isPending}
              className="rounded-md px-4 py-2 text-lg font-bold text-blue-400"
            >
              Buy in
            </button>
          ))}
        <WalletMultiButtonDynamic />
      </div>
    </nav>
  );
};
