const db = require('./config/db');

async function migrate() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS Chat_Messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                claim_id INT NOT NULL,
                sender_id INT NOT NULL,
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (claim_id) REFERENCES Claims(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE CASCADE
            );
        `);
        console.log("Chat_Messages table created successfully.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
