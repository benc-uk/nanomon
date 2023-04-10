#!/bin/bash

# Script used by the standalone container only
# Where all four components run inside a single container

echo "==== Standalone NanoMon container script ===="

# if NO_MONGO is set then DONT start the database
if [[ -z "$NO_MONGO" ]]; then
    echo "Starting MongoDB..."
    /opt/bitnami/mongodb/bin/mongod --dbpath /bitnami/mongodb > /dev/null &

else
    echo "MongoDB will not be started"
fi

echo "Starting Frontend..."
./frontend &

echo "Starting runner..."
./runner &

echo "Starting API..."
./api 
