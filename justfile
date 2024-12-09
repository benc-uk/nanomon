# shellcheck disable=all
# ==============================================================================
# Justfile for Nanomon, see http://just.systems
# ==============================================================================

set shell := ['bash', '-c']
set dotenv-load := true
set quiet := true

import 'etc/common.just'

tools_dir := join(`pwd`, '.tools')
npm_dir := join(tools_dir, 'node_modules', '.bin')
needed_vars := "VERSION BUILD_INFO IMAGE_REG IMAGE_NAME IMAGE_TAG"

[private]
default:
    {{ just_executable() }} --list --list-prefix ' 🔸'

# 🔮 Install dev tools into project tools directory
install:
    {{ just_executable() }} install-air {{ tools_dir }}
    {{ just_executable() }} install-golangcilint {{ tools_dir }}
    {{ just_executable() }} install-npm prettier prettier {{ tools_dir }}
    {{ just_executable() }} install-npm eslint eslint {{ tools_dir }}
    {{ just_executable() }} install-npm typescript tsc {{ tools_dir }}
    {{ just_executable() }} install-npm vite vite {{ tools_dir }}
    {{ just_executable() }} install-npm httpyac httpyac {{ tools_dir }}

# 🔍 Lint & format, default is to run lint check only and set exit code
lint fix="false":
    #!/bin/env bash
    set -e
    echo {{ if fix != "false" { "Fixing" } else { "Checking" } }} "lint issues..."

    eslint_args={{ if fix != "false" { "--fix" } else { "" } }}
    prettier_args={{ if fix != "false" { "--write" } else { "--check" } }}
    golangci_args={{ if fix != "false" { "--fix" } else { "" } }}

    {{ npm_dir + '/eslint' }} -c frontend/eslint.config.mjs ./frontend $eslint_args
    {{ npm_dir + '/prettier' }} $prettier_args ./frontend 
    {{ npm_dir + '/tsc' }} -p ./frontend
    {{ tools_dir + '/golangci-lint' }} run ./... $golangci_args

# 📝 Format source files and fix linting problems
format: (lint "true")

# 🔨 Build all binaries into ./bin/ directory, not really needed
build: (check-env needed_vars)
    mkdir -p bin
    go build -o bin -ldflags "-X main.version=$VERSION -X \"main.buildInfo=$BUILD_INFO\"" nanomon/services/...

# 📦 Build all container images, using Docker compose
images: (check-env needed_vars) (print-vars needed_vars)
    sleep 5
    docker compose -f build/compose.yaml build

# 📦 Build the special standalone all-in-one image
image-standalone: (check-env needed_vars) (print-vars needed_vars)
    docker compose -f build/compose.yaml build standalone

# 📤 Push all container images
[confirm('Are you sure you want to push all images?')]
push: (check-env needed_vars)
    docker compose -f build/compose.yaml push

# 🏃 Run the runner service locally, with hot reloading
run-runner:
    {{ tools_dir + '/air' }} -c services/runner/.air.toml

# 🎯 Run the API service locally, with hot reloading
run-api:
    {{ tools_dir + '/air' }} -c services/api/.air.toml

# 🌐 Run frontend with Vite dev HTTP server & hot-reload
run-frontend:
    # Creating JSON config file for frontend, this is ONLY used for local dev work
    @jq -n 'env | {API_ENDPOINT, AUTH_CLIENT_ID, VERSION, BUILD_INFO, AUTH_TENANT}' > frontend/config.json
    # Starting Vite to serve
    {{ tools_dir + '/node_modules/.bin/vite' }} ./frontend

# 🍃 Run MongoDB in container (needs Docker)
run-db:
    command -v docker > /dev/null || ( echo "{{ err }} Docker not installed!"; exit 1 )
    docker rm -f mongo || true
    docker run --rm -p 27017:27017 -v nm-mongo-data:/bitnami/mongodb \
     -e MONGODB_REPLICA_SET_MODE=primary \
     -e MONGODB_ADVERTISED_HOSTNAME=localhost \
     -e ALLOW_EMPTY_PASSWORD=yes \
     --name mongo bitnami/mongodb:8.0

# 🚀 Run all services locally with hot-reload, plus MongoDB
run-all:
    #!/bin/env bash
    trap "echo -e '\n⛔ Removing MongoDB container' && docker rm -f mongo" EXIT
    if ! docker ps | grep -q mongo; then {{ just_executable() }} run-db & fi
    sleep 20 
    {{ just_executable() }} run-runner &
    sleep 5
    {{ just_executable() }} run-api &
    sleep 5
    {{ just_executable() }} run-frontend &
    wait

# 🧪 Run all unit tests
test:
    ALERT_SMTP_TO= go test -v ./... 

# 🔬 Run API integration tests, using HttpYac
test-api report="false":
    if [[ {{ report }} == "false" ]]; then \
      {{ npm_dir + '/httpyac' }} send tests/integration-tests.http --all --output short --var endpoint=$API_ENDPOINT; \
    else \
      {{ npm_dir + '/httpyac' }} send tests/integration-tests.http --all --output short --var endpoint=$API_ENDPOINT --junit > api-test-results.xml; \
    fi

# 🤖 Generate OpenAPI specs and JSON-Schemas using TypeSpec
generate-specs:
  #!/bin/env bash
  cd api/typespec && npm install
  ./node_modules/.bin/tsp compile .
  cp tsp-output/@typespec/openapi3/openapi.yaml ../openapi.yaml
  cp tsp-output/@typespec/json-schema/*.json ..

# 🧹 Clean up, remove dev data and temp files
[confirm('Are you sure you want to clean up?')]
clean:
	rm -rf tmp bin .tools frontend/config api/**/node_modules api/**/tsp-output frontend/.vite *.xml
	docker volume rm nm-mongo-data || true

