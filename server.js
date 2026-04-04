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

// Debug Environment Check
app.get('/api/debug/env', (req, res) => {
    res.json({
        mongodb_uri_exists: !!process.env.MONGODB_URI,
        mongodb_uri_length: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
        jwt_secret_exists: !!process.env.JWT_SECRET,
        node_env: process.env.NODE_ENV,
        timestamp: new Date()
    });
});

// Debug All Users with detailed info
app.get('/api/debug/users', async (req, res) => {
    const storage = require('./services/storage');
    try {
        const users = await storage.find('users', {});
        res.json({
            count: users.length,
            storage_type: users.length > 0 && users[0]._id?.length === 24 ? 'mongodb' : 'file',
            users: users.map(u => ({ 
                id: u._id, 
                username: u.username, 
                role: u.role,
                createdAt: u.createdAt 
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Debug MongoDB Connection Test
app.get('/api/debug/db-test', async (req, res) => {
    const { MongoClient } = require('mongodb');
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
        return res.json({ error: 'MONGODB_URI not set' });
    }
    
    // Convert SRV to direct connection if needed
    let testUri = uri;
    if (uri.includes('mongodb+srv://')) {
        // Try with direct connection
        testUri = uri.replace('mongodb+srv://', 'mongodb://');
        testUri = testUri.replace('@cluster0.3utho5p.mongodb.net/', '@cluster0-shard-00-00.3utho5p.mongodb.net:27017,cluster0-shard-00-01.3utho5p.mongodb.net:27017,cluster0-shard-00-02.3utho5p.mongodb.net:27017/');
        if (!testUri.includes('ssl=')) {
            testUri += testUri.includes('?') ? '&ssl=true' : '?ssl=true';
        }
        if (!testUri.includes('replicaSet=')) {
            testUri += '&replicaSet=atlas-xyz';
        }
    }
    
    try {
        const client = new MongoClient(uri, { 
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000
        });
        
        await client.connect();
        const db = client.db('html-quiz');
        const collections = await db.listCollections().toArray();
        const userCount = await db.collection('users').countDocuments();
        await client.close();
        
        res.json({
            status: 'connected',
            collections: collections.map(c => c.name),
            user_count: userCount
        });
    } catch (err) {
        res.json({
            status: 'failed',
            error: err.message,
            name: err.name
        });
    }
});

// Debug Supabase Connection
app.get('/api/debug/supabase', async (req, res) => {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.json({ 
            error: 'Supabase credentials not set',
            url_exists: !!supabaseUrl,
            key_exists: !!supabaseKey
        });
    }
    
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error, count } = await supabase
            .from('users')
            .select('*', { count: 'exact' });
        
        if (error) {
            return res.json({
                status: 'error',
                error: error.message,
                code: error.code
            });
        }
        
        res.json({
            status: 'connected',
            user_count: count || data.length,
            users: data.map(u => ({
                id: u.id,
                username: u.username,
                role: u.role,
                created_at: u.created_at
            }))
        });
    } catch (err) {
        res.json({
            status: 'failed',
            error: err.message,
            name: err.name
        });
    }
});

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
