#!/bin/bash
set -e

PERPETUALS_KEY="./target/deploy/perpetuals-keypair.json"
FAUCET_KEY="./target/deploy/faucet-keypair.json"

function close {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: ./tasks.sh close <key_path>"
    return 1
  fi

  # Pass in devnet for safety - so we don't do on prod
  solana program close -u devnet -k "$1" $(solana address -k $PERPETUALS_KEY) --bypass-warning
  rm $PERPETUALS_KEY
  solana program close -u devnet -k "$1" $(solana address -k $FAUCET_KEY) --bypass-warning
  rm $FAUCET_KEY
}

# Named after anchor types options, but supports multiple destinations
function types {
  pnpm exec tsx ./scripts/patch.js

  rm -rf packages/cli/src/target/*
  cp -rf target/types/ target/idl/ packages/cli/src/target

  rm -rf packages/competition-ops/src/target/*
  cp -rf target/types/ target/idl/ packages/competition-ops/src/target

  rm -rf packages/liquidator/src/target/*
  cp -rf target/idl/perpetuals.json target/types/perpetuals.ts packages/liquidator/src/target

  rm -rf packages/ui/src/target/*
  cp -rf target/types/ target/idl/ packages/ui/src/target
  cp -rf target/idl/perpetuals.json packages/ui/public/static/idl
}

function deploy {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: ./tasks.sh deploy <key_path>"
    return 1
  fi
  anchor keys sync --provider.cluster localnet
  anchor keys sync --provider.cluster devnet
  anchor build
  anchor deploy --provider.cluster devnet --provider.wallet "$1"
}


function init {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: ./tasks.sh init <key_path>"
    return 1
  fi
  PRIVATE_KEY="$1" pnpm exec tsx ./scripts/init.ts
}

function redeploy {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: ./tasks.sh redeploy <key_path>"
    return 1
  fi
  close "$1"
  deploy "$1"
  types
  init "$1"
}


function test-perpetuals-native {
  RUST_BACKTRACE=1 RUST_LOG= cargo test-sbf -- --nocapture
}

function test-perpetuals-anchor {
  # We don't want the validator as we using bankrun
  command anchor build -p perpetuals 
  types
  RUST_LOG= command npm run test -- --run --dir "./programs/perpetuals/tests/"
}

function test-perpetuals {
  test-perpetuals-native
  test-perpetuals-anchor
}

function test-faucet {
  # We don't want the validator as we using bankrun
  command anchor build -p faucet 
  types
  RUST_LOG= command npm run test -- --run --dir "./programs/faucet/tests"
}

function test {
  test-perpetuals
  test-faucet
}

${@:-all}
