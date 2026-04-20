
CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    trust_score INT DEFAULT 100,
    otp VARCHAR(6),
    otp_expiry DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Lost_Items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    location_lost VARCHAR(255) NOT NULL,
    date_lost DATE NOT NULL,
    image_url VARCHAR(255),
    owner_id INT NOT NULL,
    status ENUM('lost', 'matched', 'returned') DEFAULT 'lost',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Found_Items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    hidden_description TEXT NOT NULL, -- Brand, unique marks, contents
    visible_description TEXT NOT NULL, -- Category, color, approximate location
    category VARCHAR(100) NOT NULL,
    location_found VARCHAR(255) NOT NULL,
    date_found DATE NOT NULL,
    image_url VARCHAR(255),
    finder_id INT NOT NULL,
    status ENUM('found', 'matched', 'claimed', 'returned') DEFAULT 'found',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (finder_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    item_type ENUM('lost', 'found') NOT NULL,
    claimer_id INT NOT NULL,
    answers JSON NOT NULL, -- Answers to verification questions
    proof_image_url VARCHAR(255),
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claimer_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    verifier_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Chat_Messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES Claims(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES Users(id) ON DELETE CASCADE
);
