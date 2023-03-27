# Monitr - Monitoring tool & microservices reference app

Monitr is a lightweight network and HTTP monitoring system, designed to be self hosted with Kubernetes (or other container based system). It is written in Go and based on the microservices pattern, as such it is decomposed into several discreet but interlinked components

## Architecture

Some picture here

## Concepts

Monitr executes monitoring calls remotely over the network using standard protocols, it does this periodically per monitor, and validates the results of the execution to determine the status or success. There are currently three statuses: **OK, Error** & **Failed**

### Monitor

A *monitor* represents an instance of a given monitor *type* (see below) with it's associated configuration. Common properties of all monitors include the interval on which they are run, and the target. The target is *type* dependant but typically is a hostname or URL.

### Result

When a *monitor* runs it generates a *result*. The *result* as the name implies, holds the results of a run of a monitor, such as the timestamp, status, message and a value. The value of a *result* is dependant on the type of *monitor* however it currently represents the duration of the execution in millseconds.

### Monitor Type

- HTTP
- Ping
- TCP

## Components

- **API** - REST API acting as interface for the frontend
- **Runner** - Monitors execute from here
- **Frontend** - The web interface, i.e. the HTML and JS
- **Frontend Host** - The server host for the frontend
- **MongoDB** - Backend data store

## Repo Index

## Getting Started

## Configuration

All configuration should be provided in the form of environmental variables

Env vars used by both API service and runner:

| _Name_        | _Description_                                | _Default_                 |
| ------------- | -------------------------------------------- | ------------------------- |
| MONGO_URI     | Connection string for MongoDB                | mongodb://localhost:27017 |
| MONGO_DB      | Database name to use                         | monitr                    |
| MONGO_TIMEOUT | Timeout for connecting to & querying MongoDB | 10s                       |

Env vars used by the API and frontend host:

| _Name_         | _Description_                 | _Default_   |
| -------------- | ----------------------------- | ----------- |
| PORT           | Port for service to listen on | 8001 & 8001 |
| AUTH_CLIENT_ID | Used to enable authentication | _blank_     |

Env vars used only by the frontend host:

| _Name_       | _Description_                                    | _Default_ |
| ------------ | ------------------------------------------------ | --------- |
| API_ENDPOINT | Instructs the frontend SPA where to find the API | /         |

Env vars used only by the runner:

| _Name_                  | _Description_                                     | _Default_ |
| ----------------------- | ------------------------------------------------- | --------- |
| MONITOR_CHANGE_INTERVAL | How frequently to check for configuration changes | 120s      |
