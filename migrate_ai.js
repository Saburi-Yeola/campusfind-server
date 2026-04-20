
const db = require('./config/db');

async function migrateAI() {
    try {
        console.log('--- Migrating AI Features ---');
        
        try { await db.query("ALTER TABLE Lost_Items ADD COLUMN qr_code TEXT;"); } catch(e) {}
        try { await db.query("ALTER TABLE Found_Items ADD COLUMN qr_code TEXT;"); } catch(e) {}
        
        await db.query("CREATE TABLE IF NOT EXISTS Smart_Matches (id INT AUTO_INCREMENT PRIMARY KEY, lost_item_id INT, found_item_id INT, score FLOAT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);");
        
        console.log('✅ AI Schema Migration Successful!');
        process.exit(0);
    } catch (err) {
        console.error('❌ AI Migration Failed:', err.message);
        process.exit(1);
    }
}

migrateAI();
