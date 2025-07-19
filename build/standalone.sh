#!/bin/bash

# Script used by the standalone container only
# Where all four components run inside a single container

echo "==== Standalone NanoMon container script ===="

# Start PostgreSQL
echo "Starting PostgreSQL..."

# Set up environment
export PGDATA=/var/lib/postgresql/data

# Ensure data directory exists and has correct permissions
mkdir -p "$PGDATA"
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"

# Initialize the database 
echo "Initializing PostgreSQL database..."
su postgres -c "/usr/lib/postgresql/*/bin/initdb -D $PGDATA --auth-local=trust --auth-host=trust"

# Start PostgreSQL server
echo "Starting PostgreSQL server..."
su postgres -c "/usr/lib/postgresql/*/bin/pg_ctl -D $PGDATA -l $PGDATA/logfile start"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until su postgres -c "/usr/lib/postgresql/*/bin/pg_isready -h localhost"; do
    sleep 1
done

# Create the nanomon database 
echo "Creating nanomon database..."
su postgres -c "/usr/lib/postgresql/*/bin/createdb nanomon" 

# Run any SQL in /docker-entrypoint-initdb.d/
for file in /docker-entrypoint-initdb.d/*.sql; do
    if [ -f "$file" ]; then
        echo "Running SQL script: $file"
        su postgres -c "/usr/lib/postgresql/*/bin/psql -d nanomon -f $file"
    fi
done

echo "PostgreSQL is ready!"

echo "Starting Frontend..."
./frontend -dir ./dist &

echo "Starting runner..."
./runner &

echo "Starting API..."
./api 
