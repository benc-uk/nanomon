## Project Overview

NanoMon is a lightweight network and HTTP monitoring system built with a microservices architecture. It monitors endpoints via HTTP, TCP, ping, DNS, and Prometheus queries, executing checks on configurable intervals and storing results in PostgreSQL.

### Architecture & Components

- **API** (`services/api/`) — RESTful Go service on port 8000, prefixed `/api`. Uses `chi` router, `go-rest-api` base package, and RFC 7807/9457 problem details for errors.
- **Runner** (`services/runner/`) — Long-running Go service that loads monitors from PostgreSQL, executes them on intervals, and saves results. Uses PostgreSQL `LISTEN`/`NOTIFY` (via `pq.Listener`) for real-time sync when monitors are created, updated, or deleted — no polling needed.
- **Frontend** (`frontend/`) — React 19 SPA built with TypeScript 5.9, Vite 7.3 and SWC. Uses Bootstrap 5.3 (Bootswatch Sandstone), FontAwesome 7, Chart.js, and react-router v7. Configuration is fetched from `/config.json` at runtime.
- **Frontend Host** (`services/frontend/`) — Simple Go static file server on port 8001 that serves the built frontend and exposes a `/config.json` endpoint reflecting environment variables.
- **PostgreSQL** — Backend database (v16/17). Schema in `sql/init/nanomon_init.sql` with two tables: `monitors` and `results`. Results use JSONB for `outputs`, and triggers fire `pg_notify()` for monitor CRUD events.

### Key Domain Concepts

- **Monitor** — A configured check with type, target, interval, properties (map[string]string), rule expression, and enabled flag. Five types: `http`, `ping`, `tcp`, `dns`, `prometheus`.
- **Result** — Output of a monitor run with date, status (0=OK, 1=Error, 2=Failed), value (typically response time in ms), message, and outputs (map[string]any stored as JSONB).
- **Rules** — Logical expressions evaluated via `github.com/Knetic/govaluate` against result outputs after each run. A false result sets status to Error.

### Database Schema

- `monitors` table: `id` (SERIAL PK), `name`, `type`, `interval`, `target`, `rule`, `enabled`, `updated`, `group_name`, `properties` (JSONB)
- `results` table: `id` (SERIAL PK), `date`, `monitor_id` (FK CASCADE), `monitor_name`, `monitor_target`, `status`, `value`, `message`, `outputs` (JSONB)
- Indexes on `results(monitor_id)` and `results(date)`
- Three notify trigger functions: `notify_monitor_insert`, `notify_monitor_update`, `notify_monitor_delete`
- Results denormalize `monitor_name` and `monitor_target` alongside `monitor_id`

### Dev Workflow & Tooling

