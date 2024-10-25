#!/bin/bash
set -e

IMAGE="jsonmaxi/perpetuals-liquidator"

function build {
  DOCKER_BUILDKIT=1 docker build -t $IMAGE:latest --platform=linux/arm64 .
}

function push {
  docker push $IMAGE:latest
}


${@}
