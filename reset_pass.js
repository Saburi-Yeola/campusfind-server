const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetPassword(email, newPassword) {
    try {
        console.log(`Resetting password for ${email}...`);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await db.query("UPDATE Users SET password = ? WHERE email = ?", [hashedPassword, email]);
        if (result.affectedRows > 0) {
            console.log(`✅ Success! Password for ${email} is now "${newPassword}".`);
        } else {
            console.log(`❌ User with email ${email} not found.`);
        }
    } catch (err) {
        console.error("Failed to reset password:", err.message);
    } finally {
        process.exit();
    }
}

resetPassword('test_user_1@mmcoe.edu.in', 'admin123');
