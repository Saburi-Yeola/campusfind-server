const db = require('./config/db');

async function fixUser() {
    const email = 'apekshabhapkar2025.it@mmcoe.edu.in';
    try {
        console.log(`🧹 Deleting existing user to allow clean signup: ${email}`);
        await db.query('DELETE FROM Users WHERE email = ?', [email]);
        console.log('✅ User deleted successfully. Please ask the user to SIGNUP again.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

fixUser();
