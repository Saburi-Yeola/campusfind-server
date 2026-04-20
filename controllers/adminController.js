
const db = require('../config/db');

const getGlobalStats = async (req, res) => {
    try {
        const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) as totalUsers FROM Users');
        const [[{ totalLost }]] = await db.query('SELECT COUNT(*) as totalLost FROM Lost_Items');
        const [[{ totalFound }]] = await db.query('SELECT COUNT(*) as totalFound FROM Found_Items');
        
        // Count resolved items (either lost or found with returned status)
        const [[{ resolvedLost }]] = await db.query("SELECT COUNT(*) as resolvedLost FROM Lost_Items WHERE status = 'returned'");
        const [[{ resolvedFound }]] = await db.query("SELECT COUNT(*) as resolvedFound FROM Found_Items WHERE status = 'returned'");
        
        const totalResolved = resolvedLost + resolvedFound;

        res.json({
            totalUsers,
            totalLost,
            totalFound,
            totalResolved,
            recentActivity: {
                lost: totalLost,
                found: totalFound
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database Error" });
    }
};

const getAllItems = async (req, res) => {
    try {
        const [lostItems] = await db.query('SELECT id, title as item_name, description, status, created_at, "lost" as type FROM Lost_Items ORDER BY created_at DESC LIMIT 50');
        const [foundItems] = await db.query('SELECT id, title as item_name, visible_description as description, status, created_at, "found" as type FROM Found_Items ORDER BY created_at DESC LIMIT 50');
        res.json([...lostItems, ...foundItems].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
        console.error("DEBUG: getAllItems error:", err);
        res.status(500).json({ message: "Database Error", error: err.message });
    }
};

const deleteItem = async (req, res) => {
    const { type, id } = req.params;
    try {
        const table = type === 'lost' ? 'Lost_Items' : 'Found_Items';
        
        // Delete related claims first (as they don't have FK constraints but refer to this ID)
        await db.query('DELETE FROM Claims WHERE item_id = ? AND item_type = ?', [id, type]);
        
        // Delete the item
        await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        
        res.json({ message: "Item and associated claims deleted successfully from database." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Deletion failed." });
    }
};

const updateClaim = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get claim info
        const [[claim]] = await connection.query('SELECT * FROM Claims WHERE id = ?', [id]);
        if (!claim) return res.status(404).json({ message: "Claim not found" });

        // 2. Update claim status
        await connection.query('UPDATE Claims SET status = ? WHERE id = ?', [status, id]);

        // 3. Update Item status if accepted
        if (status === 'accepted') {
            if (claim.item_type === 'found') {
                await connection.query('UPDATE Found_Items SET status = "claimed" WHERE id = ?', [claim.item_id]);
            } else {
                await connection.query('UPDATE Lost_Items SET status = "matched" WHERE id = ?', [claim.item_id]);
            }
        }

        // 4. Notify parties
        await connection.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [claim.claimer_id, `Hub Admin has ${status} your claim for item #${claim.item_id}.`]);

        // Also notify the original reporter
        let reporterId;
        if (claim.item_type === 'found') {
            const [[item]] = await connection.query('SELECT finder_id FROM Found_Items WHERE id = ?', [claim.item_id]);
            reporterId = item?.finder_id;
        } else {
            const [[item]] = await connection.query('SELECT owner_id FROM Lost_Items WHERE id = ?', [claim.item_id]);
            reporterId = item?.owner_id;
        }

        if (reporterId) {
            await connection.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [reporterId, `A claim for your reported item #${claim.item_id} has been ${status} by the Hub Admin.`]);
        }

        await connection.commit();
        res.json({ message: `Claim ${status} successfully by Administrator.` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Update failed." });
    } finally {
        if (connection) connection.release();
    }
};

const getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, email, phone, trust_score, role FROM Users ORDER BY trust_score DESC');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database Error" });
    }
};

const updateTrustScore = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
        await db.query('UPDATE Users SET trust_score = trust_score + ? WHERE id = ?', [amount, id]);
        res.json({ message: "Trust Score updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Update failed." });
    }
};

const banUser = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE Users SET role = "banned" WHERE id = ?', [id]);
        res.json({ message: "User identity suspended from the hub." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Suspension failed." });
    }
};

const getAllClaims = async (req, res) => {
    try {
        const [claims] = await db.query(`
            SELECT c.*, u.name as claimer_name, 
                   COALESCE(l.title, f.title) as item_title
            FROM Claims c
            JOIN Users u ON c.claimer_id = u.id
            LEFT JOIN Lost_Items l ON c.item_id = l.id AND c.item_type = 'lost'
            LEFT JOIN Found_Items f ON c.item_id = f.id AND c.item_type = 'found'
            ORDER BY c.created_at DESC
        `);
        res.json(claims);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database Error" });
    }
};

module.exports = { getGlobalStats, getAllItems, deleteItem, getAllUsers, updateTrustScore, banUser, getAllClaims, updateClaim };
