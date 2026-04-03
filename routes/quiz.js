const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const storage = require('../services/storage');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

// Auth Middleware
const auth = (req, res, next) => {
    try {
        const token = req.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        console.log('✅ Token verified for user:', decoded.id);
        next();
    } catch (err) {
        console.error('Auth error:', err.message);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

// Helper: Load Quiz Data
const getQuizData = () => {
    const quizPath = path.join(__dirname, '..', 'data', 'quizzes.json');
    if (fs.existsSync(quizPath)) {
        return JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    }
    return [];
};

// GET /api/quiz - Returns quizzes WITHOUT correct answers
router.get('/', (req, res) => {
    try {
        const quizzes = getQuizData();
        // Remove sensitive fields
        const safeQuizzes = quizzes.map(category => ({
            ...category,
            questions: category.questions.map(q => {
                const { correctAnswer, explanation, ...safeQuestion } = q;
                return safeQuestion;
            })
        }));
        res.json(safeQuizzes);
    } catch (error) {
        console.error('Failed to load quizzes:', error);
        res.status(500).json({ error: 'Failed to load quizzes' });
    }
});

// POST /api/quiz/check-question - Validate a single question and return feedback
router.post('/check-question', auth, (req, res) => {
    console.log('🔍 check-question endpoint processing request');
    try {
        const { sessionId, questionIndex, answer } = req.body;
        console.log(`📊 Session: ${sessionId}, Question: ${questionIndex}, Answer: ${answer}`);
        
        const allQuizzes = getQuizData();
        if (!allQuizzes || allQuizzes.length === 0) {
            console.error('❌ No quizzes loaded');
            return res.status(500).json({ error: 'No quizzes data available' });
        }

        const sessionCategories = {
            1: "أساسيات HTML - يوم 1",
            2: "وسائط وقوائم - يوم 2",
            3: "جداول وفورم - يوم 3",
            4: "Semantic - يوم 4"
        };
        const categoryName = sessionCategories[Number(sessionId)];
        let targetCategory = categoryName ? allQuizzes.find(c => c.category === categoryName) : allQuizzes[0];
        
        let questions = targetCategory ? targetCategory.questions : [];
        if (!categoryName) {
            allQuizzes.forEach(cat => questions.push(...cat.questions));
        }

        const actualQuestion = questions[questionIndex];
        if (!actualQuestion) {
            console.error(`❌ Question not found at index ${questionIndex}`);
            return res.status(404).json({ error: 'Question not found' });
        }

        // Comparison with trim and case-insensitivity for safety
        const userClean = (answer || '').trim().replace(/\s+/g, ' ');
        const correctClean = (actualQuestion.correctAnswer || '').trim().replace(/\s+/g, ' ');
        const isCorrect = userClean === correctClean;
        
        let explanation = '';
        if (isCorrect) {
            explanation = actualQuestion.explanationCorrect || 'أحسنت! إجابتك صحيحة.';
        } else {
            explanation = actualQuestion.explanationsWrong?.[answer] || 'حاول مرة أخرى في السؤال التالي!';
        }
        
        console.log(`✅ Answer processed: isCorrect=${isCorrect}`);
        res.json({
            isCorrect,
            correctAnswer: actualQuestion.correctAnswer,
            explanation
        });
    } catch (error) {
        console.error('❌ Check question error:', error);
        res.status(500).json({ error: 'Failed to check answer' });
    }
});

// POST /api/quiz/validate - Final Quiz Submission
router.post('/validate', auth, async (req, res) => {
    try {
        const { sessionId, userAnswers, hintsUsed, deleteOptionsUsed, timeBonusGiven } = req.body;
        
        let sessionIndex = sessionId - 1;
        const allQuizzes = getQuizData();
        if (sessionIndex < 0 || sessionIndex >= allQuizzes.length) {
            // Default logic in frontend fetches everything if sessionId > 4
            sessionIndex = 0; 
        }

        let targetQuestions;
        if (sessionId >= 1 && sessionId <= 4) {
            targetQuestions = allQuizzes[sessionIndex].questions;
        } else {
            targetQuestions = [];
            allQuizzes.forEach(cat => targetQuestions.push(...cat.questions));
        }

        if (!targetQuestions || targetQuestions.length === 0) {
            return res.status(400).json({ error: 'No questions found for session' });
        }

        let correctCount = 0;
        const results = userAnswers.map((userAns, index) => {
            const actualQuestion = targetQuestions[index];
            if (!actualQuestion) return { isCorrect: false };
            
            const isCorrect = userAns === actualQuestion.correctAnswer;
            if (isCorrect) correctCount++;
            
            return {
                questionIndex: index,
                isCorrect,
                correctAnswer: actualQuestion.correctAnswer,
                explanation: isCorrect ? 
                    (actualQuestion.explanationCorrect || "الإجابة الصحيحة.") : 
                    (actualQuestion.explanationsWrong?.[userAns] || "الإجابة الصحيحة.")
            };
        });

        // Points logic
        let earnedPoints = correctCount * 5;
        if (timeBonusGiven) earnedPoints += 20;

        const maxPoints = (targetQuestions.length * 5) + 20;

        // Perform atomic update inside storage
        const updatedUser = await storage.atomicUpdate('users', { _id: req.user.id }, (user) => {
            const quizId = `q_s${sessionId}`;
            if (!user.quizScores) user.quizScores = {};
            if (!user.completedQuizzes) user.completedQuizzes = [];

            const oldScore = user.quizScores[quizId] || 0;
            const newScorePct = Math.round((correctCount / targetQuestions.length) * 100);

            if (newScorePct >= oldScore) {
                user.quizScores[quizId] = newScorePct;
            }

            // Only award points if it's the first time
            if (!user.completedQuizzes.includes(quizId)) {
                user.completedQuizzes.push(quizId);
                user.points = (user.points || 0) + earnedPoints;
            }

            return user;
        });

        if (!updatedUser) return res.status(404).json({ message: 'User not found' });

        res.json({
            score: Math.round((correctCount / targetQuestions.length) * 100),
            correctCount,
            total: targetQuestions.length,
            earnedPoints,
            results,
            user: updatedUser
        });

    } catch (err) {
        console.error('Quiz Validation Error:', err);
        res.status(500).json({ error: 'Server validation failed' });
    }
});

console.log('✅ quiz.js module loaded and routes registered');
module.exports = router;
