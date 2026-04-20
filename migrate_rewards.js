const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'saburi',
        database: process.env.DB_NAME || 'lost_found_db',
        port: process.env.DB_PORT || 3306
    });
    console.log('Migrating database (Safe Mode)...');
    try {
        const columnsToAdd = [
            { name: 'reward_amount', type: 'INT DEFAULT 0' },
            { name: 'reward_type', type: 'VARCHAR(50) DEFAULT "none"' },
            { name: 'reward_description', type: 'TEXT' }
        ];

        for (const col of columnsToAdd) {
            const [rows] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "Lost_Items" AND COLUMN_NAME = "${col.name}" AND TABLE_SCHEMA = "${process.env.DB_NAME || 'lost_found_db'}"`
            );
            if (rows.length === 0) {
                console.log(`Adding column ${col.name}...`);
                await connection.query(`ALTER TABLE Lost_Items ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`Column ${col.name} already exists.`);
            }
        }
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await connection.end();
    }
}
migrate();
