const { io } = require('socket.io-client');
console.log("Attempting native socket connection to backend...");

const socket = io('http://localhost:5000', {
    reconnection: false,
    timeout: 5000
});

socket.on('connect', () => {
    console.log("✅ LIVE SOCKET SERVER CONNECTED SUCCESSFULLY!");
    console.log("Socket Session ID:", socket.id);
    
    // Test receiving an event
    socket.on('disconnect', () => {
        console.log("Disconnected properly.");
    });
    
    console.log("Closing connection. Test Passed.");
    socket.disconnect();
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.error("❌ socket.io server could not be reached:", err.message);
    process.exit(1);
});
