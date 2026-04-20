
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');

const runExpiryPurge = async () => {
    console.log(`\x1b[33m[HUB MAINTENANCE] Starting 30-day auto-expiry scan...\x1b[0m`);
    
    try {
        // 1. Process Lost Items
        const [expiredLost] = await db.query(
            "SELECT id, owner_id, title, image_url FROM Lost_Items WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND status != 'returned'"
        );

        for (const item of expiredLost) {
            await purgeItem(item, 'lost', item.owner_id);
        }

        // 2. Process Found Items
        const [expiredFound] = await db.query(
            "SELECT id, finder_id as owner_id, title, image_url FROM Found_Items WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND status != 'returned'"
        );

        for (const item of expiredFound) {
            await purgeItem(item, 'found', item.owner_id);
        }

        if (expiredLost.length > 0 || expiredFound.length > 0) {
            console.log(`\x1b[32m[HUB MAINTENANCE] Purge complete. ${expiredLost.length} lost items and ${expiredFound.length} found items removed.\x1b[0m`);
        } else {
            console.log(`\x1b[36m[HUB MAINTENANCE] No expired items found. Hub database is healthy.\x1b[0m`);
        }
    } catch (err) {
        console.error(`\x1b[31m[HUB MAINTENANCE ERROR] Purge process failed:`, err.message, `\x1b[0m`);
    }
};

const purgeItem = async (item, type, userId) => {
    try {
        const table = type === 'lost' ? 'Lost_Items' : 'Found_Items';
        
        // A. Notify User (Keep this record)
        const expiryMessage = `Hub Cleanup: Your ${type} item report for "${item.title}" has reached its 30-day limit and has been permanently purged from the Hub's active database.`;
        await db.query(
            "INSERT INTO Notifications (user_id, message) VALUES (?, ?)",
            [userId, expiryMessage]
        );

        // B. Cloudinary Cleanup
        if (item.image_url && item.image_url.includes('cloudinary')) {
            try {
                const parts = item.image_url.split('/');
                const fileName = parts[parts.length - 1].split('.')[0];
                const folder = parts[parts.length - 2];
                const publicId = `${folder}/${fileName}`;
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.warn(`[HUB MAINTENANCE] Image cleanup failed for item ${item.id}:`, err.message);
            }
        }

        // C. Cleanup Related Database Records (Claims & Messages)
        // Find claims for this item
        const [claims] = await db.query(
            "SELECT id FROM Claims WHERE item_id = ? AND item_type = ?",
            [item.id, type]
        );

        for (const claim of claims) {
            // Delete messages for this claim
            await db.query("DELETE FROM Chat_Messages WHERE claim_id = ?", [claim.id]);
        }

        // Delete all claims for this item
        await db.query(
            "DELETE FROM Claims WHERE item_id = ? AND item_type = ?",
            [item.id, type]
        );

        // D. Final Item Purge
        await db.query(`DELETE FROM ${table} WHERE id = ?`, [item.id]);

    } catch (err) {
        console.error(`[HUB MAINTENANCE] Failed to purge item ${item.id}:`, err.message);
    }
};

// Initialize the maintenance task
const initExpiryService = () => {
    // Run once on startup
    setTimeout(runExpiryPurge, 5000); 
    
    // Run every 24 hours
    setInterval(runExpiryPurge, 24 * 60 * 60 * 1000);
};

module.exports = { initExpiryService };
