const db = require('./config/db');

async function promoteAdmin(email) {
    try {
        console.log(`Promoting ${email} to admin...`);
        const [result] = await db.query("UPDATE Users SET role = 'admin' WHERE email = ?", [email]);
        if (result.affectedRows > 0) {
            console.log(`✅ Success! ${email} is now an admin.`);
        } else {
            console.log(`❌ User with email ${email} not found.`);
        }
    } catch (err) {
        console.error("Failed to promote user:", err.message);
    } finally {
        process.exit();
    }
}

const email = process.argv[2] || 'test_user_1@mmcoe.edu.in';
promoteAdmin(email);
