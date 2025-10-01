const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // Get token from header (support both x-auth-token and Authorization)
    let token = req.header('x-auth-token');
    if (!token && req.header('authorization')) {
        // Support Bearer token
        const authHeader = req.header('authorization');
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
    }

    // Check if not token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        req.user = {
            id: decoded.id,
            role: decoded.role
        };
        next(); // Proceed to the next middleware/route handler
    } catch (err) {
        console.error('Token verification failed:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

module.exports = auth;
