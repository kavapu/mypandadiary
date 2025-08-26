const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: './config.env' });

// Import routes
const entriesRoutes = require('./routes/entries');

// Import database initialization
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-ID']
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the parent directory (frontend files)
app.use(express.static(path.join(__dirname, '..')));

// API routes
app.use('/api/entries', entriesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Panda Diary API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        mode: process.env.NODE_ENV || 'development',
        database: process.env.NODE_ENV === 'development' ? 'available' : 'not available (LocalStorage only)'
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Panda Diary API',
        version: '1.0.0',
        description: 'Backend API for Panda Diary web application',
        mode: process.env.NODE_ENV || 'development',
        database: process.env.NODE_ENV === 'development' ? 'available' : 'not available (LocalStorage only)',
        endpoints: {
            health: 'GET /api/health',
            entries: {
                getAll: 'GET /api/entries',
                getByDate: 'GET /api/entries/:date',
                create: 'POST /api/entries',
                update: 'PUT /api/entries/:date',
                upsert: 'PATCH /api/entries/:date',
                delete: 'DELETE /api/entries/:date',
                getRange: 'GET /api/entries/range/:startDate/:endDate'
            },
        },
        authentication: 'Device ID based (sent via X-Device-ID header)',
        note: process.env.NODE_ENV === 'production' ? 'In production mode, database operations are disabled. The frontend will use LocalStorage for data persistence.' : 'Development mode with full database functionality.'
    });
});

// Serve the main HTML file for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'The requested resource was not found'
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        // Start server first
        app.listen(PORT, () => {
            console.log(`🚀 Panda Diary API server running on port ${PORT}`);
            console.log(`📖 Frontend available at: http://localhost:${PORT}`);
            console.log(`🔗 API documentation: http://localhost:${PORT}/api`);
            console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
        });
        
        // Only initialize database in development mode
        if (process.env.NODE_ENV === 'development') {
            await initDatabase();
            console.log('✅ Database initialized successfully');
        } else {
            console.log('🌐 Production mode: Database not available (using LocalStorage only)');
        }
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    process.exit(0);
});

// Start the server
startServer();