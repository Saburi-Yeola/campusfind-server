const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'saburi',
        database: process.env.DB_NAME || 'lost_found_db'
    });
    console.log('Checking Lost_Items schema...');
    try {
        const [columns] = await connection.query('DESCRIBE Lost_Items');
        console.log(JSON.stringify(columns, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}
checkSchema();
