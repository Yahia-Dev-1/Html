const express = require('express');
const router = express.Router();
const storage = require('../services/supabase-storage');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

// Auth Middleware
const auth = (req, res, next) => {
    const token = req.get('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Get Progression
router.get('/', auth, async (req, res) => {
    try {
        if (req.user.id === 'admin_master') {
            return res.json({
                id: 'admin_master',
                username: 'admin',
                role: 'Admin',
                currentSession: 4,
                points: 9999,
                completedQuizzes: [],
                completedChallenges: [],
                quizScores: {},
                courseCompleted: true
            });
        }

        const user = await storage.findOne('users', { id: req.user.id });
        if (!user) return res.status(401).json({ message: 'User not found' });
        const { password, ...userData } = user;
        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Quiz Progress
router.post('/quiz', auth, async (req, res) => {
    try {
        const { sessionId, score, totalQuestions, pointsAwarded } = req.body;
        const updatedUser = await storage.atomicUpdate('users', { id: req.user.id }, (user) => {
            const quizId = `q_s${sessionId}`;
            if (!user.quizScores) user.quizScores = {};
            const newScore = Math.round((score / (totalQuestions || 10)) * 100);
            if (newScore >= (user.quizScores[quizId] || 0)) user.quizScores[quizId] = newScore;

            if (!user.completedQuizzes) user.completedQuizzes = [];
            if (!user.completedQuizzes.includes(quizId)) {
                user.completedQuizzes.push(quizId);
                user.points = (user.points || 0) + (pointsAwarded || 0);
            }
            return user;
        });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sync Points
router.post('/points', auth, async (req, res) => {
    try {
        const { points } = req.body;
        const result = await storage.atomicUpdate('users', { id: req.user.id }, (user) => {
            user.points = points;
            return user;
        });
        res.json({ points: result.points });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unlock Next Session
router.post('/unlock-session', auth, async (req, res) => {
    try {
        const result = await storage.atomicUpdate('users', { id: req.user.id }, (user) => {
            const current = user.currentSession || 1;
            if (current < 4) {
                user.currentSession = current + 1;
            }
            return user;
        });
        res.json({ currentSession: result.currentSession });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Challenge Data for a Session
router.get('/challenge-data/:sessionId', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        // Proxy to challenge router data or just return from here
        const challenges = require('./challenge').challengesData;
        const sessionChallenges = challenges.filter(c => c.sessionNumber === Number(sessionId));
        res.json(sessionChallenges);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load challenge data' });
    }
});

// Get Quiz Data for a Session
router.get('/quiz-data/:sessionId', auth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const quizData = require('./quiz').quizData;
        
        const sessionCategories = {
            1: "أساسيات HTML - يوم 1",
            2: "وسائط وقوائم - يوم 2",
            3: "جداول وفورم - يوم 3",
            4: "التخطيط والوسوم الدلالية - يوم 4"
        };
        
        const categoryName = sessionCategories[Number(sessionId)];
        const category = quizData.find(c => c.category === categoryName);
        
        if (category) {
            // Remove correct answers before sending
            const safeQuestions = category.questions.map(q => {
                const { correctAnswer, explanationCorrect, explanationsWrong, ...safeQ } = q;
                return safeQ;
            });
            res.json(safeQuestions);
        } else {
            res.status(404).json({ error: 'Quiz not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to load quiz data' });
    }
});

module.exports = router;