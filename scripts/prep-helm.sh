#!/bin/bash

# **** Used for project maintence only ****
# Script used to prepare the Helm chart for publishing


set -e
DIR=$(dirname "$0")

cd "$DIR"/../deploy/helm

helm-docs
helm package nanomon
helm repo index .
