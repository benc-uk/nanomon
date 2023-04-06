#!/bin/bash

# Script used by the standalone container only
# Where all four components run inside a single container

echo "==== Standalone NanoMon container script ===="

mongod --dbpath /bitnami/mongodb > /dev/null &

echo "Starting Frontend..."
./frontend &

echo "Starting runner..."
./runner &

echo "Starting API..."
./api 
