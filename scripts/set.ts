import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import { sleep } from "../packages/liquidator/src/utils.js";
import FaucetIDL from "../target/idl/faucet.json";
import IDL from "../target/idl/perpetuals.json";
import { Perpetuals } from "../target/types/perpetuals.js";
import { getCustodyParam, tradeableTokens } from "./config.js";

const { AnchorProvider, BN, Program, utils } = anchor;

const findPerpetualsAddressSync = (
  program: Program<Perpetuals>,
  ...seeds: Array<Buffer | string | PublicKey | Uint8Array>
) => {
  const publicKey = PublicKey.findProgramAddressSync(
    seeds.map((x) => {
      if (x instanceof PublicKey) {
        return x.toBuffer();
      }
      if (typeof x === "string") {
        return utils.bytes.utf8.encode(x);
      }
      return x;
    }),
    program.programId,
  )[0];

  return publicKey;
};

export const findFaucetAddressSync = (...seeds) =>
  PublicKey.findProgramAddressSync(
    seeds.map((x) => {
      if (x instanceof PublicKey) {
        return x.toBuffer();
      }
      if (typeof x === "string") {
        return utils.bytes.utf8.encode(x);
      }
      if (typeof x === "number" || x instanceof BN) {
        return new BN(x.toString()).toArrayLike(Buffer, "le", 8);
      }
      return x;
    }),
    new PublicKey(FaucetIDL.address),
  )[0];

export const findFaucetMint = (canonical: string, epoch: bigint) =>
  findFaucetAddressSync(
    "mint",
    new PublicKey(canonical),
    new BN(epoch.toString()),
  );

async function main() {
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
  const perpetuals = new Program<Perpetuals>(IDL as Perpetuals, provider);

  for (let i = 0; i < tradeableTokens.length; i++) {
    const token = tradeableTokens[i];
    await sleep(1000); // Avoid 429
    console.log(`\n [${i} ${token.symbol}] Updating parameters`);

    const custodyParams = getCustodyParam(token.symbol);

    const pool = findPerpetualsAddressSync(
      perpetuals,
      "pool",
      token.symbol.toUpperCase(),
    );
    const mint = findFaucetMint(token.address, new BN(0));

    const custody = findPerpetualsAddressSync(
      perpetuals,
      "custody",
      pool,
      mint,
    );

    const tx = await perpetuals.methods
      .setCustodyConfig(custodyParams)
      .accounts({
        admin: perpetuals.provider.publicKey,
        multisig: findPerpetualsAddressSync(perpetuals, "multisig"),
        pool,
        custody,
      })
      .rpc()
      .catch((error) => {
        console.log(error);
        console.log("Failed to update custody config for ", token.symbol);
      });

    console.log(`Updated config for ${token.symbol} with: `, tx);
  }
}

main();
