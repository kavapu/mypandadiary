const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname('./database/panda_diary.db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database('./panda_diary.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create tables
const createTables = () => {
    return new Promise((resolve, reject) => {
        // Diary entries table
        const createEntriesTable = `
            CREATE TABLE IF NOT EXISTS diary_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                content TEXT NOT NULL,
                device_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, device_id)
            )
        `;

        // Users table (for future authentication)
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                email TEXT UNIQUE,
                password_hash TEXT,
                device_id TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Music playlists table (for future features)
        const createPlaylistsTable = `
            CREATE TABLE IF NOT EXISTS music_playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT,
                title TEXT NOT NULL,
                artist TEXT,
                file_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        db.serialize(() => {
            db.run(createEntriesTable, (err) => {
                if (err) {
                    console.error('Error creating entries table:', err.message);
                    reject(err);
                } else {
                    console.log('Diary entries table created successfully.');
                }
            });

            db.run(createUsersTable, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                    reject(err);
                } else {
                    console.log('Users table created successfully.');
                }
            });

            db.run(createPlaylistsTable, (err) => {
                if (err) {
                    console.error('Error creating playlists table:', err.message);
                    reject(err);
                } else {
                    console.log('Music playlists table created successfully.');
                }
            });

            // Create indexes for better performance
            db.run('CREATE INDEX IF NOT EXISTS idx_entries_date ON diary_entries(date)', (err) => {
                if (err) {
                    console.error('Error creating date index:', err.message);
                } else {
                    console.log('Date index created successfully.');
                }
            });

            db.run('CREATE INDEX IF NOT EXISTS idx_entries_device ON diary_entries(device_id)', (err) => {
                if (err) {
                    console.error('Error creating device index:', err.message);
                } else {
                    console.log('Device index created successfully.');
                }
            });

            resolve();
        });
    });
};

// Initialize database
const initDatabase = async () => {
    try {
        await createTables();
        console.log('Database initialization completed successfully!');
        // Don't close the connection - keep it open for the server
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
};

// Run initialization if this file is executed directly
if (require.main === module) {
    initDatabase();
}

module.exports = { initDatabase, db };