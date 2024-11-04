import {
  AnchorProvider,
  BN,
  IdlAccounts,
  Program,
  ProgramAccount,
  utils,
} from "@coral-xyz/anchor";
import { Address } from "@solana/addresses";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { sendInstructions } from "../../ui/src/actions/connection.js";
import { findFaucetAddressSync } from "./faucet.js";
import { Faucet } from "./target/faucet.js";
import { Perpetuals } from "./target/perpetuals.js";
import IDL from "./target/perpetuals.json";
import { universe } from "./universe.js";

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

export const createPerpetualsProgram = (provider: AnchorProvider) => {
  return new Program<Perpetuals>(IDL as Perpetuals, provider);
};

// Need to swap to back to original faucet
async function forceClose(
  programs: {
    perpetuals: Program<Perpetuals>;
    faucet: Program<Faucet>;
  },
  params: {
    position: Position;
    custody: Custody;
    epoch: Date;
    receiveMint: Address;
  },
) {
  const { perpetuals: program, faucet } = programs;
  const { position, custody } = params;
  // We receive the collateral to us, but swap to USDC and send back to the position owner

  const publicKey = program.provider.publicKey!;

  // Receive the collateral to our account
  const receivingAccount = getAssociatedTokenAddressSync(
    new PublicKey(custody.account.mint),
    program.provider.publicKey!,
  );
  // Send the USDC to the position owner
  const tokenAccountOut = getAssociatedTokenAddressSync(
    new PublicKey(params.receiveMint),
    new PublicKey(position.account.owner),
  );

  const tokenIn = universe.find(
    (x) =>
      findFaucetAddressSync(
        "mint",
        new PublicKey(x.address),
        new Date(0),
      ).toString() === custody.account.mint.toString(),
  );

  const canonicalIn = tokenIn.address;

  const MAX_U64 = BigInt("18446744073709551615");
  const instructions = [
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey, // payer
      receivingAccount, // associatedToken
      publicKey, // owner
      custody.account.mint, // mint
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      publicKey, // payer
      tokenAccountOut, // associatedToken
      position.account.owner, // owner
      new PublicKey(params.receiveMint), // mint
    ),

    await program.methods
      .forceClose({})
      .accounts({
        admin: publicKey,
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
      .instruction(),

    //Swap with max
    await faucet.methods
      .swapSell({
        amountIn: new BN(MAX_U64.toString()),
        canonicalIn: new PublicKey(canonicalIn),
        epoch: new BN(Math.floor(params.epoch.getTime() / 1000)),
      })
      .accounts({
        payer: publicKey,
        oracle: findFaucetAddressSync("oracle", new PublicKey(canonicalIn)),
        priceUpdate: new PublicKey(tokenIn.extensions.oracle),
        mintIn: new PublicKey(custody.account.mint),
        tokenAccountIn: receivingAccount,
        mintOut: new PublicKey(params.receiveMint),
        tokenAccountOut,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction(),

    // Close the account
    createCloseAccountInstruction(receivingAccount, publicKey, publicKey),
  ];

  return await sendInstructions(program.provider, instructions);
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
export async function forceCloseAllPositions(
  programs: {
    perpetuals: Program<Perpetuals>;
    faucet: Program<Faucet>;
  },
  params: { receiveMint: Address; epoch: Date },
) {
  const { perpetuals, faucet } = programs;
  const positions = await perpetuals.account.position.all();
  const custodies = await getCustodies(perpetuals, positions);

  for (const position of positions) {
    const custody = custodies[position.account.custody.toString()];
    try {
      const tx = await forceClose(programs, {
        receiveMint: params.receiveMint,
        epoch: params.epoch,
        position,
        custody,
      }).catch((error) => console.log("Failed to force close", error));
      console.log("Force closed position: ", tx);
    } catch (error) {
      console.log(error);
    }
  }
}
