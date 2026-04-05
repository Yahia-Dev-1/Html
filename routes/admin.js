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
        console.log('[Admin] Fetching all students...');
        const users = await storage.find('users', {}); 
        
        if (!users || !Array.isArray(users)) {
            console.log('[Admin] No users found or error in fetch');
            return res.json([]);
        }

        const students = users
            .filter(u => {
                // Check if user is admin either by role or username
                const isAdmin = u.role === 'Admin' || storage.isAdminUser(u.username);
                return !isAdmin;
            })
            .map(({ password, ...rest }) => rest);
            
        console.log(`[Admin] Found ${students.length} students`);
        res.json(students);
    } catch (err) {
        console.error('[Admin] Error in /students:', err);
        res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الطلاب' });
    }
});

// Delete Student
router.delete('/students/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[Admin] Deleting user:', id);
        const result = await storage.deleteOne('users', { id: id });
        console.log('[Admin] Delete result:', result);
        res.json({ message: 'User deleted successfully', result });
    } catch (err) {
        console.error('[Admin] Delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Reset Student Points
router.post('/students/:id/reset-points', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[Admin] Resetting points for:', id);
        const updated = await storage.atomicUpdate('users', { id: id }, (user) => {
            user.points = 0;
            return user;
        });

        if (!updated) {
            console.log('[Admin] User not found:', id);
            return res.status(404).json({ message: 'الطالب غير موجود' });
        }

        console.log('[Admin] Points reset successful:', updated.id);
        res.json({ message: 'تم تصفير النقاط بنجاح', points: 0 });
    } catch (err) {
        console.error('[Admin] Error resetting points:', err);
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

        console.log('[Admin] Adding', points, 'points to:', id);
        const updated = await storage.atomicUpdate('users', { id: id }, (user) => {
            user.points = (user.points || 0) + points;
            return user;
        });

        if (!updated) {
            console.log('[Admin] User not found for add points:', id);
            return res.status(404).json({ message: 'الطالب غير موجود' });
        }

        console.log('[Admin] Points added successfully:', updated.id, updated.points);
        res.json({ message: `تم إضافة ${points} نقطة بنجاح`, points: updated.points });
    } catch (err) {
        console.error('[Admin] Error adding points:', err);
        res.status(500).json({ error: err.message });
    }
});

// Unlock Next Session for Student
router.post('/students/:id/unlock-session', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[Admin] Unlocking session for:', id);
        const updated = await storage.atomicUpdate('users', { id: id }, (user) => {
            const maxSession = 4;
            if (user.currentSession < maxSession) {
                user.currentSession = (user.currentSession || 1) + 1;
            }
            return user;
        });

        if (!updated) {
            console.log('[Admin] User not found for unlock:', id);
            return res.status(404).json({ message: 'الطالب غير موجود' });
        }

        console.log('[Admin] Session unlocked:', updated.id, updated.currentSession);
        res.json({ 
            message: 'تم فتح المستوى التالي بنجاح', 
            currentSession: updated.currentSession 
        });
    } catch (err) {
        console.error('[Admin] Error unlocking session:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
