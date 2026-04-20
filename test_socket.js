const db = require('./config/db');
const { io } = require('socket.io-client');
const http = require('http');

async function runTest() {
    try {
        console.log("Mocking database for chat...");
        
        // Use standard Postgres to avoid duplicate IDs/emails avoiding 'INSERT IGNORE' error.
        await db.query(`
            INSERT INTO Users (id, name, email, password, role) 
            VALUES (9000, 'Owner_Test', 'owner9000@test.com', 'pass', 'user') 
            ON CONFLICT (email) DO NOTHING;
        `);
        await db.query(`
            INSERT INTO Users (id, name, email, password, role) 
            VALUES (9001, 'Finder_Test', 'finder9000@test.com', 'pass', 'user') 
            ON CONFLICT (email) DO NOTHING;
        `);

        // Get actual User IDs
        const [ownerRes] = await db.query(`SELECT id FROM Users WHERE email = 'owner9000@test.com'`);
        const ownerId = ownerRes[0].id;
        
        const [finderRes] = await db.query(`SELECT id FROM Users WHERE email = 'finder9000@test.com'`);
        const finderId = finderRes[0].id;

        // Clean up previous item tracking for the test
        await db.query(`DELETE FROM Lost_Items WHERE title = 'Test Chat Item'`);

        // Create Item
        const [itemInsert] = await db.query(`
            INSERT INTO Lost_Items (title, description, category, location_lost, date_lost, owner_id, status) 
            VALUES ('Test Chat Item', 'Test desc', 'TestCat', 'TestLoc', '2023-10-10', $1, 'matched')
            RETURNING id;
        `, [ownerId]);
        
        const itemId = itemInsert.insertId || itemInsert.id || itemInsert[0]?.id;
        
        if(!itemId) throw new Error("Could not create mock item");

        // Create Claim
        await db.query(`DELETE FROM Claims WHERE claimer_id = $1`, [finderId]);
        const [claimInsert] = await db.query(`
            INSERT INTO Claims (item_id, item_type, claimer_id, answers, status) 
            VALUES ($1, 'lost', $2, '{}', 'accepted')
            RETURNING id;
        `, [itemId, finderId]);
        
        const claimId = claimInsert.insertId || claimInsert.id || claimInsert[0]?.id;

        console.log(`Mocking complete! Created Claim ID: ${claimId} for User: ${ownerId} & ${finderId}`);
        console.log("Connecting via Socket...");

        const socket = io('http://localhost:5000');
        
        let timeout;

        socket.on('connect', () => {
            console.log("✅ LIVE SOCKET SERVER CONNECTED! SID:", socket.id);
            
            socket.emit('join_room', { claimId: claimId, userId: ownerId }); 
            console.log("→ Emitted join_room");
            
            socket.on('receive_message', (data) => {
                console.log("✅ MESSAGE RECEIVED SUCCESS:");
                console.log("   From:", data.sender_id);
                console.log("   Msg :", data.message);
                console.log("-----------------------------------------");
                console.log("CHAT COMMUNICATION FULLY VERIFIED WORKING!");
                clearTimeout(timeout);
                process.exit(0);
            });

            setTimeout(() => {
                console.log("→ Emitted send_message");
                socket.emit('send_message', { claimId: claimId, senderId: ownerId, message: "Hello! This is a secure Socket.io payload." });
            }, 500);
            
            timeout = setTimeout(() => {
                console.log("❌ Timeout waiting for socket event.");
                process.exit(1);
            }, 5000);
        });

        socket.on('connect_error', (err) => {
            console.error("❌ socket.io server could not be reached:", err.message);
            process.exit(1);
        });
        
    } catch (e) {
        console.error("Test Error:", e);
        process.exit(1);
    }
}

runTest();
