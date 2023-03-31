#!/bin/bash

VERSION=$1

if [[ -z "$VERSION" ]]; then
  echo "Error! Supply version tag!"
  exit 1
fi

# read in notes.md
REL_NOTES=$(cat notes.md)

read -r -d '' NOTES << EOM
$REL_NOTES
\`\`\`
docker pull ghcr.io/benc-uk/nanomon-api:$VERSION
docker pull ghcr.io/benc-uk/nanomon-frontend:$VERSION
docker pull ghcr.io/benc-uk/nanomon-runner:$VERSION
\`\`\`
EOM

gh release create "$VERSION" --title "Release v$VERSION" -n "$NOTES"
