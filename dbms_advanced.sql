
-- MMCOE Hub: Advanced DBMS Intelligence Layer
-- Run this in CMD using: SOURCE dbms_advanced.sql;

-- HALL OF FAME: Leaderboard Table for Events
CREATE TABLE IF NOT EXISTS HallOfFame (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    score INT,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- =============================================
-- PART 1: TRIGGERS (Spatial & Identity Automation)
-- =============================================

-- T1: Trust Score Synchronization
-- Automatically boosts trust score of claimer when their proof is accepted
DELIMITER //
CREATE TRIGGER after_claim_accepted
AFTER UPDATE ON Claims
FOR EACH ROW
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        UPDATE Users 
        SET trust_score = trust_score + 25
        WHERE id = NEW.claimer_id;
    END IF;
END //
DELIMITER ;

-- T2: Auto Incident Logging
-- Logs activity when a new item is entered into the Hub
DELIMITER //
CREATE TRIGGER after_item_returned
AFTER UPDATE ON Lost_Items
FOR EACH ROW
BEGIN
    IF NEW.status = 'returned' AND OLD.status != 'returned' THEN
        INSERT INTO Notifications (user_id, message)
        VALUES (NEW.owner_id, 'Protocol Complete: Your asset recovery lifecycle has reached "Closed" status.');
    END IF;
END //
DELIMITER ;


-- =============================================
-- PART 2: STORED PROCEDURES (Complex Logic Abstraction)
-- =============================================

-- SP1: Discovery Engine Hotspots
DELIMITER //
CREATE PROCEDURE GetHotspots()
BEGIN
    SELECT location, COUNT(*) AS intensity_score
    FROM (
        SELECT location_lost AS location FROM Lost_Items
        UNION ALL
        SELECT location_found AS location FROM Found_Items
    ) combined_hub
    WHERE location IS NOT NULL AND location != ''
    GROUP BY location
    ORDER BY intensity_score DESC
    LIMIT 10;
END //
DELIMITER ;

-- SP2: Hub Lifecycle Cleanup
DELIMITER //
CREATE PROCEDURE CleanupOldData()
BEGIN
    -- Remove returned items older than 90 days to maintain peak performance
    DELETE FROM Lost_Items WHERE status = 'returned' AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    DELETE FROM Found_Items WHERE status = 'returned' AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
END //
DELIMITER ;


-- =============================================
-- PART 3: VIEWS (Security Abstraction)
-- =============================================

-- V1: Public Discovery Feed (Censors hidden details)
CREATE OR REPLACE VIEW PublicFoundFeed AS
SELECT 
    id, title, category, location_found, visible_description, image_url, status
FROM Found_Items
WHERE status = 'found';

-- V2: High Priority Assets (Alerts for rewards > 500)
CREATE OR REPLACE VIEW HighValueAlerts AS
SELECT title, location_lost, reward_amount, reward_type
FROM Lost_Items
WHERE reward_amount >= 500 AND status = 'lost';


-- =============================================
-- PART 4: EVENTS (Scheduled Discovery Tasks)
-- =============================================

-- ENABLING EVENT SCHEDULER
SET GLOBAL event_scheduler = ON;

-- E1: Daily Hub Maintenance
CREATE EVENT daily_hub_maintenance
ON SCHEDULE EVERY 1 DAY
DO
  CALL CleanupOldData();

-- E2: Monthly Hall of Fame Synchronization
CREATE EVENT sync_monthly_leaderboard
ON SCHEDULE EVERY 1 MONTH
DO
  INSERT INTO HallOfFame (user_id, score)
  SELECT id, trust_score FROM Users
  ORDER BY trust_score DESC LIMIT 3;
