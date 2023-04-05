#!/bin/bash
set -e
DIR=$(dirname "$0")

cd "$DIR"/../deploy/helm

helm-docs
helm package nanomon
helm repo index .
