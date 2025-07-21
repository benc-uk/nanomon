-- Create database and user for Nanomon
-- This script is only used when standing your own PostgreSQL server
-- In normal use or deployment this SQL is never needed

CREATE DATABASE IF NOT EXISTS nanomon;
CREATE USER IF NOT EXISTS nanomon WITH PASSWORD 'nanomon';
GRANT ALL PRIVILEGES ON DATABASE nanomon TO nanomon;

-- SWITCH TO nanomon DATABASE
\c nanomon;
GRANT ALL ON SCHEMA public TO nanomon;