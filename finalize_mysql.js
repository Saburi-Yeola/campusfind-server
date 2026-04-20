const db = require('./config/db');

async function setup() {
    try {
        console.log("🛠️ Starting MySQL Schema Finalization...");
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS Chat_Messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                claim_id INT NOT NULL,
                sender_id INT NOT NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (claim_id) REFERENCES Claims(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE CASCADE
            )
        `);
        
        console.log("✅ Chat_Messages table is active and verified.");
        
        const [tables] = await db.query("SHOW TABLES");
        console.log("📋 Current Tables in MySQL:", tables.map(t => Object.values(t)[0]).join(', '));
        
    } catch (err) {
        console.error("❌ Schema verification failed:", err.message);
    } finally {
        process.exit();
    }
}

setup();
