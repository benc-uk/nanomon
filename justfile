# shellcheck disable=all
# ==============================================================================
# Justfile for Nanomon, see http://just.systems
# ==============================================================================

set shell := ['bash', '-c']
set dotenv-path := '.dev/.env'
set quiet := true

import '.dev/common.just'

tools_dir := join(`pwd`, '.dev')
npm_dir := join(tools_dir, 'node_modules', '.bin')
needed_vars := "VERSION BUILD_INFO IMAGE_REG IMAGE_NAME IMAGE_TAG"

[private]
default:
    {{ just_executable() }} --list --list-prefix ' 🔸'

# 🔮 Install dev tools into project tools directory
dev-tools:
    go mod tidy -modfile=.dev/tools.mod
    {{ just_executable() }} install-npm httpyac httpyac {{ tools_dir }}

# 🔍 Lint & format, default is to run lint check only and set exit code
lint fix="false": npm_install
    #!/bin/env bash
    set -e
    echo {{ if fix != "false" { "Fixing" } else { "Checking" } }} "lint issues..."

    golangci_args={{ if fix != "false" { "--fix" } else { "" } }}
    npm_lint_script={{ if fix != "false" { "lint:fix" } else { "lint" } }}
    npm_format_script={{ if fix != "false" { "format" } else { "format:check" } }}

    go tool -modfile=.dev/tools.mod golangci-lint run -c .dev/golangci.yaml ./... $golangci_args
    cd frontend && npm run $npm_lint_script && npm run $npm_format_script 

# 📝 Format source files and fix linting problems
format: (lint "true")

# 🔨 Build all binaries and bundle the frontend, we don't really use this
build: (check-env needed_vars) npm_install
    mkdir -p bin
    go build -o bin -ldflags "-X main.version=$VERSION -X \"main.buildInfo=$BUILD_INFO\"" nanomon/services/...
    cd frontend && npm run build

# 📦 Build all container images, using Docker compose
images: (check-env needed_vars) (print-vars needed_vars)
    docker compose -f build/compose.yaml build

# 📤 Push all container images
[confirm('Are you sure you want to push all images?')]
push: (check-env needed_vars)
    docker compose -f build/compose.yaml push

# 🏃 Run the runner service locally, with hot reloading
run-runner:
    go tool -modfile=.dev/tools.mod air -c ./services/runner/.air.toml

# 🎯 Run the API service locally, with hot reloading
run-api:
    go tool -modfile=.dev/tools.mod air -c ./services/api/.air.toml

# 🌐 Run React frontend with Vite dev HTTP server & hot-reload
run-frontend: npm_install
    #!/bin/env bash
    jq -n 'env | {API_ENDPOINT, AUTH_CLIENT_ID, VERSION, BUILD_INFO, AUTH_TENANT}' > frontend/public/config.json
    cd frontend
    npm run dev

# 🐘 Run Postgres in container (needs Docker) 
run-db:
    echo -e "🐘 Starting Postgres..."
    command -v docker > /dev/null || ( echo "{{ err }} Docker not installed!"; exit 1 )
    docker rm -f postgres || true
    docker run --rm -p 5432:5432 \
     -e POSTGRES_DB=nanomon \
     -e POSTGRES_USER=nanomon \
     -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
     -v nanomon-db-data:/var/lib/postgresql/data \
     -v ./sql/init:/docker-entrypoint-initdb.d \
     --name postgres postgres:17

# 🌊 Remove Postgres container and its data volume
remove-db:
    echo -e "⛔ Removing Postgres container and stored data"
    docker rm -f postgres || true
    docker volume rm nanomon-db-data || true

# 🚀 Run all services locally with hot-reload, plus Postgres
run-all:
    #!/bin/env bash
    trap "echo -e '\n⛔ Removing Postgres container' && docker rm -f postgres" EXIT
    if ! docker ps | grep -q postgres; then {{ just_executable() }} run-db & fi
    sleep 15 
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
	docker volume rm nanomon-db-data || true

[private]
npm_install:
    #!/bin/env bash
    # Only install if not already installed
    if [[ ! -d frontend/node_modules ]]; then
        echo "📦 Installing frontend dependencies..."
        cd frontend && npm install
    fi
