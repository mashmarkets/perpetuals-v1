import { Address } from "@solana/addresses";
import { useWallet } from "@solana/wallet-adapter-react";

import { useBalance, useGetTokenInfo } from "@/hooks/token";

export function UserBalance({ mint }: { mint: Address }) {
  const { publicKey } = useWallet();
  const { getTokenInfo, getTokenSymbol } = useGetTokenInfo();
  const { decimals } = getTokenInfo(mint);

  const { data: balance } = useBalance(
    mint,
    publicKey === null ? undefined : publicKey,
  );
  if (!publicKey) {
    return (
      <div className="flex flex-row space-x-1 font-medium text-white hover:cursor-pointer">
        <p>Connect Wallet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-row space-x-1 font-medium text-white hover:cursor-pointer">
      <p>{balance ? (Number(balance) / 10 ** decimals).toFixed(4) : 0}</p>
      <p className="font-normal">{getTokenSymbol(mint)}</p>
      <p className="text-zinc-400"> Balance</p>
    </div>
  );
}
