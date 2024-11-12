#!/bin/bash
set -e

IMAGE="jsonmaxi/perpetuals-liquidator"

function build {
  DOCKER_BUILDKIT=1 docker build -t $IMAGE:latest --platform=linux/arm64 .
}

function push {
  docker push $IMAGE:latest
}

function deploy {
  build
  push
}

function run {
  # Load .env file
  source .env

  docker run \
    -e PRIVATE_KEY=$PRIVATE_KEY \
    -e TG_BOT_TOKEN=$TG_BOT_TOKEN \
    -e TG_CHAT_ID=$TG_CHAT_ID \
    $IMAGE
    # -e HEALTHCHECKS_URL=$HEALTHCHECKS_URL \
    # -e PERPETUALS_IDL_URL=$PERPETUALS_IDL_URL \
    # -e RPC_ENDPOINT=$RPC_ENDPOINT\
}


${@}
