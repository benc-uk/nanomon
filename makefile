# Common variables
VERSION := 0.0.1
BUILD_INFO := Manual build 
SVC_DIR := ./services
SPA_DIR := ./frontend

# Most likely want to override these when calling `make image`
IMAGE_REG ?= ghcr.io
IMAGE_REPO ?= monitr
IMAGE_TAG ?= latest
IMAGE_PREFIX := $(IMAGE_REG)/$(IMAGE_REPO)

# Things you don't want to change
REPO_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
# Tools
GOLINT_PATH := $(REPO_DIR)/bin/golangci-lint              # Remove if not using Go
AIR_PATH := $(REPO_DIR)/bin/air                           # Remove if not using Go
BS_PATH := $(REPO_DIR)/bin/node_modules/.bin/browser-sync # Remove if local server not needed

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
	@$(GOLINT_PATH) > /dev/null || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh
	cd $(SVC_DIR); $(GOLINT_PATH) run --modules-download-mode=mod *.go

lint-fix: ## 📝 Lint & format, attempts to fix errors & modify code
	@figlet $@ || true
	@$(GOLINT_PATH) > /dev/null || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh
	cd $(SVC_DIR); golangci-lint run --modules-download-mode=mod *.go --fix

image: ## 📦 Build container image from Dockerfile
	@figlet $@ || true
	docker build --file ./build/Dockerfile \
	--build-arg BUILD_INFO="$(BUILD_INFO)" \
	--build-arg VERSION="$(VERSION)" \
	--tag $(IMAGE_PREFIX):$(IMAGE_TAG) . 

push: ## 📤 Push container image to registry
	@figlet $@ || true
	docker push $(IMAGE_PREFIX):$(IMAGE_TAG)

build: ## 🔨 Run a local build without a container
	@figlet $@ || true
	@echo "Not implemented yet!"
	#go build -o __CHANGE_ME__ $(SVC_DIR)/...
	#cd $(SVC_DIR); npm run build

run-api: ## 🏃 Run API
	@figlet $@ || true
	@$(AIR_PATH) -c services/api/.air.toml

run-frontend: ## 🏃 Run FE Host
	@figlet $@ || true
	@$(AIR_PATH) -c services/frontend/.air.toml

run-runner: ## 🏃 Run runner
	@figlet $@ || true
	@$(AIR_PATH) -c services/runner/.air.toml

local-server: ## 🌐 Start a local HTTP server for development
	@figlet $@ || true
	@$(BS_PATH) start -s frontend --no-ui --watch --no-notify

run-db: ## 🍃 Run DB
	@figlet $@ || true
	docker run --rm -it --network host mongo:6-jammy