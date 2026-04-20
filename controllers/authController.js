
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register User (OTP Removed)
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Domain validation
    if (!email.endsWith("@mmcoe.edu.in")) {
        return res.status(400).json({ message: 'Only college emails (@mmcoe.edu.in) allowed' });
    }

    // Check if user already exists
    console.log(`\n[AUTH] ---------------------------------------`);
    console.log(`[AUTH] 🛡️ REGISTERING USER: ${email}`);
    console.log(`[AUTH] 🔍 QUERY: SELECT * FROM Users WHERE email = '${email}'`);
    
    const [existingUsers] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    
    console.log(`[AUTH] 📊 QUERY RESULTS COUNT: ${existingUsers.length}`);
    if (existingUsers.length > 0) {
      console.log(`[AUTH] ❌ MATCH FOUND: ID ${existingUsers[0].id}`);
      console.log(`[AUTH] ⛔ BLOCKING REGISTRATION`);
      console.log(`[AUTH] ---------------------------------------\n`);
      return res.status(400).json({ message: 'User already exists' });
    }
    console.log(`[AUTH] ✅ NO EXISTING USER FOUND`);
    console.log(`[AUTH] ---------------------------------------\n`);

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user (No OTP)
    const [result] = await db.query(
      'INSERT INTO Users (name, email, password, role, trust_score) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'user', 100]
    );

    const token = jwt.sign({ id: result.insertId, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
        message: 'Registration successful',
        token,
        user: { 
            id: result.insertId, 
            name, 
            email, 
            role: 'user', 
            trust_score: 100, 
            profile_image: null, 
            phone: null 
        }
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        trust_score: user.trust_score,
        profile_image: user.profile_image,
        phone: user.phone
    }});
  } catch (error) {
    res.status(500).json({ message: 'Login error', error: error.message });
  }
};
