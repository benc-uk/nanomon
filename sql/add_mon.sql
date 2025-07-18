-- -- Insert a single monitor into the monitors table
-- INSERT INTO monitors (name,url,check_interval,timeout,is_active 
-- ) VALUES (
--     'Example Website',
--     'https://example.com',
--     60,
--     5,
--     true
-- );

-- ---

UPDATE monitors SET
    name = 'Updated Website',
    url = 'https://updated-example.com',
    check_interval = 120,
    timeout = 10,
    is_active = false
WHERE monitor_id = 8;

