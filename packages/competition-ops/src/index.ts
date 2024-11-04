import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";

import { competitionEnd, competitionStart } from "./competition";
import { createFaucetProgram } from "./faucet";
import { createPerpetualsProgram } from "./perpetuals";

const getCurrentEpoch = (now: Date) => {
  const epoch = new Date(now);
  let minutes = epoch.getUTCMinutes();
  minutes = minutes - (minutes % 10);
  epoch.setMinutes(minutes, 0, 0);
  return epoch;
};

const getNextEpoch = (d: Date) => {
  return new Date(d.getTime() + 1000 * 60 * 10);
};

export const handler = async () => {
  const now = new Date();

  const connection = new Connection("https://api.devnet.solana.com", {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });

  const wallet = new Wallet(
    Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY as string)),
    ),
  );
  const provider = new AnchorProvider(connection, wallet, {});
  const faucet = createFaucetProgram(provider);
  const perpetuals = createPerpetualsProgram(provider);

  const epoch = getCurrentEpoch(now);
  const next = getNextEpoch(epoch);
  console.log(
    `Ending competition ${epoch.toISOString()} and starting ${next.toISOString()}`,
  );

  // End current competition
  await competitionEnd({ perpetuals, faucet }, { epoch }).catch((error) => {
    console.log(error);
    console.log("Failed to end competition");
  });

  // Start next competition
  await competitionStart({ faucet }, { epoch: next });
};

// handler();
