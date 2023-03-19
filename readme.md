# Monitr - A simple monitoring system & microservices reference app

## Components

- API
- Runner
- Frontend
- Frontend Host
- MongoDB

## Configuration

All configuration should be provided in the form of environmental variables

Env vars used by both API service and runner:

| _Name_        | _Description_                                | _Default_                 |
| ------------- | -------------------------------------------- | ------------------------- |
| MONGO_URI     | Connection string for MongoDB                | mongodb://localhost:27017 |
| MONGO_DB      | Database name to use                         | monitr                    |
| MONGO_TIMEOUT | Timeout for connecting to & querying MongoDB | 10s                       |

Env vars used only by the API:

| _Name_         | _Description_                 | _Default_ |
| -------------- | ----------------------------- | --------- |
| PORT           | Port for service to listen on | 8000      |
| AUTH_CLIENT_ID | Used to enable authentication | _blank_   |

Env vars used only by the runner:

| _Name_                  | _Description_                                     | _Default_ |
| ----------------------- | ------------------------------------------------- | --------- |
| MONITOR_CHANGE_INTERVAL | How frequently to check for configuration changes | 120s      |
