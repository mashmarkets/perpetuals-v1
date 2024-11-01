import {
  AnchorProvider,
  IdlAccounts,
  Program,
  ProgramAccount,
  utils,
  Wallet,
} from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import IDL from "../target/idl/perpetuals.json";
import { Perpetuals } from "../target/types/perpetuals.js";

type Position = ProgramAccount<IdlAccounts<Perpetuals>["position"]>;
type Custody = ProgramAccount<IdlAccounts<Perpetuals>["custody"]>;

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

async function forceClose(
  program: Program<Perpetuals>,
  position: Position,
  custody: Custody,
) {
  // Send collateral to position owner
  const receivingAccount = getAssociatedTokenAddressSync(
    new PublicKey(custody.account.mint),
    new PublicKey(position.account.owner),
  );

  return await program.methods
    .forceClose({})
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(
        program.provider.publicKey!,
        receivingAccount,
        position.account.owner,
        custody.account.mint,
      ),
    ])
    .accounts({
      admin: program.provider.publicKey,
      multisig: findPerpetualsAddressSync(program, "multisig"),
      receivingAccount,
      transferAuthority: findPerpetualsAddressSync(
        program,
        "transfer_authority",
      ),
      perpetuals: findPerpetualsAddressSync(program, "perpetuals"),
      pool: position.account.pool,
      position: position.publicKey,
      custody: position.account.custody,
      custodyOracleAccount: custody.account.oracle.oracleAccount,
      custodyTokenAccount: findPerpetualsAddressSync(
        program,
        "custody_token_account",
        position.account.pool,
        custody.account.mint,
      ),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

const getCustodies = async (program, positions: Position[]) => {
  const requiredCustodies = Array.from(
    new Set(positions.map((p) => p.account.custody.toString())),
  ).map((c) => new PublicKey(c));

  return (
    await program.account.custody.fetchMultiple(requiredCustodies)
  ).reduce((acc, account, i) => {
    acc[requiredCustodies[i].toString()] = {
      account,
      publicKey: requiredCustodies[i],
    };

    return acc;
  }, {});
};

// Intended to run at the end of competition to realize any pnl
async function forceCloseAllPositions(program: Program<Perpetuals>) {
  const positions = await program.account.position.all();
  const custodies = await getCustodies(program, positions);

  for (const position of positions) {
    const custody = custodies[position.account.custody.toString()];
    try {
      const tx = await forceClose(program, position, custody).catch(() => {});
      console.log("Force closed position: ", tx);
    } catch (error) {
      console.log(error);
    }
  }
}

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
  const program = new Program<Perpetuals>(IDL as Perpetuals, provider);
  await forceCloseAllPositions(program);
}

main();
