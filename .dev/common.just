err := "💥 " + RED + "ERROR!"
ok := "📦 " + BLUE
done := "💽 " + GREEN

[private]
check-env needed_var_list:
  #!/bin/env bash
  for varName in {{ needed_var_list }}; do
  varVal=$(eval echo "\${$varName}")
  [[ -z $varVal ]] && { echo "{{err}} Required variable '$varName' is not set!"; varUnset=true; }
  done
  [[ $varUnset ]] && { echo "{{err}} Check .env file exists and is setup correctly!" && exit 1; }
  exit 0

# 📝 Print all needed environment variables
[private]
print-vars list:
  #!/bin/env bash
  for varName in {{ list }}; do
    echo "$varName={{BLUE}}$(eval echo "\${$varName}"){{NORMAL}}"
  done

[private]
install-npm package cmd path="./.tools":
  #!/usr/bin/env bash
  set -eou pipefail
  command -v npm > /dev/null || ( echo "{{ err }} NPM not installed! Please install Node.js and NPM"; exit 1 )
  mkdir -p {{ path }}
  if [ -x "$(command -v {{ path }}/node_modules/.bin/{{ cmd }})" ]; then
    echo "{{ ok + cmd }} already installed"
  else
    npm install --silent --prefix {{ path }} {{ package }}
    echo "{{ done + cmd }} installed"
  fi