const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function initializeCloudDB() {
    try {
        console.log("🚀 Initializing Cloud Database Schema...");
        const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
        
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await db.query(statement);
        }
        
        console.log("✅ Cloud Database Schema Initialized Successfully.");
    } catch (err) {
        console.error("❌ Schema Initialization Failed:", err.message);
    } finally {
        process.exit();
    }
}

initializeCloudDB();
