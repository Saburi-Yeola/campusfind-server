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
    console.log('Migrating Database: Adding qr_code column...');
    try {
        const tables = ['Lost_Items', 'Found_Items'];

        for (const table of tables) {
            const [rows] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "${table}" AND COLUMN_NAME = "qr_code" AND TABLE_SCHEMA = "${process.env.DB_NAME || 'lost_found_db'}"`
            );
            if (rows.length === 0) {
                console.log(`Adding qr_code to ${table}...`);
                await connection.query(`ALTER TABLE ${table} ADD COLUMN qr_code TEXT`);
            } else {
                console.log(`qr_code already exists in ${table}.`);
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
