ifneq (,$(wildcard ./.env))
	include .env
	export
endif

# Common - can be overridden by .env file or when running make
VERSION ?= 0.0.6
BUILD_INFO ?= Local and manual build
AUTH_CLIENT_ID ?= 
AUTH_TENANT ?= common
API_ENDPOINT ?= http://localhost:8000/api

# Override these if building your own images
IMAGE_REG ?= ghcr.io
IMAGE_NAME ?= benc-uk/nanomon
IMAGE_TAG ?= latest

# Things you don't want to change
REPO_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
SVC_DIR := ./services
SPA_DIR := ./frontend
ESLINT_USE_FLAT_CONFIG := true

# Tools installed locally into repo, don't change
GOLINT_PATH := $(REPO_DIR)/bin/golangci-lint
AIR_PATH := $(REPO_DIR)/bin/air
BS_PATH := $(REPO_DIR)/bin/node_modules/.bin/browser-sync
ESLINT_PATH := $(REPO_DIR)/bin/node_modules/.bin/eslint
PRETTIER_PATH := $(REPO_DIR)/bin/node_modules/.bin/prettier
NEWMAN_PATH := $(REPO_DIR)/bin/node_modules/.bin/newman

.EXPORT_ALL_VARIABLES:
.PHONY: help images push lint lint-fix install-tools run-api run-db run-frontend run-runner build test
.DEFAULT_GOAL := help

help: ## 💬 This help message :)
	@figlet $@ || true
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install-tools: ## 🔮 Install dev tools into project bin directory
	@figlet $@ || true
	@$(GOLINT_PATH) > /dev/null 2>&1 || curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b ./bin/
	@$(AIR_PATH) -v > /dev/null 2>&1 || curl -sSfL https://raw.githubusercontent.com/cosmtrek/air/master/install.sh | sh
	@$(BS_PATH) -v > /dev/null 2>&1 || npm install --prefix ./bin browser-sync
	@$(ESLINT_PATH) -v > /dev/null 2>&1 || npm install --prefix ./bin eslint
	@$(PRETTIER_PATH) -v > /dev/null 2>&1 || npm install --prefix ./bin prettier
	@$(NEWMAN_PATH) -v > /dev/null 2>&1 || npm install --prefix ./bin newman
	
lint: ## 🔍 Lint & format check only, sets exit code on error for CI
	@figlet $@ || true
	@$(ESLINT_PATH) -c frontend/eslint.config.mjs ./frontend/
	@$(PRETTIER_PATH) ./frontend --check
	$(GOLINT_PATH) run

lint-fix: ## 📝 Lint & format, attempts to fix errors & modify code
	@figlet $@ || true
	@$(ESLINT_PATH) -c frontend/eslint.config.mjs ./frontend/ --fix
	@$(PRETTIER_PATH) ./frontend --write
	$(GOLINT_PATH) run --fix

build: ## 🔨 Build all binaries into ./bin/ directory
	@figlet $@ || true
	@mkdir -p bin
	@go build -o bin -ldflags "-X main.version=$(VERSION) -X 'main.buildInfo=$(BUILD_INFO)'" nanomon/services/...

images: ## 📦 Build all container images
	@figlet $@ || true
	docker compose -f build/compose.yaml build

image-standalone: ## 📦 Build the standalone image
	@figlet $@ || true
	docker compose -f build/compose.yaml build standalone

push: ## 📤 Push all container images
	@figlet $@ || true
	docker compose -f build/compose.yaml push

run-api: ## 🎯 Run API service locally with hot-reload
	@figlet $@ || true
	@$(AIR_PATH) -c services/api/.air.toml

run-runner: ## 🏃 Run monitor runner locally with hot-reload
	@figlet $@ || true
	@$(AIR_PATH) -c services/runner/.air.toml

run-frontend: ## 🌐 Run frontend with dev HTTP server & hot-reload
	@figlet $@ || true
	# Creating JSON config file for frontend
	@jq -n 'env | {API_ENDPOINT, AUTH_CLIENT_ID, VERSION, BUILD_INFO, AUTH_TENANT}' > frontend/config
	# Starting Browsersync
	@$(BS_PATH) start -s frontend --no-ui --watch --no-notify

run-db: ## 🍃 Run MongoDB in container (needs Docker)
	@figlet $@ || true
	@docker rm -f mongo || true
	@docker run --rm -it -p 27017:27017 -v nm-mongo-data:/bitnami/mongodb \
	-e MONGODB_REPLICA_SET_MODE=primary \
	-e MONGODB_ADVERTISED_HOSTNAME=localhost \
	-e ALLOW_EMPTY_PASSWORD=yes \
	--name mongo bitnami/mongodb:6.0

test: ## 🧪 Run all unit tests
	@figlet $@ || true
	@ALERT_SMTP_TO= go test -v ./... 

test-api: ## 🧪 Run API integration tests
	@figlet $@ || true
	@$(NEWMAN_PATH) run --env-var baseUrl=$(API_ENDPOINT) ./tests/test-suite-postman.json

generate: ## 🤖 Generate OpenAPI spec using TypeSpec
	@figlet $@ || true
	@cd api; npm install; ./node_modules/.bin/tsp compile ./nanomon.tsp --emit @typespec/openapi3
	@mv api/tsp-output/@typespec/openapi3/openapi.yaml api/openapi.yaml
	@rm -rf api/tsp-output

clean: ## 🧹 Clean up, remove dev data and files
	@figlet $@ || true
	@rm -rf bin
	@rm -rf frontend/config
	@rm -rf api/node_modules
	@docker volume rm nm-mongo-data || true