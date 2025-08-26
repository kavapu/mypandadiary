const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
// Environment variables are loaded automatically by Render

// Import routes
const entriesRoutes = require('./routes/entries');

// Import database initialization
const initDatabase = require('./database/init');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    }
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/entries', entriesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Panda Diary API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        mode: process.env.NODE_ENV || 'development',
        database: 'available (SQLite)'
    });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        name: 'Panda Diary API',
        version: '1.0.0',
        description: 'Backend API for Panda Diary web application',
        mode: process.env.NODE_ENV || 'development',
        database: 'available (SQLite)',
        endpoints: {
            health: 'GET /api/health',
            entries: {
                getAll: 'GET /api/entries',
                getByDate: 'GET /api/entries/:date',
                create: 'POST /api/entries',
                update: 'PUT /api/entries/:date',
                upsert: 'PATCH /api/entries/:date',
                delete: 'DELETE /api/entries/:date',
                getByRange: 'GET /api/entries/range/:startDate/:endDate'
            }
        },
        authentication: 'Device ID based (sent via X-Device-ID header)',
        note: 'Full database functionality with SQLite. Deployed on Render for persistent storage.'
    });
});

// Serve the main HTML file for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
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

// Start server function
async function startServer() {
    try {
        const port = process.env.PORT || 3000;
        
        app.listen(port, () => {
            console.log(`🚀 Panda Diary server running on port ${port}`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
            console.log(`💾 Database: SQLite`);
            console.log(`🔗 Health Check: http://localhost:${port}/api/health`);
            console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
        });
        
        // Initialize database (works on Render)
        await initDatabase();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;