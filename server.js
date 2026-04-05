require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Request logging for debugging
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        console.log(`📡 [API] ${req.method} ${req.path}`);
    }
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/challenge', require('./routes/challenge'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/admin', require('./routes/admin'));

// API Test Route
app.get('/api/test', (req, res) => res.json({ message: 'API is working!', server: 'Express 5' }));

// Serve Static Files
app.use(express.static(path.join(process.cwd(), 'public')));

// SPA Fallback - Ultimate Express 5 fix
// Using app.use at the end avoids path-to-regexp wildcard syntax errors
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
}