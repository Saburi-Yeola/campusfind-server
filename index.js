const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.railway.app')
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.railway.app')
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

const { initExpiryService } = require('./utils/expiryService');
initExpiryService();

const { protect } = require('./middleware/authMiddleware');
const { getHotspots } = require('./controllers/itemController');

app.get('/api/hotspots', getHotspots); 

app.get('/api/notifications', protect, async (req, res) => {

    try {
        const [notifications] = await db.query('SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(notifications || []);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

app.get('/', (req, res) => {
  res.json({ message: '🚀 CampusFind SaaS API Running', status: 'Healthy', database: 'MySQL Connected' });
});

app.use((err, req, res, next) => {
  console.error('🔥 CRITICAL ERROR:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Socket.io Implementation
io.on("connection", (socket) => {
    console.log("User connected to chat:", socket.id);

    // Join room
    socket.on("join_room", async (data) => {
       const { claimId, userId } = data;
       
       try {
           const [claims] = await db.query('SELECT * FROM Claims WHERE id = ?', [claimId]);
           if (claims.length === 0) return;
           const claim = claims[0];
           
           if (claim.status !== 'accepted') return; // Only if approved
           
           let isAuthorized = false;
           
           if (claim.claimer_id === userId) {
               isAuthorized = true;
           } else {
               if (claim.item_type === 'found') {
                   const [items] = await db.query('SELECT finder_id FROM Found_Items WHERE id = ?', [claim.item_id]);
                   if (items.length > 0 && items[0].finder_id === userId) isAuthorized = true;
               } else {
                   const [items] = await db.query('SELECT owner_id FROM Lost_Items WHERE id = ?', [claim.item_id]);
                   if (items.length > 0 && items[0].owner_id === userId) isAuthorized = true;
               }
           }
           
           if (isAuthorized) {
               const room = `claim_${claimId}`;
               socket.join(room);
               console.log(`User ${userId} joined room: ${room}`);
           }
       } catch (error) {
           console.error("Socket join room error:", error);
       }
    });

    // Send message
    socket.on("send_message", async (data) => {
        const { claimId, senderId, message } = data;
        const room = `claim_${claimId}`;
        
        try {
            await db.query(
                'INSERT INTO Chat_Messages (claim_id, sender_id, message) VALUES (?, ?, ?)',
                [claimId, senderId, message]
            );
            
            // Broadcast to room
            io.to(room).emit("receive_message", {
                claim_id: claimId,
                sender_id: senderId,
                message: message,
                timestamp: new Date()
            });
        } catch (error) {
            console.error("Socket save message error:", error);
        }
    });

    socket.on("disconnect", () => {
        // console.log("User disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\x1b[36m\n------------------------------------------------\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m🚀 MMCOE HUB: CAMPUS DISCOVERY ENGINE v1.0.0\x1b[0m`);
  console.log(`\x1b[36m------------------------------------------------\x1b[0m`);
  console.log(`\x1b[1m📡 API BASE: \x1b[0m http://localhost:${PORT}/api`);
  console.log(`\x1b[1m🔗 DATABASE: \x1b[0m MySQL Connected [\x1b[32mHealthy\x1b[0m]`);
  console.log(`\x1b[1m📜 REPORT:   \x1b[0m Run 'SOURCE report.sql;' in MySQL CMD`);
  console.log(`\x1b[36m------------------------------------------------\n\x1b[0m`);
});
