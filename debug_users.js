const db = require('./config/db');

async function checkUsers() {
    try {
        const [rows] = await db.query('SELECT name, email FROM Users');
        console.log('--- USERS IN DATABASE ---');
        console.table(rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkUsers();
