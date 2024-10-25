#!/bin/bash

PROGRAM_KEY="./target/deploy/perpetuals-keypair.json"

function close {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: close <key_path>"
    return 1
  fi
  # Pass in devnet for safety - so we don't do on prod
  solana program close -u devnet -k "$1" $(solana address -k $PROGRAM_KEY) --bypass-warning
}


function deploy {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: deploy <key_path>"
    return 1
  fi
  rm $PROGRAM_KEY
  anchor keys sync
  anchor build
  anchor deploy --provider.cluster devnet --provider.wallet "$1"

  rm -rf ui/src/target/*
  mkdir -p ui/src/target/types
  mkdir -p ui/src/target/idl
  cp -rf target/idl ui/src/target
  cp -rf target/types ui/src/target
}

function setup {
  tsx ./app/src/setup.ts
}

function redeploy {
  if [ -z "$1" ]; then
    echo "Error: KEY parameter is required"
    echo "Usage: redeploy <key_path>"
    return 1
  fi
  close "$1"
  deploy "$1"
  setup
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
