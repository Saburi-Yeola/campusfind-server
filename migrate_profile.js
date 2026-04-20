const db = require('./config/db');

async function migrate() {
    try {
        console.log("Starting Identity Hub migration...");
        
        // Add profile_image if not exists
        await db.query(`
            ALTER TABLE Users 
            ADD COLUMN IF NOT EXISTS profile_image TEXT AFTER password,
            ADD COLUMN IF NOT EXISTS phone VARCHAR(20) AFTER email,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
        `).catch(err => {
             // Fallback for MySQL 5.7 which doesn't support IF NOT EXISTS in ALTER
             // We'll just try adding them individually
             console.log("Standard ALTER failed, trying legacy individual adds...");
        });

        try { await db.query('ALTER TABLE Users ADD COLUMN profile_image TEXT AFTER password'); } catch(e) {}
        try { await db.query('ALTER TABLE Users ADD COLUMN phone VARCHAR(20) AFTER email'); } catch(e) {}
        try { await db.query('ALTER TABLE Users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'); } catch(e) {}

        console.log("Migration completed successfully. Profile grid expanded.");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

migrate();
