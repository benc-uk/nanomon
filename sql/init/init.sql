-- Create monitors table
CREATE TABLE monitors (
  monitor_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(255) NOT NULL,
  check_interval INT NOT NULL DEFAULT 60, -- interval in seconds
  timeout INT NOT NULL DEFAULT 5, -- timeout in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
); 

-- Create results table
CREATE TABLE results (
  result_id SERIAL PRIMARY KEY,
  monitor_id INT REFERENCES monitors(monitor_id),
  status_code INT,
  response_time INT, -- in milliseconds
  is_success BOOLEAN NOT NULL,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_monitor_id ON results(monitor_id);
CREATE INDEX idx_checked_at ON results(checked_at);

-- Function to notify on new monitor insertion
CREATE OR REPLACE FUNCTION notify_monitor_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification with the new monitor data as JSON
    PERFORM pg_notify('new_monitor', 
        json_build_object(
            'monitor_id', NEW.monitor_id,
            'name', NEW.name,
            'url', NEW.url,
            'check_interval', NEW.check_interval,
            'timeout', NEW.timeout,
            'created_at', NEW.created_at,
            'is_active', NEW.is_active
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify on monitor updates
CREATE OR REPLACE FUNCTION notify_monitor_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification with the updated monitor data as JSON
    PERFORM pg_notify('monitor_updated', 
        json_build_object(
            'monitor_id', NEW.monitor_id,
            'name', NEW.name,
            'url', NEW.url,
            'check_interval', NEW.check_interval,
            'timeout', NEW.timeout,
            'created_at', NEW.created_at,
            'last_updated', NEW.last_updated,
            'is_active', NEW.is_active,
            'old_data', json_build_object(
                'name', OLD.name,
                'url', OLD.url,
                'check_interval', OLD.check_interval,
                'timeout', OLD.timeout,
                'is_active', OLD.is_active
            )
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify on monitor deletion
CREATE OR REPLACE FUNCTION notify_monitor_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Send notification with the deleted monitor data as JSON
    PERFORM pg_notify('monitor_deleted', 
        json_build_object(
            'monitor_id', OLD.monitor_id,
            'name', OLD.name,
            'url', OLD.url,
            'check_interval', OLD.check_interval,
            'timeout', OLD.timeout,
            'created_at', OLD.created_at,
            'last_updated', OLD.last_updated,
            'is_active', OLD.is_active
        )::text
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after INSERT on monitors table
CREATE TRIGGER monitor_insert_trigger
    AFTER INSERT ON monitors
    FOR EACH ROW
    EXECUTE FUNCTION notify_monitor_insert();

-- Create trigger that fires after UPDATE on monitors table
CREATE TRIGGER monitor_update_trigger
    AFTER UPDATE ON monitors
    FOR EACH ROW
    EXECUTE FUNCTION notify_monitor_update();

-- Create trigger that fires after DELETE on monitors table
CREATE TRIGGER monitor_delete_trigger
    AFTER DELETE ON monitors
    FOR EACH ROW
    EXECUTE FUNCTION notify_monitor_delete();