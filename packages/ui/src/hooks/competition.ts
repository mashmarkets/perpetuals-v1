import { Address } from "@solana/addresses";
import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

import { findFaucetAddressSync } from "@/actions/faucet";
import { EPOCH } from "@/lib/Token";

import { useBalance } from "./token";

function parseFutureDate(futureDate: Date) {
  const now = Date.now();
  const future = futureDate.getTime();

  // Ensure the future date is indeed in the future
  if (future <= now) {
    return "Ended";
  }

  let delta = Math.floor((future - now) / 1000);

  const days = Math.floor(delta / (24 * 3600));
  delta = delta % (24 * 3600);

  const hours = Math.floor(delta / 3600);
  delta = delta % 3600;

  const minutes = Math.floor(delta / 60);
  const seconds = delta % 60;

  // Format each unit with leading zeros if needed
  const h = String(hours).padStart(2, "0");
  const m = String(minutes).padStart(2, "0");
  const s = String(seconds).padStart(2, "0");

  return `${days}D ${h}:${m}:${s}`;
}

const epoch = new Date(1730527200000);
export const useEpochCountdown = () => {
  const [counter, setCounter] = useState(parseFutureDate(epoch));
  useEffect(() => {
    const id = setInterval(() => {
      setCounter(parseFutureDate(epoch));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return counter;
};

export const usePrizePool = () => {
  const tokenAccount = findFaucetAddressSync(
    "vault",
    NATIVE_MINT,
    Number(EPOCH),
  );
  return useBalance(
    NATIVE_MINT.toString() as Address,
    new PublicKey(tokenAccount),
  );
};
