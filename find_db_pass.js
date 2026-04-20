const mysql = require('mysql2/promise');

async function testConnection(password) {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: password
        });
        console.log(`Success with password: "${password}"`);
        await connection.end();
        return true;
    } catch (err) {
        console.log(`Failed with password: "${password}" - ${err.message}`);
        return false;
    }
}

async function run() {
    const passwords = ['Apeksha15', 'saburi', 'root', 'password', '', 'mysql', '12345678', '1234'];
    for (const p of passwords) {
        if (await testConnection(p)) break;
    }
}

run();
