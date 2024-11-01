# Mash Markets Perpetuals

## Introduction

Mash Markets is a decentralized derivatives exchange built on Solana. Unlike traditional DEXs that rely on order books, Mash Markets uses a liquidity pool model where users can trade derivatives directly against liquidity pools. This system eliminates the need for market makers and ensures that trades are fast, seamless, and executed with minimal slippage.

## Quick Start Guide

### Environment Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/mashmarkets/perpetuals-v1.git
   ```

2. Install required tools:

   - Solana tools v1.18.22
   - Anchor framework v0.30.1 from <https://www.anchor-lang.com/docs/installation>
   - Latest stable Rust from <https://rustup.rs/>
     - Existing Rust installation? Run `rustup update`

3. Set up code formatting:
   - Project uses Rustfmt for consistent code style
   - Enable pre-commit hooks:
     ```bash
     git config core.hooksPath .githooks
     ```

#### [Optional] Vscode setup

1. Install `rust-analyzer` extension

### Build

Run `anchor keys sync` to create new keypair for the program and replace the existing program ID in `Anchor.toml` and `programs/perpetuals/src/lib.rs`.

Also, ensure the path to your wallet in `Anchor.toml` is correct. Alternatively, when running Anchor deploy or test commands, you can specify your wallet with `--provider.wallet` argument. The wallet's pubkey will be set as an upgrade authority upon initial deployment of the program. It is strongly recommended to make upgrade authority a multisig when deploying to the mainnet.

To build the program run `anchor build`

### Test

There are helpers in the [tasks.sh](tasks.sh) file to run integration and unit tests.

Integration and unit tests (Rust) can be started as follows:

```sh
./tasks.sh test-perpetuals-native
```

Integration tests (Typescript) can be started as follows:

```sh
./tasks.sh test-perpetuals-anchor
```

By default, integration tests are executed on a local validator, so it won't cost you any SOL.

### Deploy

To deploy the program to the devnet and upload the IDL use the following commands:

```sh
anchor deploy --provider.cluster devnet
anchor idl init --provider.cluster devnet --filepath ./target/idl/perpetuals.json <PROGRAM ID>
```

### Initialize

A small CLI Typescript client is included to help you initialize and manage the program. By default script uses devnet cluster. Add `-u https://api.mainnet-beta.solana.com` to all of the commands if you plan to execute them on mainnet.

To initialize deployed program, run the following commands:

```sh
cd app
npm install
npm install -g npx
npx ts-node src/cli.ts -k <ADMIN_WALLET> init --min-signatures <int> <ADMIN_PUBKEY1> <ADMIN_PUBKEY2> ...
```

Where `<ADMIN_WALLET>` is the file path to the wallet that was set as the upgrade authority of the program upon deployment. `<ADMIN_PUBKEY1>`, `<ADMIN_PUBKEY2>` etc., will be set as protocol admins, and `min-signatures` will be required to execute privileged instructions. To provide multiple signatures, just execute exactly the same command multiple times specifying different `<ADMIN_WALLET>` with `-k` option. The intermediate state is recorded on-chain so that commands can be executed on different computers.

To change program authority, run:

```sh
solana program set-upgrade-authority <PROGRAM_ADDRESS> --new-upgrade-authority <NEW_UPGRADE_AUTHORITY>
```

To change program authority back, run:

```sh
solana program set-upgrade-authority <PROGRAM_ADDRESS> --new-upgrade-authority <NEW_UPGRADE_AUTHORITY> -k <CURRENT_AUTHORITY_KEYPAIR>
```

To change protocol admins or minimum required signatures, run:

```sh
npx ts-node src/cli.ts -k <ADMIN_WALLET> set-authority --min-signatures <int> <ADMIN_PUBKEY1> <ADMIN_PUBKEY2> ...
```

To validate initialized program:

```sh
npx ts-node src/cli.ts -k <ADMIN_WALLET> get-multisig
npx ts-node src/cli.ts -k <ADMIN_WALLET> get-perpetuals
```

Before the program can accept any liquidity or open a trade, you need to create a token pool and add one or more token custodies to it:

```sh
npx ts-node src/cli.ts -k <ADMIN_WALLET> add-pool <POOL_NAME>
npx ts-node src/cli.ts -k <ADMIN_WALLET> add-custody [-s] [-v] [-t] <POOL_NAME> <TOKEN_MINT> <TOKEN_ORACLE>
```

Where `<POOL_NAME>` is a random name you want to assign to the pool, `<TOKEN_MINT>` is the mint address of the token, and `<TOKEN_ORACLE>` is the corresponding Pyth price account that can be found on [this page](https://pyth.network/price-feeds?cluster=devnet). `-s` flag specifies whether the custody is for a stablecoin. `-v` flag is used to create a virtual/synthetic custody. More information on the latter can be found [here](SYNTHETICS.md). `-t` flag specifies the type of the oracle to be used for the custody: `custom`, `pyth` or `none`.

For example:

```sh
npx ts-node src/cli.ts -k <ADMIN_WALLET> add-pool TestPool1
npx ts-node src/cli.ts -k <ADMIN_WALLET> add-custody TestPool1 So11111111111111111111111111111111111111112 J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix
```

To validate added pools and custodies, run:

```sh
npx ts-node src/cli.ts -k <ADMIN_WALLET> get-pool <POOL_NAME>
npx ts-node src/cli.ts -k <ADMIN_WALLET> get-custody <POOL_NAME> <TOKEN_MINT>
```

or

```sh
npx ts-node src/cli.ts -k <ADMIN_WALLET> get-pools
npx ts-node src/cli.ts -k <ADMIN_WALLET> get-custodies <POOL_NAME>
```

To add liquidity, run:

```sh
npx ts-node src/cli.ts -k <WALLET> add-liquidity <POOL_NAME> <TOKEN_MINT> --amount-in <AMOUNT_IN> --min-amount-out <MIN_AMOUNT_OUT>
```

For it to work, make sure the wallet's LM token ATA is initialized and the wallet hold enough tokens to provide as liquidity.

To initialize wallet's token ATA, run:

```sh
npx ts-node src/cli.ts -k <ADMIN_WALLET> get-lp-token-mint <POOL_NAME>

spl-token create-account <LM_TOKEN_MINT> --owner <WALLET> --fee-payer <PAYER_WALLET>
```

CLI offers other useful commands. You can get the list of all of them by running the following:

```sh
npx ts-node src/cli.ts --help
```

## Frontend

To start the Frontend

```sh
pnpm install
cd packages/ui
pnpm run dev
```

By default the UI will be available at http://localhost:3000
