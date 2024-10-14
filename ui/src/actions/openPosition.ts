import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import { CustodyAccount } from "@/lib/CustodyAccount";
import { PoolAccount } from "@/lib/PoolAccount";
import { TokenE } from "@/lib/Token";
import { Side, TradeSide } from "@/lib/types";
import {
  getPerpetualProgramAndProvider,
  PERPETUALS_ADDRESS,
  TRANSFER_AUTHORITY,
} from "@/utils/constants";
import { manualSendTransaction } from "@/utils/TransactionHandlers";
import {
  createAtaIfNeeded,
  unwrapSol,
  wrapSol,
} from "@/utils/transactionHelpers";
import { ViewHelper } from "@/utils/viewHelpers";

export async function openPositionBuilder({
  walletContextState,
  connection,
  pool,
  payCustody,
  collateralCustody,
  positionCustody,
  payAmount,
  positionAmount,
  price,
  side,
  leverage,
}: {
  walletContextState: WalletContextState;
  connection: Connection;
  pool: PoolAccount;
  payCustody: CustodyAccount;
  collateralCustody: CustodyAccount;
  positionCustody: CustodyAccount;
  payAmount: number;
  positionAmount: number;
  price: number;
  side: Side;
  leverage: number;
}) {
  // console.log("in open position");
  let { perpetual_program, provider } =
    await getPerpetualProgramAndProvider(walletContextState);
  let publicKey = walletContextState.publicKey!;

  // TODO: need to take slippage as param , this is now for testing
  const newPrice =
    side.toString() == "Long"
      ? new BN((price * 10 ** 6 * 115) / 100)
      : new BN((price * 10 ** 6 * 90) / 100);

  let userCustodyTokenAccount = await getAssociatedTokenAddress(
    collateralCustody.mint,
    publicKey,
  );

  let positionAccount = PublicKey.findProgramAddressSync(
    [
      Buffer.from("position"),
      publicKey.toBuffer(),
      pool.address.toBuffer(),
      positionCustody.address.toBuffer(),
      // @ts-ignore
      side.toString() == "Long" ? [1] : [2],
    ],
    perpetual_program.programId,
  )[0];

  let preInstructions: TransactionInstruction[] = [];
  let finalPayAmount = payAmount;
  // let finalPayAmount = positionAmount / leverage;

  let ataIx = await createAtaIfNeeded(
    publicKey,
    publicKey,
    collateralCustody.mint,
    connection,
  );

  if (ataIx) preInstructions.push(ataIx);

  if (collateralCustody.getTokenE() == TokenE.SOL) {
    // let ataIx = await createAtaIfNeeded(
    //   publicKey,
    //   publicKey,
    //   positionCustody.mint,
    //   connection
    // );

    // if (ataIx) preInstructions.push(ataIx);

    let wrapInstructions = await wrapSol(
      publicKey,
      publicKey,
      connection,
      payAmount,
    );
    if (wrapInstructions) {
      preInstructions.push(...wrapInstructions);
    }
  }

  let postInstructions: TransactionInstruction[] = [];
  let unwrapTx = await unwrapSol(publicKey, publicKey, connection);
  if (unwrapTx) postInstructions.push(...unwrapTx);

  const params: any = {
    price: newPrice,
    collateral: new BN(finalPayAmount * 10 ** collateralCustody.decimals),
    size: new BN(positionAmount * 10 ** positionCustody.decimals),
    side: side.toString() == "Long" ? TradeSide.Long : TradeSide.Short,
  };

  console.log("fundingAccount", userCustodyTokenAccount.toString());
  let methodBuilder = perpetual_program.methods.openPosition(params).accounts({
    owner: publicKey,
    fundingAccount: userCustodyTokenAccount,
    transferAuthority: TRANSFER_AUTHORITY,
    perpetuals: PERPETUALS_ADDRESS,
    pool: pool.address,
    position: positionAccount,
    custody: positionCustody.address,
    custodyOracleAccount: positionCustody.oracle.oracleAccount,
    collateralCustody: collateralCustody.address,
    collateralCustodyOracleAccount: collateralCustody.oracle.oracleAccount,
    collateralCustodyTokenAccount: collateralCustody.tokenAccount,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
  });

  if (preInstructions) {
    methodBuilder = methodBuilder.preInstructions(preInstructions);
  }

  if (
    collateralCustody.getTokenE() == TokenE.SOL
    // ||  positionCustody.getTokenE() == TokenE.SOL
  ) {
    methodBuilder = methodBuilder.postInstructions(postInstructions);
  }

  try {
    // await automaticSendTransaction(methodBuilder, connection);
    let tx = await methodBuilder.transaction();
    await manualSendTransaction(
      tx,
      publicKey,
      connection,
      walletContextState.signTransaction,
    );
  } catch (err) {
    console.log(err);
    throw err;
  }
}

export async function openPosition({
  walletContextState,
  connection,
  pool,
  payToken,
  positionToken,
  payAmount,
  positionAmount,
  price,
  side,
  leverage,
}: {
  walletContextState: WalletContextState;
  connection: Connection;
  pool: PoolAccount;
  payToken: TokenE;
  positionToken: TokenE;
  payAmount: number;
  positionAmount: number;
  price: number;
  side: Side;
  leverage: number;
}) {
  console.log({ payToken, positionToken, payAmount, positionAmount });
  let payCustody = pool.getCustodyAccount(payToken)!;
  let positionCustody = pool.getCustodyAccount(positionToken)!;

  const collateralToken = side === Side.Long ? positionToken : TokenE.USDC;

  let collateralCustody = pool.getCustodyAccount(collateralToken)!;

  await openPositionBuilder({
    walletContextState,
    connection,
    pool,
    payCustody,
    collateralCustody,
    positionCustody,
    payAmount,
    positionAmount,
    price,
    side,
    leverage,
  });
}
