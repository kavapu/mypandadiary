const { v4: uuidv4 } = require('uuid');

// Middleware to handle device identification
const deviceIdMiddleware = (req, res, next) => {
    // Get device ID from header, query parameter, or generate new one
    let deviceId = req.headers['x-device-id'] || req.query.deviceId;
    
    if (!deviceId) {
        // Generate a new device ID if none exists
        deviceId = uuidv4();
        
        // Set the device ID in response headers for the client to store
        res.setHeader('X-Device-ID', deviceId);
    }
    
    // Add device ID to request object
    req.deviceId = deviceId;
    
    next();
};

// Middleware to validate device ID format
const validateDeviceId = (req, res, next) => {
    const deviceId = req.deviceId;
    
    // Basic UUID validation (simplified)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(deviceId)) {
        return res.status(400).json({
            error: 'Invalid device ID format',
            message: 'Device ID must be a valid UUID'
        });
    }
    
    next();
};

module.exports = {
    deviceIdMiddleware,
    validateDeviceId
};