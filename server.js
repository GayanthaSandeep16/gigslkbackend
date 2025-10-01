// backend/server.js

require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors'); // Import cors
const app = express();
const path = require('path');

// Route imports - These MUST be declared before use
const authRoutes = require('./routes/authRoutes');
const performerRoutes = require('./routes/performerRoutes');
const hostRoutes = require('./routes/hostRoutes');
const hostReviewRoutes = require('./routes/hostReviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const gigRoutes = require('./routes/gigRoutes');
const gigRequestRoutes = require('./routes/gigRequestRoutes');
const chatRoutes = require('./routes/chatRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const artistReviewRoutes = require('./routes/artistReviewRoutes');

// Middleware
// Use the cors middleware to allow requests from your frontend
// Allow both 5173 and 5174 during dev; permit requests without Origin (e.g., curl)
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://gigslk-frontend-git-main-yasassris-projects.vercel.app',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // non-browser or same-origin
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // This is important for cookies, if you use them
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
}));

// Universal preflight handler to avoid Express v5 wildcard issues
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
        // reflect requested headers if provided
        const reqHeaders = req.headers['access-control-request-headers'];
        res.header('Access-Control-Allow-Headers', reqHeaders || 'Content-Type, Authorization');
        return res.sendStatus(204);
    }
    next();
});
app.use(express.json()); // To parse JSON request bodies

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers.origin || 'No Origin');
  next();
});

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Main route
app.get('/', (req, res) => {
    res.send('Gigs.lk Backend is running!');
});

// Test endpoint to verify static file serving
app.get('/test-uploads', (req, res) => {
    res.json({
        message: 'Uploads directory test',
        uploadsPath: path.join(__dirname, 'uploads'),
        files: require('fs').readdirSync(path.join(__dirname, 'uploads')).slice(0, 5) // Show first 5 files
    });
});

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/performers', performerRoutes);
app.use('/api/performers', require('./routes/performerShowcaseRoutes'));
app.use('/api/hosts', hostRoutes);
app.use('/api/hosts', hostReviewRoutes);
console.log('Registering artist review routes...');
// Debug logger for artists routes
app.use('/api/artists', (req, res, next) => {
    console.log(`[artists] incoming: ${req.method} ${req.originalUrl} path=${req.path}`);
    next();
});
app.use('/api/artists', require('./routes/artistReviewRoutes'));
console.log('Artist review routes registered at /api/artists');
app.use('/api/admin', adminRoutes);
app.use('/api/admin', require('./routes/adminReviewRoutes'));
app.use('/api/gigs', gigRoutes);
app.use('/api/gig-requests', gigRequestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bookings', bookingRoutes);

// Add a test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// Add specific test route for artist reviews
app.get('/api/artists/test', (req, res) => {
  res.json({ message: 'Artist routes are working!' });
});

// Use port 5000 by default to match the frontend's API_BASE_URL
const PORT = process.env.PORT || 5000;

// Catch-all 404 handler (after all routes)
app.use((req, res) => {
    const path = req.originalUrl || req.url;
    const method = req.method;
    console.log(`404 Not Found: ${method} ${path}`);
    res.status(404).json({ message: 'Not Found', path, method });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});