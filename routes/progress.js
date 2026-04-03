const express = require('express');
const router = express.Router();
const storage = require('../services/storage');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

// Auth Middleware
const auth = (req, res, next) => {
    const token = req.get('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Get Progression
router.get('/', auth, async (req, res) => {
    try {
        // Handle hardcoded admin mask
        if (req.user.id === 'admin_master') {
            return res.json({
                _id: 'admin_master',
                username: 'admin',
                displayName: 'مدير النظام',
                role: 'Admin',
                currentSession: 4,
                points: 9999,
                completedQuizzes: [],
                completedChallenges: [],
                quizScores: {},
                courseCompleted: true
            });
        }

        const user = await storage.findOne('users', { _id: req.user.id });
        if (!user) return res.status(401).json({ message: 'User not valid or session expired' });
        const { password, ...userData } = user;
        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Quiz Progress
router.post('/quiz', auth, async (req, res) => {
    try {
        const { sessionId, score, totalQuestions, hintUsed = false, deleteOptionUsed = false, pointsAwarded } = req.body;
        console.log(`[Quiz Route] Incoming: ${JSON.stringify(req.body)}`);

        const updatedUser = await storage.atomicUpdate('users', { _id: req.user.id }, (user) => {
            const quizId = `q_s${sessionId}`;
            if (!user.quizScores) user.quizScores = {};

            const oldScore = user.quizScores[quizId] || 0;
            const newScore = Math.round((score / (totalQuestions || 10)) * 100);

            if (newScore >= oldScore) {
                user.quizScores[quizId] = newScore;
            }

            if (!user.completedQuizzes) user.completedQuizzes = [];
            
            // الحل النهائي: تحقق صارم ومنع تام
            const isQuizAlreadyCompleted = user.completedQuizzes.includes(quizId);
            
            console.log(`[Quiz Route] Quiz ID: ${quizId}`);
            console.log(`[Quiz Route] User completed quizzes:`, user.completedQuizzes);
            console.log(`[Quiz Route] Is already completed:`, isQuizAlreadyCompleted);
            console.log(`[Quiz Route] Points awarded from frontend:`, pointsAwarded);
            
            // إذا كان الاختبار مكتمل من قبل، لا تضف أي نقاط إطلاقاً
            if (isQuizAlreadyCompleted) {
                console.log(`[Quiz Route] BLOCKED: Quiz already completed. No points added.`);
                // لا تفعل شيئاً - لا تضف نقاط ولا تعدل القائمة
                return user;
            }
            
            // إذا لم يكن مكتمل، أضفه للقائمة واحسب النقاط
            user.completedQuizzes.push(quizId);
            console.log(`[Quiz Route] Added quiz to completed list: ${quizId}`);
            
            // احسب النقاط فقط إذا لم يكن مكتمل من قبل
            const pointsToAdd = pointsAwarded !== undefined ? pointsAwarded : (score || 0) * 5;
            
            if (pointsToAdd > 0) {
                user.points = (user.points || 0) + pointsToAdd;
                console.log(`[Quiz Route] Added ${pointsToAdd} points. New total: ${user.points}`);
            } else {
                console.log(`[Quiz Route] No points to add (pointsToAdd: ${pointsToAdd})`);
            }
            
            return user;
        });

        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        console.error(`[Quiz Error] ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Update Challenge Progress
router.post('/challenge', auth, async (req, res) => {
    try {
        const { challengeId, hintUsed = false, multipleChoiceUsed = false, timeBonus = false } = req.body;
        const updatedUser = await storage.atomicUpdate('users', { _id: req.user.id }, (user) => {
            if (!user.completedChallenges) user.completedChallenges = [];
            if (!user.completedChallenges.includes(challengeId)) {
                user.completedChallenges.push(challengeId);
                
                // Calculate points based on challenge type and bonuses
                let points = 20; // Base points for completing challenge
                
                // Deduct points for hints
                if (hintUsed) {
                    points -= 10;
                }
                
                // Deduct points for multiple choice
                if (multipleChoiceUsed) {
                    points -= 5;
                }
                
                // Add time bonus for quick completion (within 1 minute)
                if (timeBonus) {
                    points += 5;
                }
                
                // Ensure minimum points
                points = Math.max(points, 5);
                
                user.points = (user.points || 0) + points;
            }
            return user;
        });

        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deduct points for hints
router.post('/hint', auth, async (req, res) => {
    try {
        const updatedUser = await storage.atomicUpdate('users', { _id: req.user.id }, (user) => {
            user.points = Math.max(0, (user.points || 0) - 10);
            return user;
        });
        res.json({ message: 'Hint used, 10 points deducted', points: updatedUser.points });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unlock Next Session - Requirements: Quiz >= 50% AND ALL 4 Challenges Done
router.post('/unlock-session', auth, async (req, res) => {
    try {
        const { quizScore: inputQuizScore } = req.body;

        const result = await storage.atomicUpdate('users', { _id: req.user.id }, (user) => {
            const currentSess = user.currentSession;
            if (currentSess >= 4) {
                user.courseCompleted = true;
                return user;
            }

            const quizId = `q_s${currentSess}`;

            // تحديات المرحلة الأربعة: s1c1, s1c2, s1c3, s1c4 أو s2c1, s2c2, s2c3, s2c4 إلخ
            const allChallengeIds = [
                `s${currentSess}c1`,
                `s${currentSess}c2`,
                `s${currentSess}c3`,
                `s${currentSess}c4`
            ];

            // Re-calculate or fetch stored quiz score
            const storedQuizScore = (user.quizScores && user.quizScores[quizId] !== undefined) ? user.quizScores[quizId] : 0;

            // Allow inputQuizScore if provided, but prioritize stored one if it's enough
            const currentAttemptScore = inputQuizScore !== undefined ? inputQuizScore : 0;
            const quizPassed = (currentAttemptScore >= 50) || (storedQuizScore >= 50);

            // تحقق من أن جميع التحديات الأربعة مكتملة
            const completedChallenges = user.completedChallenges || [];
            const allChallengesDone = allChallengeIds.every(id => completedChallenges.includes(id));

            console.log(`[Unlock Check] User: ${user.username}, Session: ${currentSess}`);
            console.log(`[Unlock Check] QuizStored: ${storedQuizScore}%, QuizPassed: ${quizPassed}`);
            console.log(`[Unlock Check] AllChallenges: ${JSON.stringify(allChallengeIds)}`);
            console.log(`[Unlock Check] CompletedChallenges: ${JSON.stringify(completedChallenges)}`);
            console.log(`[Unlock Check] AllChallengesDone: ${allChallengesDone}`);

            if (quizPassed && allChallengesDone) {
                // IMPORTANT: Only increment if we haven't already
                if (user.currentSession === currentSess) {
                    user.currentSession = currentSess + 1;
                    console.log(`[Unlock Success] Advanced ${user.username} to Session ${user.currentSession}`);
                }
            }
            return user;
        });

        if (!result) return res.status(404).json({ message: 'User not found' });
        res.json(result);
    } catch (err) {
        console.error(`[Unlock Error] ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// Get Quiz Questions for a session
router.get('/quiz-data/:sessionId', auth, async (req, res) => {
    try {
        const questions = await storage.find('quizzes', { sessionNumber: parseInt(req.params.sessionId) });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Challenge Data for a session
router.get('/challenge-data/:sessionId', auth, async (req, res) => {
    try {
        const sessId = req.params.sessionId;
        let challenges = await storage.find('challenges', {
            $or: [
                { sessionNumber: parseInt(sessId) },
                { sessionNumber: sessId },
                { day: parseInt(sessId) },
                { day: sessId }
            ]
        });

        if (!challenges || !challenges.length) {
            // Fallback to any session that has day-based concepts low-level
            challenges = await storage.find('challenges', { day: parseInt(sessId) });
        }

        // Normalize items for new format
        const normalized = challenges.map((c, idx) => {
            if (!c.id && !c.challengeId) {
                c.id = `session${sessId || c.day || '0'}-item${idx+1}`;
            }
            if (!c.description && c.goal) {
                c.description = c.goal;
            }
            if (!c.sessionNumber && c.day) {
                c.sessionNumber = c.day;
            }
            return c;
        });

        res.json(normalized);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sync Points (for hints or other deductions)
router.post('/points', auth, async (req, res) => {
    try {
        const { points } = req.body;
        const result = await storage.atomicUpdate('users', { _id: req.user.id }, (user) => {
            user.points = points;
            return user;
        });
        res.json({ message: 'Points updated', points: result.points });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
