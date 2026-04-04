const express = require('express');
const router = express.Router();
const storage = require('../services/supabase-storage');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
    const token = req.get('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Get All Students
router.get('/students', adminAuth, async (req, res) => {
    try {
        const users = await storage.find('users', {}); // Fetch all users
        console.log('Users found:', users.length);
        // Filter out admin users and return students only
        const students = users
            .filter(u => {
                const isAdmin = storage.isAdminUser(u.username);
                console.log('User:', u.username, 'isAdmin:', isAdmin);
                return !isAdmin;
            })
            .map(({ password, ...rest }) => rest);
        console.log('Students:', students.length);
        res.json(students);
    } catch (err) {
        console.error('Error in /students:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete Student
router.delete('/students/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await storage.deleteOne('users', { _id: id });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Student Points
router.post('/students/:id/reset-points', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await storage.atomicUpdate('users', { _id: id }, (user) => {
            user.points = 0;
            return user;
        });

        if (!updated) {
            return res.status(404).json({ message: 'الطالب غير موجود' });
        }

        res.json({ message: 'تم تصفير النقاط بنجاح', points: 0 });
    } catch (err) {
        console.error('Error resetting points:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add Points to Student
router.post('/students/:id/add-points', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { points } = req.body;

        if (typeof points !== 'number' || points < 0) {
            return res.status(400).json({ message: 'يجب أن تكون النقاط رقماً موجباً' });
        }

        const updated = await storage.atomicUpdate('users', { _id: id }, (user) => {
            user.points = (user.points || 0) + points;
            return user;
        });

        if (!updated) {
            return res.status(404).json({ message: 'الطالب غير موجود' });
        }

        res.json({ message: `تم إضافة ${points} نقطة بنجاح`, points: updated.points });
    } catch (err) {
        console.error('Error adding points:', err);
        res.status(500).json({ error: err.message });
    }
});

// Unlock Next Session for Student
router.post('/students/:id/unlock-session', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await storage.atomicUpdate('users', { _id: id }, (user) => {
            const maxSession = 4;
            if (user.currentSession < maxSession) {
                user.currentSession = (user.currentSession || 1) + 1;
            }
            return user;
        });

        if (!updated) {
            return res.status(404).json({ message: 'الطالب غير موجود' });
        }

        res.json({ 
            message: 'تم فتح المستوى التالي بنجاح', 
            currentSession: updated.currentSession 
        });
    } catch (err) {
        console.error('Error unlocking session:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
