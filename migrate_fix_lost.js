const db = require('./config/db');

async function fixLostTable() {
    try {
        console.log('🚀 Fixing Lost_Items table for Postgres...');
        
        // Add reward columns if they don't exist
        // Note: In Postgres, we can only add one column at a time with ALTER TABLE in some environments, 
        // or use multiple ADD COLUMN.
        await db.query(`ALTER TABLE Lost_Items ADD COLUMN IF NOT EXISTS reward_amount INT DEFAULT 0`);
        await db.query(`ALTER TABLE Lost_Items ADD COLUMN IF NOT EXISTS reward_type VARCHAR(20) DEFAULT 'cash'`);
        await db.query(`ALTER TABLE Lost_Items ADD COLUMN IF NOT EXISTS reward_description TEXT`);
        await db.query(`ALTER TABLE Lost_Items ADD COLUMN IF NOT EXISTS qr_code TEXT`);

        // Add columns to Found_Items too if missing
        await db.query(`ALTER TABLE Found_Items ADD COLUMN IF NOT EXISTS qr_code TEXT`);
        
        // Add columns to Claims
        await db.query(`ALTER TABLE Claims ADD COLUMN IF NOT EXISTS reward_status VARCHAR(20) DEFAULT 'pending'`);

        console.log('✅ Lost_Items table updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Table fix failed:', err.message);
        process.exit(1);
    }
}

fixLostTable();
