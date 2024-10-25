/// Command-line interface for basic admin functions

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Command } from "commander";

import { PerpetualsClient } from "./client.js";
import {
  BorrowRateParams,
  Fees,
  InitParams,
  OracleParams,
  Permissions,
  PricingParams,
  SetCustomOraclePriceParams,
} from "./types.js";

const { BN } = anchor;

let client: PerpetualsClient;

function initClient(clusterUrl: string, adminKeyPath: string): void {
  process.env.ANCHOR_WALLET = adminKeyPath;
  client = new PerpetualsClient(clusterUrl, adminKeyPath);
  client.log("Client Initialized");
}

(async function main() {
  const program = new Command();
  program
    .name("cli.ts")
    .description("CLI to Solana Perpetuals Exchange Program")
    .version("0.1.0")
    .option(
      "-u, --url <string>",
      "URL for Solana's JSON RPC",
      "https://api.devnet.solana.com",
    )
    .requiredOption("-k, --keypair <path>", "Filepath to the admin keypair")
    .hook("preSubcommand", (thisCommand, subCommand) => {
      if (!program.opts().keypair) {
        throw Error("required option '-k, --keypair <path>' not specified");
      }
      initClient(program.opts().url, program.opts().keypair);
      client.log(`Processing command '${thisCommand.args[0]}'`);
    })
    .hook("postAction", () => {
      client.log("Done");
    });

  program
    .command("add-custody")
    .description("Add a new token custody to the pool")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .argument("<pubkey>", "Token oracle account")
    .option("-t, --oracletype <string>", "Oracle type (pyth, none, custom)")
    .action(async (poolName, tokenMint, tokenOracle, options) => {
      const oracleConfig: OracleParams = {
        maxPriceError: new BN(10_000),
        maxPriceAgeSec: 36000,
        oracleType: { [options.oracletype || "custom"]: {} } as
          | { pyth: {} }
          | { custom: {} }
          | { none: {} },
        oracleAccount: new PublicKey(tokenOracle),
        oracleAuthority: PublicKey.default,
      };

      const pricingConfig: PricingParams = {
        useEma: true,
        useUnrealizedPnlInAum: true,
        tradeSpreadLong: new BN(100),
        tradeSpreadShort: new BN(100),
        minInitialLeverage: new BN(10_000),
        maxInitialLeverage: new BN(1_000_000),
        maxLeverage: new BN(1_000_000),
        maxPayoffMult: new BN(10_000),
        maxUtilization: new BN(10_000),
        maxPositionLockedUsd: new BN(0),
        maxTotalLockedUsd: new BN(0),
      };

      const permissions: Permissions = {
        allowAddLiquidity: true,
        allowRemoveLiquidity: true,
        allowOpenPosition: true,
        allowClosePosition: true,
        allowPnlWithdrawal: true,
        allowCollateralWithdrawal: true,
        allowSizeChange: true,
      };

      const fees: Fees = {
        utilizationMult: new BN(20_000),
        addLiquidity: new BN(100),
        removeLiquidity: new BN(100),
        openPosition: new BN(100),
        closePosition: new BN(100),
        liquidation: new BN(100),
        protocolShare: new BN(10),
      };

      const borrowRate: BorrowRateParams = {
        baseRate: new BN(0),
        slope1: new BN(80_000),
        slope2: new BN(120_000),
        optimalUtilization: new BN(800_000_000),
      };

      await client.addCustody(
        poolName,
        new PublicKey(tokenMint),
        oracleConfig,
        pricingConfig,
        permissions,
        fees,
        borrowRate,
      );
    });

  program
    .command("add-liquidity")
    .description("Deposit liquidity to the custody")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .requiredOption("-i, --amount-in <int>", "Amount to deposit")
    .requiredOption(
      "-o, --min-amount-out <int>",
      "Minimum LP amount to receive",
    )
    .action(async (poolName, tokenMint, options) => {
      await client.addLiquidity(
        poolName,
        new PublicKey(tokenMint),
        new BN(options.amountIn),
        new BN(options.minAmountOut),
      );
    });

  program
    .command("add-pool")
    .description("Create a new pool")
    .argument("<string>", "Pool name")
    .action(async (poolName) => {
      await client.addPool(poolName);
    });

  program
    .command("get-add-liquidity-amount-and-fee")
    .description("Compute LP amount returned and fee for add liquidity")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .requiredOption("-a, --amount <bigint>", "Token amount")
    .action(async (poolName, tokenMint, options) => {
      client.prettyPrint(
        await client.getAddLiquidityAmountAndFee(
          poolName,
          new PublicKey(tokenMint),
          new BN(options.amount),
        ),
      );
    });

  program
    .command("get-all-positions")
    .description("Print all open positions")
    .action(async () => {
      client.prettyPrint(await client.getAllPositions());
    });

  program
    .command("get-aum")
    .description("Get assets under management")
    .argument("<string>", "Pool name")
    .action(async (poolName) => {
      client.prettyPrint(await client.getAum(poolName));
    });

  program
    .command("get-custodies")
    .description("Print metadata for all custodies")
    .argument("<string>", "Pool name")
    .action(async (poolName) => {
      client.prettyPrint(await client.getCustodies(poolName));
    });

  program
    .command("get-custody")
    .description("Print metadata for the token custody")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .action(async (poolName, tokenMint) => {
      client.prettyPrint(
        await client.getCustody(poolName, new PublicKey(tokenMint)),
      );
    });

  program
    .command("get-custom-oracle-account")
    .description("Get custom oracle account address for the token")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .action(async (poolName, tokenMint) => {
      client.prettyPrint(
        client.getCustodyCustomOracleAccountKey(
          poolName,
          new PublicKey(tokenMint),
        ),
      );
    });

  program
    .command("get-entry-price-and-fee")
    .description("Compute price and fee to open a position")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .requiredOption("-c, --collateral <bigint>", "Collateral")
    .requiredOption("-s, --size <bigint>", "Size")
    .action(async (poolName, tokenMint, options) => {
      client.prettyPrint(
        await client.getEntryPriceAndFee(
          poolName,
          new PublicKey(tokenMint),
          new BN(options.collateral),
          new BN(options.size),
        ),
      );
    });

  program
    .command("get-exit-price-and-fee")
    .description("Compute price and fee to close the position")
    .argument("<pubkey>", "User wallet")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .action(async (wallet, poolName, tokenMint) => {
      client.prettyPrint(
        await client.getExitPriceAndFee(
          new PublicKey(wallet),
          poolName,
          new PublicKey(tokenMint),
        ),
      );
    });

  program
    .command("get-liquidation-price")
    .description("Compute liquidation price for the position")
    .argument("<pubkey>", "User wallet")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .option("-a, --add-collateral <bigint>", "Collateral to add")
    .option("-r, --remove-collateral <bigint>", "Collateral to remove")
    .action(async (wallet, poolName, tokenMint, options) => {
      client.prettyPrint(
        await client.getLiquidationPrice(
          new PublicKey(wallet),
          poolName,
          new PublicKey(tokenMint),
          new BN(options.addCollateral),
          new BN(options.removeCollateral),
        ),
      );
    });

  program
    .command("get-liquidation-state")
    .description("Get liquidation state of the position")
    .argument("<pubkey>", "User wallet")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .action(async (wallet, poolName, tokenMint) => {
      client.prettyPrint(
        await client.getLiquidationState(
          new PublicKey(wallet),
          poolName,
          new PublicKey(tokenMint),
        ),
      );
    });

  program
    .command("get-lp-token-mint")
    .description("Get LP token mint address for the pool")
    .argument("<string>", "Pool name")
    .action(async (poolName) => {
      client.prettyPrint(client.getPoolLpTokenKey(poolName));
    });

  program
    .command("get-multisig")
    .description("Print multisig state")
    .action(async () => {
      client.prettyPrint(await client.getMultisig());
    });

  program
    .command("get-oracle-price")
    .description("Read oracle price for the token")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .option("-e, --ema", "Return EMA price")
    .action(async (poolName, tokenMint, options) => {
      client.prettyPrint(
        await client.getOraclePrice(
          poolName,
          new PublicKey(tokenMint),
          options.ema,
        ),
      );
    });

  program
    .command("get-perpetuals")
    .description("Print perpetuals global state")
    .action(async () => {
      client.prettyPrint(await client.getPerpetuals());
    });

  program
    .command("get-pnl")
    .description("Compute PnL of the position")
    .argument("<pubkey>", "User wallet")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .action(async (wallet, poolName, tokenMint) => {
      client.prettyPrint(
        await client.getPnl(
          new PublicKey(wallet),
          poolName,
          new PublicKey(tokenMint),
        ),
      );
    });

  program
    .command("get-pool")
    .description("Print metadata for the pool")
    .argument("<string>", "Pool name")
    .action(async (poolName) => {
      client.prettyPrint(await client.getPool(poolName));
    });

  program
    .command("get-pools")
    .description("Print metadata for all pools")
    .action(async () => {
      client.prettyPrint(await client.getPools());
    });

  program
    .command("get-pool-token-positions")
    .description("Print positions in the token")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .action(async (poolName, tokenMint) => {
      client.prettyPrint(
        await client.getPoolTokenPositions(poolName, new PublicKey(tokenMint)),
      );
    });

  program
    .command("get-remove-liquidity-amount-and-fee")
    .description("Compute token amount returned and fee for remove liquidity")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .requiredOption("-a, --amount <bigint>", "LP token amount")
    .action(async (poolName, tokenMint, options) => {
      client.prettyPrint(
        await client.getRemoveLiquidityAmountAndFee(
          poolName,
          new PublicKey(tokenMint),
          new BN(options.amount),
        ),
      );
    });

  program
    .command("get-user-position")
    .description("Print user position metadata")
    .argument("<pubkey>", "User wallet")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .action(async (wallet, poolName, tokenMint) => {
      client.prettyPrint(
        await client.getUserPosition(
          new PublicKey(wallet),
          poolName,
          new PublicKey(tokenMint),
        ),
      );
    });

  program
    .command("get-user-positions")
    .description("Print all user positions")
    .argument("<pubkey>", "User wallet")
    .action(async (wallet) => {
      client.prettyPrint(await client.getUserPositions(new PublicKey(wallet)));
    });

  program
    .command("init")
    .description("Initialize the on-chain program")
    .requiredOption("-m, --min-signatures <int>", "Minimum signatures")
    .argument("<pubkey...>", "Admin public keys")
    .action(async (args, options) => {
      const perpetualsConfig: InitParams = {
        minSignatures: options.minSignatures,
        allowAddLiquidity: true,
        allowRemoveLiquidity: true,
        allowOpenPosition: true,
        allowClosePosition: true,
        allowPnlWithdrawal: true,
        allowCollateralWithdrawal: true,
        allowSizeChange: true,
      };
      await client.init(
        args.map((x) => new PublicKey(x)),
        perpetualsConfig,
      );
    });

  program
    .command("open-position")
    .description("Open a new perpetuals position")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .requiredOption("-p, --price <int>", "Entry price")
    .requiredOption("-c, --collateral <int>", "Collateral amount")
    .requiredOption("-s, --size <int>", "Position size")
    .action(async (poolName, tokenMint, options) => {
      await client.openPosition(
        poolName,
        new PublicKey(tokenMint),
        new BN(options.price),
        new BN(options.collateral),
        new BN(options.size),
      );
    });

  program
    .command("remove-custody")
    .description("Remove the token custody from the pool")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .action(async (poolName, tokenMint) => {
      await client.removeCustody(poolName, new PublicKey(tokenMint));
    });

  program
    .command("remove-pool")
    .description("Remove the pool")
    .argument("<string>", "Pool name")
    .action(async (poolName) => {
      await client.removePool(poolName);
    });

  program
    .command("set-authority")
    .description("Set protocol admins")
    .requiredOption("-m, --min-signatures <int>", "Minimum signatures")
    .argument("<pubkey...>", "Admin public keys")
    .action(async (args, options) => {
      await client.setAdminSigners(
        args.map((x) => new PublicKey(x)),
        options.minSignatures,
      );
    });

  program
    .command("set-oracle-price")
    .description("Set custom oracle price")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint")
    .requiredOption("-p, --price <int>", "Current price as integer")
    .requiredOption("-e, --exponent <int>", "Price exponent")
    .requiredOption("-c, --confidence <int>", "Confidence")
    .requiredOption("-m, --ema <int>", "EMA price as integer")
    .action(async (poolName, tokenMint, options) => {
      const priceConfig: SetCustomOraclePriceParams = {
        price: new BN(options.price),
        expo: options.exponent,
        conf: new BN(options.confidence),
        ema: new BN(options.ema),
        publishTime: new BN(client.getTime()),
      };
      await client.setCustomOraclePrice(
        poolName,
        new PublicKey(tokenMint),
        priceConfig,
      );
    });

  program
    .command("withdraw-fees")
    .description("Withdraw protocol fees")
    .argument("<string>", "Pool name")
    .argument("<pubkey>", "Token mint in")
    .argument("<amount>", "amount")
    .action(async (poolName, tokenMint, amount) => {
      await client.withdrawFees({
        amount: new BN(amount),
        poolName,
        tokenMint: new PublicKey(tokenMint),
      });
    });

  await program.parseAsync(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
})();
