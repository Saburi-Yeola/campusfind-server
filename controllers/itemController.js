
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { generateQR, findMatches, enhanceDescription } = require('../utils/aiEngine');

// Helper for Cloudinary streaming
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

// Post Lost Item
const postLostItem = async (req, res) => {
  const { title, description, category, location_lost, date_lost, reward_amount, reward_type, reward_description } = req.body;
  const owner_id = req.user?.id;

  if (!title || !category || !location_lost || !date_lost) {
      return res.status(400).json({ success: false, message: "Missing required fields: title, category, location, and date are required." });
  }

  try {
    let image_url = null;
    if (req.file) {
      try {
          image_url = await uploadToCloudinary(req.file.buffer, 'lost_items_hub');
      } catch (uploadErr) {
          console.error("Cloudinary Upload Error:", uploadErr);
          return res.status(500).json({ success: false, message: "Image processing failed. Try a smaller image or skip the upload." });
      }
    }

    const enhancedDescription = enhanceDescription(description || '');

    const [result] = await db.query(
      'INSERT INTO Lost_Items (title, description, category, location_lost, date_lost, image_url, owner_id, reward_amount, reward_type, reward_description, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, enhancedDescription, category, location_lost, date_lost, image_url, owner_id, reward_amount || 0, reward_type || 'cash', reward_description || '', 'pending']
    );

    const itemId = result?.insertId;
    if (itemId) {
      const qrData = await generateQR(itemId, 'lost');
      await db.query('UPDATE Lost_Items SET qr_code = ? WHERE id = ?', [qrData, itemId]);
    }

    const [matches] = await db.query(
      'SELECT * FROM Found_Items WHERE category = ? AND (LOWER(location_found) LIKE LOWER(?) OR LOWER(visible_description) LIKE LOWER(?)) AND status = \'found\'',
      [category, `%${location_lost}%`, `%${category}%`]
    );

    if (matches && matches.length > 0) {
      const notificationMessage = `We found ${matches.length} matches for your lost ${category}. Please check the found items section!`;
      await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [owner_id, notificationMessage]);
    }

    res.status(201).json({
      success: true,
      id: itemId || Math.random(),
      message: 'Lost item reported successfully',
      matches: matches?.length || 0
    });
  } catch (error) {
    console.error('Post Lost Item Database error:', error);
    res.status(500).json({ success: false, message: 'Database synchronization failed while reporting the lost item.', details: error.message });
  }
};

// Post Found Item
const postFoundItem = async (req, res) => {
  const { title, hidden_description, visible_description, location_found, date_found, category } = req.body;
  const finder_id = req.user?.id;

  if (!title || !category || !location_found || !date_found) {
      return res.status(400).json({ success: false, message: "Missing required fields: title, category, location, and date are required." });
  }

  try {
    let image_url = null;
    if (req.file) {
      try {
          image_url = await uploadToCloudinary(req.file.buffer, 'found_items_hub');
      } catch (uploadErr) {
          console.error("Cloudinary Upload Error:", uploadErr);
          return res.status(500).json({ success: false, message: "Image processing failed. Try a smaller image or skip the upload." });
      }
    }

    const [result] = await db.query(
      'INSERT INTO Found_Items (title, hidden_description, visible_description, location_found, date_found, image_url, finder_id, category, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, hidden_description || '', visible_description || '', location_found, date_found, image_url, finder_id, category, 'pending']
    );

    const itemId = result?.insertId;
    if (itemId) {
        const qrData = await generateQR(itemId, 'found');
        await db.query('UPDATE Found_Items SET qr_code = ? WHERE id = ?', [qrData, itemId]);
    }

    const [matches] = await db.query(
      'SELECT owner_id FROM Lost_Items WHERE category = ? AND (LOWER(location_lost) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)) AND status = \'lost\'',
      [category, `%${location_found}%`, `%${category}%`]
    );

    if (matches && matches.length > 0) {
      for (const match of matches) {
        await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [match.owner_id, `A new found item matches your lost ${category}!`]);
      }
    }

    res.status(201).json({ success: true, id: itemId || Math.random(), message: 'Found item reported successfully' });
  } catch (error) {
    console.error('Post Found Item Database error:', error);
    res.status(500).json({ success: false, message: 'Database synchronization failed while reporting the found item.', details: error.message });
  }
};

