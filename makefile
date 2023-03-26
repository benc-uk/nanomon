# Common variables
VERSION := 0.0.1
BUILD_INFO := Manual build
SVC_DIR := ./services
SPA_DIR := ./frontend

# Most likely want to override these when calling `make image`
IMAGE_REG ?= ghcr.io
IMAGE_NAME ?= monitr
IMAGE_TAG ?= latest

# Things you don't want to change
REPO_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
# Tools
GOLINT_PATH := $(REPO_DIR)/bin/golangci-lint              # Remove if not using Go
AIR_PATH := $(REPO_DIR)/bin/air                           # Remove if not using Go
BS_PATH := $(REPO_DIR)/bin/node_modules/.bin/browser-sync # Remove if local server not needed

.EXPORT_ALL_VARIABLES:
.PHONY: help image push build run lint lint-fix
.DEFAULT_GOAL := help

help: ## 💬 This help message :)
	@figlet $@ || true
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install-tools: ## 🔮 Install dev tools into project bin directory
	@figlet $@ || true
	@$(GOLINT_PATH) > /dev/null 2>&1 || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b ./bin/
	@$(AIR_PATH) -v > /dev/null 2>&1 || curl -sSfL https://raw.githubusercontent.com/cosmtrek/air/master/install.sh | sh
	@$(BS_PATH) -v > /dev/null 2>&1 || npm install --prefix ./bin browser-sync
	
lint: ## 🔍 Lint & format check only, sets exit code on error for CI
	@figlet $@ || true
	$(GOLINT_PATH) run ./services/...

lint-fix: ## 📝 Lint & format, attempts to fix errors & modify code
	@figlet $@ || true
	$(GOLINT_PATH) run ./services/...--fix

images: ## 📦 Build all container images
	@figlet $@ || true
	docker compose -f build/compose.yaml build

images: ## 📦 Build all container images
	@figlet $@ || true
	docker compose -f build/compose.yaml build frontend

blah: ## 📦 Build all container images
	@figlet $@ || true
	docker compose -f build/compose.yaml up

run-api: ## 🎯 Run API service
	@figlet $@ || true
	@$(AIR_PATH) -c services/api/.air.toml

run-fe-host: ## 🔷 Run frontend HTTP server
	@figlet $@ || true
	@$(AIR_PATH) -c services/frontend/.air.toml

run-runner: ## 🏃 Run the monitor runner
	@figlet $@ || true
	@MONITOR_CHANGE_INTERVAL=10s $(AIR_PATH) -c services/runner/.air.toml

run-frontend: ## 🌐 Serve the frontend with a local dev server
	@figlet $@ || true
	@$(BS_PATH) start -s frontend --no-ui --watch --no-notify

run-db: ## 🍃 Run MongoDB in container (needs Docker)
	@figlet $@ || true
	@docker rm -f mongo || true
	@docker run --rm -it --network host -v ./_data:/data/db --name mongo mongo:6-jammy 