- **Task runner**: [Just](https://just.systems) (`justfile` at project root). Key commands: `just run-all`, `just build`, `just lint`, `just test`, `just dev-tools`.
- **Hot reload**: Go services use `air` for hot reloading. Frontend uses Vite HMR on port 3000.
- **Environment**: Config via `.dev/.env` dotenv file (loaded by justfile). See `Configuration Reference` in the readme for all env vars.
- **Database**: Run locally via `just run-db` (Docker container with PostgreSQL 17).
- **Testing**: Unit tests via `just test` (`go test`). API integration tests via `just test-api` using HttpYac.
- **Linting**: `just lint` runs `golangci-lint` for Go and ESLint + Prettier for frontend.
- **API specification**: OpenAPI 3.0 spec at `api/openapi.yaml`, generated from TypeSpec (`api/typespec/main.tsp`) via `just generate-specs`. Bruno collections in `api/bruno/` for API testing.

## JavaScript & TypeScript Copilot Instructions

- When writing JavaScript or TypeScript code, always use `const` or `let` for variable declarations instead of `var`.
- Use arrow functions for anonymous functions to maintain a consistent coding style.
- Always use template literals (`` ` ``) for string interpolation instead of concatenation with `+`.
- Use destructuring assignment for objects and arrays where applicable to improve readability.
- Prefer using `for...of` loops for iterating over arrays instead of traditional `for` loops.
- Use `async/await` for asynchronous code instead of callbacks or `.then()` chaining for better readability.
- Do not ever assume you can use log.error() or log.warn() log.info() — these are not available in the codebase. Use console.log() instead or console.error() for error logging.
- Never add semicolons at the end of lines, as they are not used in the codebase.

### Frontend-Specific Patterns

- The frontend uses a `ServicesContext` and `ConfigContext` (in `providers.tsx`) with custom hooks `useAPI()` and `useConfig()` to access the API client and app configuration.
- The `APIClient` class extends `APIClientBase` with typed methods wrapping a generic `request<T>(path, method, payload, auth)` method that handles JSON parsing, error handling (RFC 7807 problem details), and optional Bearer token auth.
- Core types are defined in `types.ts`: `Monitor`, `MonitorFromDB`, `Result`, `ResultExtended`, `AppConfig`, `MonitorDefinitions`, plus status constants `StatusOK=0`, `StatusError=1`, `StatusFailed=2`.
- Authentication uses Azure MSAL (`@azure/msal-browser`, `@azure/msal-react`) and is optional — enabled when `AUTH_CLIENT_ID` is set. Use `AuthenticatedTemplate`/`UnauthenticatedTemplate` for conditional rendering.
- Vite config manually splits chunks for `chartjs`, `msalbrowser`, `fontawesome`, and `bootstrap`. The `config.json` file is external (runtime loaded, not bundled).
- React Router v7 with `BrowserRouter`. Route views are in `frontend/src/views/` and reusable components in `frontend/src/components/`.

## Go Copilot Instructions

- When writing Go code, always use `:=` for variable declarations unless the variable is already declared.
- Use `log.Printf()` and `log.Println()` for logging instead of `fmt.Printf()` or `fmt.Println()`.
- Use descriptive emoji prefixes in log messages to categorize them (e.g., `🚀` for startup, `💥` for errors, `✅` for success, `⚓` for cluster operations, `🔍` for data fetching).
- Avoid using global variables unless absolutely necessary; prefer passing variables as function parameters or through struct fields.
- When creating struct methods, use pointer receivers for methods that modify the struct or for consistency when other methods use pointer receivers.
- Use the package `github.com/benc-uk/go-rest-api` where applicable for API response handling and error management.
- Always handle errors explicitly and log them with appropriate context using `log.Printf()`.
- Use `context.TODO()` for context parameters when the context is not yet implemented, but prefer proper context propagation.
- When working with Kubernetes client-go, use `schema.GroupVersionResource` for dynamic client operations.
- Structure API handlers to return early on errors using guard clauses.
- Use the `chi` router for HTTP routing and parameter extraction with `chi.URLParam()`.
- Use meaningful variable names like `gvr` for GroupVersionResource, `ns` for namespace, `k` for Kubernetes service receiver.
- Prefer composition over inheritance — embed structs or interfaces when extending functionality.
- Use `make()` with capacity when you know the approximate size of slices/maps to improve performance.
- When building configuration from environment variables, provide sensible defaults and use `strconv` package for type conversions.
- Structure HTTP responses using a consistent JSON format and use appropriate HTTP status codes.
- When creating struct types, use clear, descriptive names and document exported fields with comments.
- Organize imports logically: standard library first, then third-party packages, then local packages with blank lines between groups.
- Use comprehensive file-level comments with banner formatting (`// ====...====`) to describe the purpose of each file.
- When creating HTTP middleware, use method receivers on the main API struct for consistency.
- Use enum-style constants with custom string types for event types and similar categorical data.
- Always validate required parameters (like namespace, clientID) at the beginning of HTTP handlers.
- Use the `problem` package for consistent error responses in APIs rather than generic `http.Error()`. Error responses must follow RFC 7807/9457 problem detail format using `problem.Wrap(statusCode, requestURI, category, err).Send(resp)`.
- Structure configuration parsing in a separate function that returns a config struct with all defaults applied.
- Use proper resource cleanup and context cancellation for long-running operations like informers.
- When creating factory patterns, use clear naming like `NewServiceName()` for constructors.
- Use blank identifiers (`_, _`) when you need to ignore return values but want to be explicit about it.

### API Service Patterns

- The `API` struct embeds `*api.Base` from `github.com/benc-uk/go-rest-api/pkg/api` plus a custom `*database.DB` field.
- Routes are split into `addAnonymousRoutes(chi.Router)` (GET-only: list, get, results) and `addProtectedRoutes(chi.Router)` (POST/PUT/DELETE for CRUD) as method receivers on the API struct.
- Use separate request/response payload structs (e.g., `MonitorReq`, `MonitorResp`) with JSON tags, plus converter functions like `MonitorToResp()`.
- Request structs should have a `validate()` method for input validation.
- Delete endpoints return `http.StatusNoContent` (204).
- Query parameters are read with `req.URL.Query().Get()` with sensible defaults and range validation.
- Authentication is optional JWT validation via `auth.NewJWTValidator()` on protected routes, driven by the `AUTH_CLIENT_ID` env var.

### Database Patterns

- The custom `DB` struct wraps `*sql.DB` (Handle field) + `*pq.Listener` + `Healthy` bool.
- Use `ConnectToDB()` factory which retries connection 6 times, 10 seconds apart.
- Use raw SQL with parameterized queries (`$1`, `$2`, etc.) — there is no ORM.
- JSONB fields (properties, outputs) are marshaled/unmarshaled with `encoding/json`.
- The `pq.Listener` is created automatically for PostgreSQL `LISTEN`/`NOTIFY` support.
- Background health pings run every 15 seconds to update the `Healthy` flag.

### Runner Patterns

- The runner dynamically manages monitors at runtime using PostgreSQL `LISTEN`/`NOTIFY` on channels: `new_monitor`, `monitor_updated`, `monitor_deleted`.
- Each monitor runs in its own goroutine with a `time.Ticker` for interval scheduling.
- Monitors are started with staggered 2-second delays to avoid burst load.
- The `OnRunEnd` callback on each monitor is used for alert checking.
- Graceful shutdown handles SIGINT/SIGTERM by stopping all monitors and closing DB connections.
- Use `github.com/benc-uk/go-rest-api/pkg/env` for reading environment variables with defaults.
