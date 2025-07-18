-- Insert a single monitor into the monitors table
--INSERT INTO monitors (name, type, interval, target, rule, enabled, group_name, properties) 
--VALUES ('Example Monitor', 'http', '60s', 'https://example.com', 'status == 200', TRUE, 'default', '{"custom_property": "value"}');

------

TRUNCATE monitors CASCADE;
