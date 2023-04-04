#!/bin/bash
VERSION=$1
PREV_VERSION=$2

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# check if version and previous version are supplied
if [[ -z "$VERSION" ]]; then
  echo "Error! Supply version tag!"
  exit 1
fi
if [[ -z "$PREV_VERSION" ]]; then
  echo "Error! Supply previous version tag!"
  exit 1
fi

gh release create "$VERSION" --title "v$VERSION" --notes-start-tag "$PREV_VERSION" --generate-notes -F "$DIR"/release-notes.md
