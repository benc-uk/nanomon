#!/bin/bash

mkdir -p .tools
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to ./.tools
