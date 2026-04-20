
const db = require('../config/db');

// Submit Claim
exports.submitClaim = async (req, res) => {
  const { item_id, item_type, answers, proof_image_url } = req.body;
  const claimer_id = req.user.id;

  try {
    // 1. Initial check: Claimer not the finder
    if (item_type === 'found') {
      const [fnders] = await db.query('SELECT finder_id FROM Found_Items WHERE id = ?', [item_id]);
      if (!fnders || fnders.length === 0) return res.status(404).json({ message: 'Item not found' });
      if (fnders[0].finder_id === claimer_id) {
        return res.status(400).json({ message: 'You cannot claim your own item' });
      }
    }

    // 2. Insert claim
    const [result] = await db.query(
      'INSERT INTO Claims (item_id, item_type, claimer_id, answers, proof_image_url) VALUES (?, ?, ?, ?, ?)',
      [item_id, item_type, claimer_id, JSON.stringify(answers), proof_image_url]
    );

    // 3. Notify the finder (owner)
    if (item_type === 'found') {
      const [fnders] = await db.query('SELECT finder_id FROM Found_Items WHERE id = ?', [item_id]);
      if (fnders && fnders.length > 0) {
        const finderId = fnders[0].finder_id;
        await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [finderId, 'Someone has claimed an item you found! Please review the claim.']);
      }
    } else if (item_type === 'lost') {
        const [owners] = await db.query('SELECT owner_id FROM Lost_Items WHERE id = ?', [item_id]);
        if (owners && owners.length > 0) {
            const ownerId = owners[0].owner_id;
            await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [ownerId, 'Someone suggests they found your lost item! Please review.']);
        }
    }

    res.status(201).json({ id: result?.insertId || Math.random(), message: 'Claim submitted successfully. Pending review.' });
  } catch (error) {
    console.error('Submit Claim error:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Review Claims (For Finders/Owners)
exports.getClaimsReview = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get claims where user is either the finder of a found item OR the owner of a lost item
    const [foundClaims] = await db.query(
      `SELECT c.*, u.name as claimer_name, f.title as item_title
       FROM Claims c
       JOIN Users u ON c.claimer_id = u.id
       JOIN Found_Items f ON c.item_id = f.id
       WHERE f.finder_id = ? AND c.item_type = "found"`, [userId]
    );

    const [lostClaims] = await db.query(
      `SELECT c.*, u.name as claimer_name, l.title as item_title
       FROM Claims c
       JOIN Users u ON c.claimer_id = u.id
       JOIN Lost_Items l ON c.item_id = l.id
       WHERE l.owner_id = ? AND c.item_type = "lost"`, [userId]
    );

    res.json({ foundClaims: foundClaims || [], lostClaims: lostClaims || [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching claims to review' });
  }
};

// Update Claim Status (Accept/Reject)
exports.updateClaimStatus = async (req, res) => {
  const { claim_id, status } = req.body; // status: accepted | rejected
  const userId = req.user.id;

  const connection = await db.getConnection();

  try {
    // 1. Fetch claim and item info to verify permissions
    const [claims] = await connection.query('SELECT * FROM Claims WHERE id = ?', [claim_id]);
    if (!claims || claims.length === 0) return res.status(404).json({ message: 'Claim not found' });
    const claim = claims[0];

    // Check if current user is item owner
    let isAuthorized = false;
    if (claim.item_type === 'found') {
        const [foundItems] = await connection.query('SELECT finder_id FROM Found_Items WHERE id = ?', [claim.item_id]);
        if (foundItems && foundItems.length > 0 && foundItems[0].finder_id === userId) isAuthorized = true;
    } else {
        const [lostItems] = await connection.query('SELECT owner_id FROM Lost_Items WHERE id = ?', [claim.item_id]);
        if (lostItems && lostItems.length > 0 && lostItems[0].owner_id === userId) isAuthorized = true;
    }

    if (!isAuthorized && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }

    // === START DATABASE TRANSACTION ===
    await connection.beginTransaction();

    // 2. Update claim status (This triggers 'after_claim_accepted' DBMS Trigger)
    await connection.query('UPDATE Claims SET status = ? WHERE id = ?', [status, claim_id]);

    // 3. Update Item status if accepted
    if (status === 'accepted') {
        if (claim.item_type === 'found') {
            await connection.query('UPDATE Found_Items SET status = "claimed" WHERE id = ?', [claim.item_id]);
        } else {
            await connection.query('UPDATE Lost_Items SET status = "matched" WHERE id = ?', [claim.item_id]);
            // For lost items, set reward status to approved if claim accepted
            await connection.query('UPDATE Claims SET reward_status = "approved" WHERE id = ?', [claim_id]);
        }

        // NOTE: Trust score increase is now handled by MySQL TRIGGER 'after_claim_accepted'
        // We removed the manual UPDATE Users... query from here for academic demonstration.
    }

    // 4. Notify claimer
    const notice = `Your claim for item #${claim.item_id} has been ${status}.`;
    await connection.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [claim.claimer_id, notice]);

    await connection.commit();
    res.json({ message: `Claim ${status} successfully. Identity Trust synchronized via DBMS Trigger.` });

  } catch (error) {
    await connection.rollback();
    console.error('Transaction Error:', error.message);
    res.status(500).json({ message: 'Error updating claim', error: error.message });
  } finally {
    connection.release();
  }
};
// Complete Reward (Owner only)
exports.completeReward = async (req, res) => {
    const { claim_id } = req.params;
    const userId = req.user.id;

    try {
        const [claims] = await db.query('SELECT * FROM Claims WHERE id = ?', [claim_id]);
        if (!claims || claims.length === 0) return res.status(404).json({ message: 'Claim not found' });
        const claim = claims[0];

        // Authorization check
        const [lostItems] = await db.query('SELECT owner_id FROM Lost_Items WHERE id = ?', [claim.item_id]);
        if (!lostItems || lostItems.length === 0 || lostItems[0].owner_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized. Only item owner can complete rewards.' });
        }

        // Update Reward Status
        await db.query('UPDATE Claims SET reward_status = "completed" WHERE id = ?', [claim_id]);

        // Trust Boost for Finder
        await db.query('UPDATE Users SET trust_score = trust_score + 20 WHERE id = ?', [claim.claimer_id]);

        res.json({ message: 'Reward marked as completed! Finder trust score boosted.' });
    } catch (error) {
        res.status(500).json({ message: 'Error completing reward', error: error.message });
    }
};

// Get Chat history (Allowed for item owner and authorized claimer)
exports.getChatHistory = async (req, res) => {
    const { claim_id } = req.params;
    const userId = req.user.id;

    try {
        // 1. Fetch claim details and check authorization
        const [claims] = await db.query('SELECT * FROM Claims WHERE id = ?', [claim_id]);
        if (!claims || claims.length === 0) return res.status(404).json({ message: 'Claim not found' });
        const claim = claims[0];

        if (claim.status !== 'accepted') {
             return res.status(403).json({ message: 'Chat is only available for accepted claims.' });
        }

        let isAuthorized = false;
        if (claim.claimer_id === userId) {
            isAuthorized = true;
        } else {
            if (claim.item_type === 'found') {
                const [foundItems] = await db.query('SELECT finder_id FROM Found_Items WHERE id = ?', [claim.item_id]);
                if (foundItems && foundItems.length > 0 && foundItems[0].finder_id === userId) isAuthorized = true;
            } else {
                const [lostItems] = await db.query('SELECT owner_id FROM Lost_Items WHERE id = ?', [claim.item_id]);
                if (lostItems && lostItems.length > 0 && lostItems[0].owner_id === userId) isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Unauthorized access to chat history.' });
        }

        // 2. Fetch history
        const [messages] = await db.query(
            `SELECT m.*, u.name as sender_name 
             FROM Chat_Messages m 
             JOIN Users u ON m.sender_id = u.id 
             WHERE m.claim_id = ? 
             ORDER BY m.timestamp ASC`,
            [claim_id]
        );

        res.json(messages || []);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat history', error: error.message });
    }
};

// Get My Claims (Where user is the claimer)
exports.getMyClaims = async (req, res) => {
    const userId = req.user.id;

    try {
        const [myClaims] = await db.query(
            `SELECT c.*, 
                COALESCE(l.title, f.title) as item_title, 
                COALESCE(l.image_url, f.image_url) as item_image
             FROM Claims c
             LEFT JOIN Lost_Items l ON c.item_id = l.id AND c.item_type = 'lost'
             LEFT JOIN Found_Items f ON c.item_id = f.id AND c.item_type = 'found'
             WHERE c.claimer_id = ?
             ORDER BY c.created_at DESC`,
            [userId]
        );
        res.json(myClaims || []);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching my claims', error: error.message });
    }
};
