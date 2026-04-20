const db = require('./config/db');

const schema = `
CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) DEFAULT 'user',
    trust_score INT DEFAULT 100,
    otp VARCHAR(6),
    otp_expiry TIMESTAMP,
    profile_image VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Lost_Items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    location_lost VARCHAR(255) NOT NULL,
    date_lost DATE NOT NULL,
    image_url VARCHAR(255),
    owner_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'lost',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Found_Items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    hidden_description TEXT NOT NULL,
    visible_description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    location_found VARCHAR(255) NOT NULL,
    date_found DATE NOT NULL,
    image_url VARCHAR(255),
    finder_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'found',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Claims (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL,
    item_type VARCHAR(10) NOT NULL,
    claimer_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    answers JSON NOT NULL,
    proof_image_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Verifications (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL,
    verifier_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const runMigration = async () => {
    try {
        console.log("🚀 Running Postgres migration...");
        await db.query(schema);
        console.log("✅ Tables synchronized successfully on Postgres.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration FAILED:", err.message);
        process.exit(1);
    }
};

runMigration();
