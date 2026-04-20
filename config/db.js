const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'saburi',
    database: process.env.DB_NAME || 'lost_found_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(connection => {
        console.log('\n' + '='.repeat(50));
        console.log('🚀 DATABASE CONNECTION ESTABLISHED');
        console.log(`📍 HOST:      ${process.env.DB_HOST || 'localhost'}`);
        console.log(`🗄️  DATABASE:  ${process.env.DB_NAME || 'lost_found_db'}`);
        console.log(`🔌 PORT:      ${process.env.DB_PORT || 3306}`);
        console.log('='.repeat(50) + '\n');
        connection.release();
    })
    .catch(err => {
        console.error('\n' + '!'.repeat(50));
        console.error('❌ DATABASE CONNECTION FAILED');
        console.error(`📍 HOST:      ${process.env.DB_HOST || 'localhost'}`);
        console.error(`🚨 ERROR:     ${err.message}`);
        console.error('!'.repeat(50) + '\n');
    });

module.exports = pool;
