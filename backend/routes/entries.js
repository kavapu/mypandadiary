const express = require('express');
const router = express.Router();
const DiaryEntry = require('../models/DiaryEntry');
const { deviceIdMiddleware, validateDeviceId } = require('../middleware/deviceId');

// Apply device ID middleware to all routes
router.use(deviceIdMiddleware);
router.use(validateDeviceId);

// GET /api/entries - Get all entries for the device
router.get('/', async (req, res) => {
    try {
        const entries = await DiaryEntry.getAllEntries(req.deviceId);
        res.json({
            success: true,
            data: entries,
            count: entries.length
        });
    } catch (error) {
        console.error('Error fetching entries:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch entries',
            message: error.message
        });
    }
});

// GET /api/entries/:date - Get entry for specific date
router.get('/:date', async (req, res) => {
    try {
        const { date } = req.params;
        
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Date must be in YYYY-MM-DD format'
            });
        }
        
        const entry = await DiaryEntry.getEntryByDate(date, req.deviceId);
        
        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Entry not found',
                message: `No entry found for date: ${date}`
            });
        }
        
        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error fetching entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch entry',
            message: error.message
        });
    }
});

// POST /api/entries - Create new entry
router.post('/', async (req, res) => {
    try {
        const { date, content } = req.body;
        
        // Validate required fields
        if (!date || !content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Date and content are required'
            });
        }
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Date must be in YYYY-MM-DD format'
            });
        }
        
        // Check if entry already exists
        const existingEntry = await DiaryEntry.getEntryByDate(date, req.deviceId);
        if (existingEntry) {
            return res.status(409).json({
                success: false,
                error: 'Entry already exists',
                message: `An entry for ${date} already exists. Use PUT to update.`
            });
        }
        
        // Create entry
        const newEntry = await DiaryEntry.createEntry(date, content, req.deviceId);
        
        res.status(201).json({
            success: true,
            data: newEntry,
            message: 'Entry created successfully'
        });
    } catch (error) {
        console.error('Error creating entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create entry',
            message: error.message
        });
    }
});

// PUT /api/entries/:date - Update existing entry
router.put('/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { content } = req.body;
        
        // Validate required fields
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Content is required'
            });
        }
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Date must be in YYYY-MM-DD format'
            });
        }
        
        // Check if entry exists
        const existingEntry = await DiaryEntry.getEntryByDate(date, req.deviceId);
        if (!existingEntry) {
            return res.status(404).json({
                success: false,
                error: 'Entry not found',
                message: `No entry found for date: ${date}`
            });
        }
        
        // Update entry
        const updatedEntry = await DiaryEntry.updateEntry(date, content, req.deviceId);
        
        res.json({
            success: true,
            data: updatedEntry,
            message: 'Entry updated successfully'
        });
    } catch (error) {
        console.error('Error updating entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update entry',
            message: error.message
        });
    }
});

// PATCH /api/entries/:date - Upsert entry (create or update)
router.patch('/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { content } = req.body;
        
        // Validate required fields
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Content is required'
            });
        }
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Date must be in YYYY-MM-DD format'
            });
        }
        
        // Upsert entry
        const result = await DiaryEntry.upsertEntry(date, content, req.deviceId);
        
        res.json({
            success: true,
            data: result,
            message: 'Entry saved successfully'
        });
    } catch (error) {
        console.error('Error upserting entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save entry',
            message: error.message
        });
    }
});

// DELETE /api/entries/:date - Delete entry
router.delete('/:date', async (req, res) => {
    try {
        const { date } = req.params;
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Date must be in YYYY-MM-DD format'
            });
        }
        
        // Check if entry exists
        const existingEntry = await DiaryEntry.getEntryByDate(date, req.deviceId);
        if (!existingEntry) {
            return res.status(404).json({
                success: false,
                error: 'Entry not found',
                message: `No entry found for date: ${date}`
            });
        }
        
        // Delete entry
        const result = await DiaryEntry.deleteEntry(date, req.deviceId);
        
        res.json({
            success: true,
            data: result,
            message: 'Entry deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting entry:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete entry',
            message: error.message
        });
    }
});

// GET /api/entries/range/:startDate/:endDate - Get entries in date range
router.get('/range/:startDate/:endDate', async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        
        // Validate date formats
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format',
                message: 'Dates must be in YYYY-MM-DD format'
            });
        }
        
        const entries = await DiaryEntry.getEntriesInRange(startDate, endDate, req.deviceId);
        
        res.json({
            success: true,
            data: entries,
            count: entries.length
        });
    } catch (error) {
        console.error('Error fetching entries in range:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch entries',
            message: error.message
        });
    }
});

module.exports = router;