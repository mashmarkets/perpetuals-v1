#!/bin/bash

PROGRAM_KEY="./target/deploy/perpetuals-keypair.json"

function close {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: ./tasks.sh close <key_path>"
    return 1
  fi

  # Pass in devnet for safety - so we don't do on prod
  solana program close -u devnet -k "$1" $(solana address -k $PROGRAM_KEY) --bypass-warning
}

# Named after anchor types options, but supports multiple destinations
function types {
  pnpm exec tsx ./scripts/patch.js
  rm -rf packages/ui/src/target/*
  cp -rf target/types/ packages/ui/src/target

  rm -rf packages/liquidator/src/target/*
  cp -rf target/types/perpetuals.ts packages/liquidator/src/target

  rm -rf packages/cli/src/target/*
  cp -rf target/types/perpetuals.ts packages/cli/src/target
}

function deploy {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: ./tasks.sh deploy <key_path>"
    return 1
  fi
  rm $PROGRAM_KEY
  anchor keys sync
  anchor build
  anchor deploy --provider.cluster devnet --provider.wallet "$1"
}


function setup {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: ./tasks.sh setup <key_path>"
    return 1
  fi
  PRIVATE_KEY="$1" pnpm exec tsx ./scripts/setup.ts
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
  setup "$1"
}


function test-perpetuals-native {
  RUST_BACKTRACE=1 RUST_LOG= cargo test-bpf -- --nocapture
}

function test-perpetuals-anchor {
  # We don't want the validator as we using bankrun
  command anchor build -p perpetuals -- --features test
  RUST_LOG= command npm run test -- --run --dir "./programs/perpetuals/tests/anchor"
}

function test-simulator {
  # We don't want the validator as we using bankrun
  command anchor build -p simulator 
  RUST_LOG= command npm run test -- --run --dir "./programs/simulator/tests"
}

function test {
  test-perpetuals-native
  test-perpetuals-anchor
  test-simulator
}

${@:-all}
