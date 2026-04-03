require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging for debugging
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        console.log(`
┌─────────────────────────────────────
│ 📡 API Request
│ Method: ${req.method}
│ Path: ${req.path}
│ Auth: ${req.get('Authorization') ? '✅ Present' : '❌ Missing'}
└─────────────────────────────────────`);
    }
    next();
});

// Protect sensitive files from being served statically
app.use((req, res, next) => {
    // Skip API routes - they have their own auth
    if (req.path.startsWith('/api')) {
        return next();
    }
    
    const sensitiveExtensions = ['.json', '.env', '.md'];
    const sensitiveFiles = ['server.js', 'storage.js'];
    const sensitiveFolders = ['/routes/', '/services/', '/data/'];
    
    const isSensitiveExt = sensitiveExtensions.some(ext => req.path.endsWith(ext));
    const isSensitiveFile = sensitiveFiles.some(file => req.path.endsWith(file) || req.path === `/${file}`);
    const isSensitiveFolder = sensitiveFolders.some(folder => req.path.startsWith(folder));

    if (isSensitiveExt || isSensitiveFile || isSensitiveFolder) {
        return res.status(403).json({ error: 'Access Denied: Protected Resource' });
    }
    next();
});

// Routes MUST come before static files
console.log('📌 Registering API routes...');
app.use('/api/quiz', require('./routes/quiz'));
console.log('✅ /api/quiz registered');
app.use('/api/challenge', require('./routes/challenge'));
console.log('✅ /api/challenge registered');
app.use('/api/auth', require('./routes/auth'));
console.log('✅ /api/auth registered');
app.use('/api/progress', require('./routes/progress'));
console.log('✅ /api/progress registered');
app.use('/api/admin', require('./routes/admin'));
console.log('✅ /api/admin registered');

// Serve static files (after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// WhatsApp Contact Masking
app.get('/api/contact/whatsapp', (req, res) => {
    // Hide the number in the environment variable. Fallback securely if not set.
    const number = process.env.WHATSAPP_NUMBER || '201273445173';
    res.redirect(`https://wa.me/${number}`);
});

// Debug Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// API 404 Handler - Ensure API errors always return JSON
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

// Serve HTML - Fallback for SPA (Non-API routes only)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For Vercel deployment
module.exports = app;

// For local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