const getFoundItems = async (req, res) => {
  try {
    const [items] = await db.query(
      'SELECT id, title, visible_description, category, location_found, date_found, image_url, status, finder_id FROM Found_Items WHERE status = \'found\''
    );
    res.json(items || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching found items' });
  }
};

const getLostItems = async (req, res) => {
  try {
    const [items] = await db.query(
      'SELECT id, title, description, category, location_lost, date_lost, image_url, status, owner_id, reward_amount, reward_type, reward_description FROM Lost_Items WHERE status = \'lost\' ORDER BY reward_amount DESC, created_at DESC'
    );
    res.json(items || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lost items' });
  }
};

const getItemDetail = async (req, res) => {
  const { id, type } = req.params;
  try {
    let item;
    if (type === 'found') {
      const [items] = await db.query('SELECT * FROM Found_Items WHERE id = ?', [id]);
      if (!items || items.length === 0) return res.status(404).json({ message: 'Item not found' });
      item = items[0];
      if (!(req.user && (req.user.id === item.finder_id || req.user.role === 'admin'))) {
        delete item.hidden_description;
      }
    } else {
      const [items] = await db.query('SELECT * FROM Lost_Items WHERE id = ?', [id]);
      if (!items || items.length === 0) return res.status(404).json({ message: 'Item not found' });
      item = items[0];
    }

    // Attach accepted claim ID for chat functionality
    const [claims] = await db.query('SELECT id FROM Claims WHERE item_id = ? AND item_type = ? AND status = "accepted"', [id, type]);
    if (claims && claims.length > 0) {
        item.accepted_claim_id = claims[0].id;
    }

    return res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching item details' });
  }
};

const getSmartMatches = async (req, res) => {
  const { id, type } = req.params;
  try {
    if (type === 'lost') {
      const [lostArr] = await db.query('SELECT * FROM Lost_Items WHERE id = ?', [id]);
      if (lostArr.length === 0) return res.status(404).json({ message: "Item not found" });
      const [foundItems] = await db.query('SELECT id, title, visible_description, category, location_found, date_found, image_url, status FROM Found_Items WHERE status = \'found\'');
      return res.json(findMatches(lostArr[0], foundItems));
    } else {
      const [foundArr] = await db.query('SELECT * FROM Found_Items WHERE id = ?', [id]);
      if (foundArr.length === 0) return res.status(404).json({ message: "Item not found" });
      const [lostItems] = await db.query('SELECT id, title, description, category, location_lost, date_lost, image_url, status FROM Lost_Items WHERE status = \'lost\'');
      return res.json(findMatches(foundArr[0], lostItems));
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Matching service error" });
  }
};

const deleteItem = async (req, res) => {
  const { id, type } = req.params;
  const userId = req.user.id;
  try {
    const table = type === 'lost' ? 'Lost_Items' : 'Found_Items';
    const ownerColumn = type === 'lost' ? 'owner_id' : 'finder_id';
    const [items] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!items || items.length === 0) return res.status(404).json({ message: "Item not found" });

    const item = items[0];
    if (item[ownerColumn] !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized delete attempt" });
    }

    if (item.image_url && item.image_url.includes('cloudinary')) {
      try {
        const parts = item.image_url.split('/');
        const publicId = `${parts[parts.length - 2]}/${parts[parts.length - 1].split('.')[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) { console.warn("Cleanup failed:", err.message); }
    }
    await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ message: "Item permanently removed from the Hub." });
  } catch (err) {
    res.status(500).json({ message: "Internal server error during deletion" });
  }
};

const returnItem = async (req, res) => {
  const { id, type } = req.params;
  const userId = req.user.id;
  try {
    const table = type === 'lost' ? 'Lost_Items' : 'Found_Items';
    const ownerColumn = type === 'lost' ? 'owner_id' : 'finder_id';
    const [items] = await db.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!items || items.length === 0) return res.status(404).json({ message: "Item not found" });

    const item = items[0];
    if (item[ownerColumn] !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized return attempt" });
    }

    // Close the incident
    await db.query(`UPDATE ${table} SET status = 'returned' WHERE id = ?`, [id]);

    // Trust boost for closing hub incident
    await db.query('UPDATE Users SET trust_score = trust_score + 15 WHERE id = ?', [userId]);

    res.json({ message: "Incident successfully closed. Trust points synchronized." });
  } catch (err) {
    res.status(500).json({ message: "Sync failed during return logic" });
  }
}

const getHotspots = async (req, res) => {
    const { days = 30, type = 'all' } = req.query;
    const dayInterval = parseInt(days) || 30;

    try {
        let whereClause = `WHERE location IS NOT NULL AND location != ''`;
        if (type === 'lost') {
            whereClause += ` AND type = 'lost'`;
        } else if (type === 'found') {
            whereClause += ` AND type = 'found'`;
        }

        const [dataRows] = await db.query(`
            SELECT 
                location, 
                COUNT(*) AS total_items,
                SUM(CASE WHEN created_at >= NOW() - INTERVAL 7 DAY THEN 1 ELSE 0 END) AS recent_activity
            FROM (
                SELECT location_lost AS location, created_at, 'lost' as type FROM Lost_Items
                UNION ALL
                SELECT location_found AS location, created_at, 'found' as type FROM Found_Items
            ) combined_hub
            ${whereClause} AND created_at >= NOW() - INTERVAL ? DAY
            GROUP BY location
            ORDER BY total_items DESC
            LIMIT 15
        `, [dayInterval]);

        const [categoryRows] = await db.query(`
            SELECT location, category, COUNT(*) as cat_count
            FROM (
                SELECT location_lost AS location, category FROM Lost_Items
                UNION ALL
                SELECT location_found AS location, category FROM Found_Items
            ) t
            GROUP BY location, category
            ORDER BY location, cat_count DESC
        `);

        const topCategories = {};
        categoryRows.forEach(row => {
            if (!topCategories[row.location]) {
                topCategories[row.location] = row.category;
            }
        });

        const campusMap = {
            'Library': { lat: 18.4908, lng: 73.8095 },
            'Canteen': { lat: 18.4902, lng: 73.8089 },
            'Workshop': { lat: 18.4912, lng: 73.8098 },
            'Admin': { lat: 18.4906, lng: 73.8090 },
            'IT': { lat: 18.4904, lng: 73.8094 },
            'Garden': { lat: 18.4895, lng: 73.8085 },
            'Playground': { lat: 18.4899, lng: 73.8100 },
            'Parking Area': { lat: 18.4899, lng: 73.8100 },
            'Gym': { lat: 18.4892, lng: 73.8091 },
            'Basketball Court': { lat: 18.4900, lng: 73.8105 }
        };

        const hotspots = dataRows.map(row => {
            const coords = campusMap[row.location] || { lat: 18.490395 + (Math.random() - 0.5) * 0.002, lng: 73.809272 + (Math.random() - 0.5) * 0.002 };
            const total = parseInt(row.total_items) || 0;
            const recent = parseInt(row.recent_activity) || 0;
            const aiScore = (total * 0.6) + (recent * 0.4);

            return {
                name: row.location,
                totalItems: total,
                recentItems: recent,
                intensity: aiScore.toFixed(1),
                topCategory: topCategories[row.location] || 'Common Items',
                lat: coords.lat,
                lng: coords.lng,
                isHighRisk: aiScore > 10
            };
        });

        res.json(hotspots);
    } catch (err) {
        console.error('🔥 HOTSPOT ANALYTICS ERROR:', err.message);
        res.status(500).json({ message: "Spatial engine error", error: err.message });
    }
};



module.exports = {
  postLostItem,
  postFoundItem,
  getFoundItems,
  getLostItems,
  getItemDetail,
  getSmartMatches,
  deleteItem,
  returnItem,
  getHotspots
};
