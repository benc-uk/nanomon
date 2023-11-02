#!/bin/bash
set -e

# **** Used for project maintence only ****
# Script used to prepare the Helm chart for publishing

which helm-docs > /dev/null || (echo "💥 helm-docs not found. Please install helm-docs, see https://github.com/norwoodj/helm-docs#installation" && exit 1)
which helm > /dev/null || (echo "💥 helm not found. Please install helm, see https://helm.sh/docs/helm/helm_install/" && exit 1)

set -e
DIR=$(dirname "$0")

cd "$DIR"/../deploy/helm

helm-docs
helm package nanomon
helm repo index .
