
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');

const getProfile = async (req, res) => {
    try {
        const [users] = await db.query('SELECT name, email, phone, profile_image, trust_score FROM Users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ message: "User not found" });
        res.json(users[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database Error" });
    }
};

const updateProfile = async (req, res) => {
    const { name, phone, profile_image } = req.body;
    try {
        await db.query(
            'UPDATE Users SET name = ?, phone = ?, profile_image = ? WHERE id = ?',
            [name, phone, profile_image, req.user.id]
        );
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Update Failed" });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided." });
        }

        // Use Cloudinary upload_stream for direct buffer processing
        const uploadResponse = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "avatar_hub", resource_type: "auto" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file.buffer);
        });

        const imageUrl = uploadResponse.secure_url;

        // Persist to SQL Identity Grid
        await db.query(
            'UPDATE Users SET profile_image = ? WHERE id = ?',
            [imageUrl, req.user.id]
        );

        res.json({ 
            message: "Identity Hub synchronized successfully.", 
            url: imageUrl 
        });
    } catch (err) {
        console.error("IDENTITY SYNC STREAM ERROR:", err);
        res.status(500).json({ 
            message: "Upload failed. Hub storage sync error.", 
            error: err.message,
            cloudinary_code: err.http_code || "Unknown"
        });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT name, profile_image, COALESCE(trust_score, 0) as trust_score FROM Users ORDER BY trust_score DESC LIMIT 5'
        );
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database Error" });
    }
};

module.exports = { getProfile, updateProfile, uploadAvatar, getLeaderboard };
