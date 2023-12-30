#!/bin/bash

# ==============================================================================
# Script tries to start all services in development mode
# - MongoDB as Docker container
# - API (Go using Air)
# - Runner (Go using Air)
# - Frontend (Vite)
# ==============================================================================

DIR=$(dirname "$0")

# Check docker
if ! [ -x "$(command -v docker)" ]; then
  echo 'Error: docker is not installed.' >&2
  exit 1
fi

# Trap exit and stop MongoDB container
trap "echo '### 🛑 Stopping MongoDB container' && docker rm -f mongo" EXIT

# check if mongodb docker container is running
if ! docker ps | grep -q mongo; then
  echo "### 🚀 Starting MongoDB as Docker container"
  docker run --rm -it -d -p 27017:27017 -v nm-mongo-data:/bitnami/mongodb \
    -e MONGODB_REPLICA_SET_MODE=primary \
    -e MONGODB_ADVERTISED_HOSTNAME=localhost \
    -e ALLOW_EMPTY_PASSWORD=yes \
    --name mongo bitnami/mongodb:6.0
else
  echo "### 🚀 MongoDB is already running"
fi

sleep 3

echo "### 🚀 Starting API"
"$DIR/../.tools/air" -c services/runner/.air.toml &
sleep 2

echo "### 🚀 Starting Runner"
"$DIR/../.tools/air" -c services/api/.air.toml &
sleep 2

echo "### 🚀 Starting Frontend"
"$DIR/../.tools/node_modules/.bin/vite" "$DIR/../frontend" &

# Sleep infinity
wait
