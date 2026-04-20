
-- MMCOE Hub: Core Table Visualizer (CMD-Optimized)
-- Run this in CMD using: SOURCE report.sql;

SELECT 'MMCOE HUB - RECENT LOST REPORTS' AS Hub_Status;

SELECT 
    id AS ID,
    LEFT(title, 20) AS 'Item_Name',
    category AS Category,
    location_lost AS 'Loss_Zone',
    LEFT(image_url, 30) AS 'Photo_Link...',
    status AS Status
FROM Lost_Items 
ORDER BY created_at DESC 
LIMIT 5;

SELECT '-----------------------------------------' AS Divider;

SELECT 'MMCOE HUB - RECENT FOUND REPORTS' AS Hub_Status;

SELECT 
    id AS ID,
    title AS 'Discovery_Asset',
    location_found AS 'Found_Zone',
    LEFT(hidden_description, 20) AS 'Proof_Proof',
    status AS 'Hub_Status'
FROM Found_Items 
ORDER BY created_at DESC
LIMIT 5;

SELECT '-----------------------------------------' AS Divider;

SELECT 'MMCOE HUB - ACTIVE USER TRUST SCORES' AS Hub_Status;

SELECT 
    id AS ID,
    name AS Student,
    email AS MMCOE_Email,
    trust_score AS 'Trust_Level',
    role AS Auth_Tier
FROM Users;
