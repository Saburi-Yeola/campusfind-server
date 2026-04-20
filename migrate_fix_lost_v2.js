const db = require('./config/db');

async function fixLostTable() {
    try {
        console.log('🚀 Fixing Database Schema for Postgres...');
        
        // Use standard SQL that works on Postgres
        // We add columns one by one to avoid ambiguity
        const queries = [
            `ALTER TABLE Lost_Items ADD COLUMN IF NOT EXISTS reward_amount INT DEFAULT 0`,
            `ALTER TABLE Lost_Items ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50) DEFAULT 'cash'`,
            `ALTER TABLE Lost_Items ADD COLUMN IF NOT EXISTS reward_description TEXT`,
            `ALTER TABLE Lost_Items ADD COLUMN IF NOT EXISTS qr_code TEXT`,
            `ALTER TABLE Found_Items ADD COLUMN IF NOT EXISTS qr_code TEXT`,
            `ALTER TABLE Claims ADD COLUMN IF NOT EXISTS reward_status VARCHAR(50) DEFAULT 'pending'`
        ];

        for (const sql of queries) {
            try {
                await db.query(sql);
                console.log(`✅ Success: ${sql}`);
            } catch (e) {
                console.warn(`⚠️ Skipping/Failed: ${sql} - ${e.message}`);
            }
        }

        console.log('✅ Database schema correction complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Critical failure in fix script:', err.message);
        process.exit(1);
    }
}

fixLostTable();
