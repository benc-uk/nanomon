# Common variables
VERSION := 0.0.1
BUILD_INFO := Local and manual build
SVC_DIR := ./services
SPA_DIR := ./frontend

# Override these if building your own images
IMAGE_REG ?= ghcr.io
IMAGE_NAME ?= benc-uk/monitr
IMAGE_TAG ?= latest

# Things you don't want to change
REPO_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
# Tools
GOLINT_PATH := $(REPO_DIR)/bin/golangci-lint
AIR_PATH := $(REPO_DIR)/bin/air
BS_PATH := $(REPO_DIR)/bin/node_modules/.bin/browser-sync

.EXPORT_ALL_VARIABLES:
.PHONY: help images push lint lint-fix install-tools run-api run-db run-frontend run-runner
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
	$(GOLINT_PATH) run

lint-fix: ## 📝 Lint & format, attempts to fix errors & modify code
	@figlet $@ || true
	$(GOLINT_PATH) run --fix

images: ## 📦 Build all container images
	@figlet $@ || true
	docker compose -f build/compose.yaml build
	
push: ## 📤 Push all container images
	@figlet $@ || true
	docker compose -f build/compose.yaml push

run-api: ## 🎯 Run API service locally with hot-reload
	@figlet $@ || true
	@$(AIR_PATH) -c services/api/.air.toml

run-runner: ## 🏃 Run the monitor runner locally with hot-reload
	@figlet $@ || true
	@MONITOR_CHANGE_INTERVAL=20s $(AIR_PATH) -c services/runner/.air.toml

run-frontend: ## 🌐 Serve the frontend with a local dev server with hot-reload
	@figlet $@ || true
	@$(BS_PATH) start -s frontend --no-ui --watch --no-notify

run-db: ## 🍃 Run MongoDB in container (needs Docker)
	@figlet $@ || true
	@docker rm -f mongo || true
	@docker run --rm -it --network host -v ./_data:/data/db --name mongo mongo:6-jammy 