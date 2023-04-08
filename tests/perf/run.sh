#!/bin/bash
set -e

# Get the script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

which k6 > /dev/null || { echo -e "💥 Error! Command k6 not installed, see https://k6.io/docs/getting-started/installation/"; exit 1; }

# Load .env file with configuration
if [ -f .env ]
then
  export $(cat "$DIR"/.env | sed 's/#.*//g' | xargs)
else
  echo "💥 Warning! .env file not found, defaults will be used"
fi

mkdir -p output

echo "🚀 Starting k6 tests"
k6 run -o csv=output/results.csv "$DIR/"perf-test.js