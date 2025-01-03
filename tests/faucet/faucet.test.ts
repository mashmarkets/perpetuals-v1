import { describe, expect, it } from "vitest";
import { BN, Program, setProvider, utils, Wallet } from "@coral-xyz/anchor";
import { getPriceFeedAccountForProgram } from "@pythnetwork/pyth-solana-receiver";
import { getI32Codec, getI64Codec, getU64Codec } from "@solana/codecs-numbers";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { BankrunProvider } from "anchor-bankrun";
import { Clock, startAnchor } from "solana-bankrun";
import { getAccount, getMint } from "spl-token-bankrun";

import IDL from "../../target/idl/faucet.json";
import { Faucet } from "../../target/types/faucet.js";

describe("Token Faucet", async () => {
  const context = await startAnchor(".", [], []);
  const provider = new BankrunProvider(context);

  setProvider(provider);
  const payer = provider.wallet as Wallet;
  const program = new Program<Faucet>(IDL as Faucet, provider);

  const findFaucetAddressSync = (...seeds) =>
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
      new PublicKey(IDL.address),
    )[0];

  const epoch = new BN(Math.round(Date.now() / 1000 + 60));
  const canonicalUsdc = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  );
  const mintUsdc = findFaucetAddressSync("mint", canonicalUsdc, epoch);
  const ataUsdc = getAssociatedTokenAddressSync(mintUsdc, payer.publicKey);

  const canonicalBonk = new PublicKey(
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  );
  const mintBonk = findFaucetAddressSync("mint", canonicalBonk, new BN(0));
  const ataBonk = getAssociatedTokenAddressSync(mintBonk, payer.publicKey);
  const vault = findFaucetAddressSync("vault", NATIVE_MINT, epoch);
  const competition = findFaucetAddressSync("competition", epoch);

  const feedId =
    "72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419";

  const priceUpdate = getPriceFeedAccountForProgram(0, feedId);

  const setPrice = (price: number, time = new Date()) => {
    const buff = Buffer.concat([
      Buffer.from([0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd]), // Discriminator
      new PublicKey("DBE3N8uNjhKPRHfANdwGvCZghWXyLPdqdSbEW2XFwBiX").toBuffer(), // Write Authority
      Buffer.from([0x01]), // Verification Level
      Buffer.from("crAhIXyj/miSKhmq+ZAQnLnYTprQBLTSAlrW9SkxRBk=", "base64"), // Price Message - Fee ID
      getI64Codec().encode(Math.round(price * 10 ** 10)), // Price Message - Price
      getU64Codec().encode(12190053), // Price Message - Conf
      getI32Codec().encode(-10), // Price Message - Exponent
      getI64Codec().encode(Math.floor(time.getTime() / 1000)), // Price Message - PublishTime
      getI64Codec().encode(Math.floor(time.getTime() / 1000)), // Price Message - Prev Publish Time
      getI64Codec().encode(BigInt(206917)), // Price Message - Ema Price
      getU64Codec().encode(BigInt(475)), // Price Message - Ema Conf
      getU64Codec().encode(BigInt(297732337)), // Posted Slot
    ]);

    context.setAccount(priceUpdate, {
      data: buff,
      owner: new PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ"),
      executable: false,
      lamports: 201823520,
    });
  };

  it("Can add a oracle", async () => {
    setPrice(0.00002089);
    const oracle = findFaucetAddressSync("oracle", canonicalBonk);
    await program.methods
      .oracleAdd({
        canonical: canonicalBonk,
        maxPriceAgeSec: new BN(600),
        feedId,
      })
      .accounts({
        payer: payer.publicKey,
        oracle,
        priceUpdate,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(await program.account.oracle.fetch(oracle)).toStrictEqual({
      feedId: [...new Uint8Array(Buffer.from(feedId, "hex"))],
      maxPriceAgeSec: 600,
      bump: expect.any(Number),
    });
  });

  it("Create a bonk token without initial supply", async () => {
    await program.methods
      .mintCreate({
        canonical: canonicalBonk,
        decimals: 5,
        amount: new BN(0),
        epoch: new BN(0),
      })
      .accounts({
        mint: mintBonk,
        associatedTokenAccount: ataBonk,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(await getMint(context.banksClient, mintBonk)).toMatchObject({
      decimals: 5,
      freezeAuthority: mintBonk,
      isInitialized: true,
      mintAuthority: mintBonk,
      supply: BigInt(0),
    });

    expect(await getAccount(context.banksClient, ataBonk)).toMatchObject({
      amount: BigInt(0),
      mint: mintBonk,
      owner: payer.publicKey,
    });
  });

  it("Create usdc token with initial supply", async () => {
    await program.methods
      .mintCreate({
        canonical: canonicalUsdc,
        decimals: 6,
        amount: new BN(10_000_000_000),
        epoch,
      })
      .accounts({
        mint: mintUsdc,
        associatedTokenAccount: ataUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(await getAccount(context.banksClient, ataUsdc)).toMatchObject({
      isFrozen: false,
      amount: BigInt(10_000_000_000),
      mint: mintUsdc,
      owner: payer.publicKey,
    });
  });

  it("Can can swap buy", async () => {
    await program.methods
      .swapBuy({
        amountOut: new BN(50_000_000_00000), // 50M Bonk
        canonicalIn: canonicalUsdc,
        canonicalOut: canonicalBonk,
        epoch,
      })
      .accounts({
        payer: payer.publicKey,
        oracle: findFaucetAddressSync("oracle", canonicalBonk),
        priceUpdate,
        mintIn: mintUsdc,
        tokenAccountIn: ataUsdc,
        mintOut: mintBonk,
        tokenAccountOut: ataBonk,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Amount in = 50000 000 00000 / 10 **5 * 208900 * 10 ** -10 * 10 ** 6
    expect(await getAccount(context.banksClient, ataUsdc)).toMatchObject({
      isFrozen: false,
      amount: BigInt(10_000_000_000 - 1_044_500_000), // Costs 10044.50
      mint: mintUsdc,
      owner: payer.publicKey,
    });

    expect(await getAccount(context.banksClient, ataBonk)).toMatchObject({
      amount: BigInt(50_000_000_00000),
      mint: mintBonk,
      owner: payer.publicKey,
    });
  });

  it("Can can swap sell", async () => {
    const MAX_U64 = "18446744073709551615";
    await program.methods
      .swapSell({
        amountIn: new BN(MAX_U64),
        canonicalIn: canonicalBonk,
        epoch,
      })
      .accounts({
        payer: payer.publicKey,
        oracle: findFaucetAddressSync("oracle", canonicalBonk),
        priceUpdate,
        mintIn: mintBonk,
        tokenAccountIn: ataBonk,
        mintOut: mintUsdc,
        tokenAccountOut: ataUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Amount out = amount in / 10 ** 5 / (price * 10 ** - 1) * 10 ** 6
    expect(await getAccount(context.banksClient, ataUsdc)).toMatchObject({
      isFrozen: false,
      amount: BigInt(10_000_000_000), // Costs 10044.50
      mint: mintUsdc,
      owner: payer.publicKey,
    });

    expect(await getAccount(context.banksClient, ataBonk)).toMatchObject({
      amount: BigInt(0),
      mint: mintBonk,
      owner: payer.publicKey,
    });
  });

  it("Can buy in", async () => {
    const tokenAccountIn = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      payer.publicKey,
    );
    const initialUsdc = (await getAccount(context.banksClient, ataUsdc)).amount;

    await program.methods
      .competitionEnter({
        amount: new BN(0.05 * LAMPORTS_PER_SOL),
        epoch,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          payer.publicKey, // payer
          tokenAccountIn, // associatedToken
          payer.publicKey, // owner
          NATIVE_MINT, // mint
        ),
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: tokenAccountIn,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        }),
        createSyncNativeInstruction(tokenAccountIn),
      ])
      .accounts({
        payer: payer.publicKey,
        mintIn: NATIVE_MINT,
        tokenAccountIn,
        vault,
        mintOut: mintUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccountOut: ataUsdc,
        systemProgram: SystemProgram.programId,
      })
      .postInstructions([
        createCloseAccountInstruction(
          tokenAccountIn, // account
          payer.publicKey, // destination
          payer.publicKey, // authority
        ),
      ])
      .rpc();

    // Check amount has been transferred
    expect(await getAccount(context.banksClient, ataUsdc)).toMatchObject({
      isFrozen: false,
      amount: BigInt(10_000 * 10 ** 6) + initialUsdc,
      mint: mintUsdc,
    });
    // Check amount has been transferred
    expect(await getAccount(context.banksClient, vault)).toMatchObject({
      amount: BigInt(0.05 * LAMPORTS_PER_SOL),
      mint: NATIVE_MINT,
    });
  });

  it("Can reject incorrect buy in amount", async () => {
    const amount = 0.04 * LAMPORTS_PER_SOL;
    const tokenAccountIn = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      payer.publicKey,
    );

    await expect(
      program.methods
        .competitionEnter({
          amount: new BN(amount),
          epoch,
        })
        .preInstructions([
          createAssociatedTokenAccountIdempotentInstruction(
            payer.publicKey, // payer
            tokenAccountIn, // associatedToken
            payer.publicKey, // owner
            NATIVE_MINT, // mint
          ),
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: tokenAccountIn,
            lamports: amount,
          }),
          createSyncNativeInstruction(tokenAccountIn),
        ])
        .accounts({
          payer: payer.publicKey,
          mintIn: NATIVE_MINT,
          tokenAccountIn,
          vault,
          mintOut: mintUsdc,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenAccountOut: ataUsdc,
          systemProgram: SystemProgram.programId,
        })
        .postInstructions([
          createCloseAccountInstruction(
            tokenAccountIn, // account
            payer.publicKey, // destination
            payer.publicKey, // authority
          ),
        ])
        .rpc(),
    ).rejects.toThrow("InvalidEntryAmount"); // Not parsing anchor errors correctly
  });

  it("Can end competition", async () => {
    // Warp past end of competition
    const currentClock = await context.banksClient.getClock();
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        BigInt(epoch.toNumber() + 10),
      ),
    );

    await program.methods
      .competitionEnd({
        epoch,
      })
      .accounts({
        competition,
        vault,
        vaultMint: NATIVE_MINT,
        payer: payer.publicKey,
        mint: mintUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(
      await program.account.competition.fetch(competition).then((x) => ({
        total: BigInt(x.total.toString()),
      })),
    ).toStrictEqual({
      total: BigInt(0.05 * LAMPORTS_PER_SOL),
    });
    expect(await getMint(context.banksClient, mintUsdc)).toMatchObject({
      decimals: 6,
      freezeAuthority: mintUsdc,
      isInitialized: true,
      mintAuthority: null,
    });
  });

  it("Can claim", async () => {
    const tokenAccountOut = getAssociatedTokenAddressSync(
      NATIVE_MINT,
      payer.publicKey,
    );

    await program.methods
      .competitionClaim({
        epoch,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          payer.publicKey, // payer
          tokenAccountOut, // associatedToken
          payer.publicKey, // owner
          NATIVE_MINT, // mint
        ),
      ])
      .accounts({
        payer: payer.publicKey,
        mintIn: mintUsdc,
        tokenAccountIn: ataUsdc,
        vault,
        competition,
        mintOut: NATIVE_MINT,
        tokenAccountOut,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Account has been frozen
    expect(await getAccount(context.banksClient, ataUsdc)).toMatchObject({
      isFrozen: true,
      amount: BigInt(20_000 * 10 ** 6),
      mint: mintUsdc,
    });

    // Check amount has been transferred
    expect(
      await getAccount(context.banksClient, tokenAccountOut),
    ).toMatchObject({
      amount: BigInt(0.05 * LAMPORTS_PER_SOL),
      mint: NATIVE_MINT,
    });
  });
});
