const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const storage = require('../services/supabase-storage');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

// Helper function to create sanitized user response
function createUserResponse(user, role) {
    return {
        username: user.username,
        displayName: user.displayName || user.username, // Use displayName if available, fallback to username
        role: role || user.role,
        currentSession: user.currentSession || 1,
        points: user.points || 0,
        completedQuizzes: user.completedQuizzes || [],
        completedChallenges: user.completedChallenges || [],
        quizScores: user.quizScores || {},
        courseCompleted: user.courseCompleted || false
    };
}

// Store recent registration attempts to prevent duplicates
const recentRegistrations = new Map();

// Register
router.post('/register', async (req, res) => {
    try {
        let { username, password, role } = req.body;
        
        // Normalize username - trim and convert to lowercase for consistent storage and comparison
        const normalizedUsername = username.trim().toLowerCase();
        const originalUsername = username.trim();
        
        console.log(`[Auth] Registration attempt for: "${originalUsername}" (normalized: "${normalizedUsername}")`);
        
        // Check if this username was recently registered (within last 5 seconds)
        const recentTime = recentRegistrations.get(normalizedUsername);
        const now = Date.now();
        if (recentTime && (now - recentTime) < 5000) {
            console.log(`[Auth] Registration blocked: User "${normalizedUsername}" was just registered (${now - recentTime}ms ago)`);
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Check for existing user with normalized comparison
        let existingUser = await storage.findUser(normalizedUsername);
        
        if (existingUser) {
            console.log(`[Auth] Registration blocked: User "${normalizedUsername}" already exists`);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Add small delay to prevent rapid-fire duplicate submissions
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Double-check again after delay (catches race conditions)
        const doubleCheck = await storage.findUser(normalizedUsername);
        if (doubleCheck) {
            console.log(`[Auth] Registration blocked after delay: User "${normalizedUsername}" was created by another request`);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Mark this username as being registered
        recentRegistrations.set(normalizedUsername, now);
        
        // Store with normalized username but keep original case for display
        const newUser = await storage.createUser({ 
            username: normalizedUsername, 
            password, 
            role: role || 'Student',
            displayName: originalUsername // Keep original case for display
        });
        
        console.log('[Auth] User created:', { id: newUser._id, username: newUser.username, storage: newUser._id?.length === 24 ? 'mongodb' : 'file' });
        
        const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });

        const userResponse = createUserResponse(newUser);
        
        console.log(`[Auth] User "${normalizedUsername}" registered successfully`);
        res.status(201).json({ token, user: userResponse });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed', details: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(`🔐 Login attempt for user: "${username}"`);
        
        // Hardcoded Admin Override - with trim to handle copy/paste spaces
        if (password && password.trim() === 'ylyk157ymkr654') {
            console.log(`👨‍💼 Admin override activated for: "${username}"`);
            const adminUser = {
                _id: 'admin_master',
                username: username || 'admin',
                displayName: 'مدير النظام',
                role: 'Admin',
                currentSession: 4,
                points: 9999,
                completedQuizzes: [],
                completedChallenges: [],
                quizScores: {},
                courseCompleted: true
            };
            const token = jwt.sign({ id: adminUser._id, role: 'Admin' }, JWT_SECRET, { expiresIn: '7d' });
            console.log(`✅ Token generated for admin: ${adminUser._id}`);
            return res.json({ token, user: adminUser });
        }

        const user = await storage.findUser(username);
        if (!user) {
            console.log(`❌ User not found: "${username}"`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const passwordMatch = await storage.comparePassword(password, user.password);
        if (!passwordMatch) {
            console.log(`❌ Password mismatch for user: "${username}"`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        console.log(`✅ Login successful for user: "${username}"`);

        const userResponse = createUserResponse(user, user.role);
        res.json({ token, user: userResponse });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: 'Login failed', details: err.message });
    }
});

module.exports = router;
