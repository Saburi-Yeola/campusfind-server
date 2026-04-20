// Railway environment simulation test
// Sets all Railway env vars and starts the server to catch startup crashes
process.env.DB_HOST = 'shinkansen.proxy.rlwy.net';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = 'LottCAisfzORxWbYknSAkjmCXxsUnkLz';
process.env.DB_NAME = 'railway';
process.env.DB_PORT = '27903';
process.env.JWT_SECRET = 'supersecret';
process.env.PORT = '5001'; // use different port so it doesn't conflict
process.env.CLOUDINARY_CLOUD_NAME = 'dwjzjx7eq';
process.env.CLOUDINARY_API_KEY = '513143644346824';
process.env.CLOUDINARY_API_SECRET = 'y35gK3fC4n7T4R8Tf1p9xL1qX2E';

console.log('🧪 Railway Simulation: Loading server...');
try {
    require('./index.js');
    console.log('✅ Server loaded without crash');
} catch (err) {
    console.error('❌ SERVER CRASH ON STARTUP:', err.message);
    console.error(err.stack);
    process.exit(1);
}
