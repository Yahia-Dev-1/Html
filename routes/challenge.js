const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const storage = require('../services/supabase-storage');

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

// Helper: Load Challenge Data
const getChallengeData = () => {
    const challengePath = path.join(__dirname, '..', 'data', 'challenges.json');
    if (fs.existsSync(challengePath)) {
        return JSON.parse(fs.readFileSync(challengePath, 'utf8'));
    }
    return [];
};

function cleanCode(code, structuralOnly = false) {
    if (!code) return '';
    let cleaned = code
        .toLowerCase()
        // Standardize common misspellings
        .replace(/<titel>/gi, '<title>')
        .replace(/<\/titel>/gi, '</title>')
        // Normalize entities and quotes
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/'/g, '"')
        // Normalize self-closing tags (convert <tag /> to <tag>)
        .replace(/<\s*([a-z0-9]+)\s*\/>/gi, '<$1>')
        // Remove trailing slashes in tags like <br/>
        .replace(/<\s*([a-z0-9]+)\s*\/>/gi, '<$1>')
        .replace(/<([a-z0-9]+)\s*\/?>/gi, '<$1>') // Temporary simplified tag for comparison if structural
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();

    if (structuralOnly) {
        cleaned = cleaned.replace(/>[^<]+</g, '><');
    }
    return cleaned;
}

function stripHtmlWrapper(code) {
    if (!code || typeof code !== 'string') return '';
    let stripped = code;
    stripped = stripped.replace(/<!doctype[^>]*>/gi, '')
        .replace(/<\s*html[^>]*>/gi, '')
        .replace(/<\s*\/html\s*>/gi, '')
        .replace(/<\s*head[^>]*>[\s\S]*?<\s*\/head\s*>/gi, '')
        .replace(/<\s*body[^>]*>/gi, '')
        .replace(/<\s*\/body\s*>/gi, '')
        .trim();
    return stripped;
}

function matchesExpectedFlexibly(studentCode, expectedCode) {
    const studentCore = cleanCode(stripHtmlWrapper(studentCode));
    const expectedCore = cleanCode(stripHtmlWrapper(expectedCode));

    if (!studentCore || !expectedCore) return false;
    if (studentCore === expectedCore) return true;
    if (studentCore.includes(expectedCore) || expectedCore.includes(studentCore)) return true;

    // إذا الطالب أتى بهيكل كامل لكن المطلوب جزء داخلي، تحقق من وجود العناصر الأساسية
    const expectedTags = expectedCore.match(/<[^>]+>/g) || [];
    const allFound = expectedTags.every(tag => studentCore.includes(tag));
    if (allFound) return true;

    return false;
}

// GET /api/challenge - Returns challenges WITHOUT expectedSolution
router.get('/', (req, res) => {
    try {
        const challenges = getChallengeData();
        const safeChallenges = challenges.map(c => {
            const { expectedSolution, ...safeC } = c;
            return safeC;
        });
        res.json(safeChallenges);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load challenges' });
    }
});

// POST /api/challenge/validate - Secure Challenge Validation
router.post('/validate', auth, async (req, res) => {
    try {
        const { challengeId, code, isPracticeMode, timeBonus, hintUsed, multipleChoiceUsed } = req.body;
        
        const challenges = getChallengeData();
        const challenge = challenges.find(c => {
            const cid = String(c.id).toLowerCase();
            const reqId = String(challengeId).toLowerCase();
            return cid === reqId || 
                   cid.replace('d', 's') === reqId || 
                   cid.replace('s', 'd') === reqId ||
                   String(c.day) === reqId ||
                   String(c.sessionNumber) === reqId;
        });
        
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }
        
        const studentRaw = code || '';
        const expectedSolution = challenge.expectedSolution || challenge.expected || challenge.goal || '';
        
        const studentCleaned = cleanCode(studentRaw);
        const expectedCleaned = cleanCode(expectedSolution);

        let isSuccess = studentCleaned === expectedCleaned;

        if (!isSuccess) {
            const studentStruct = cleanCode(studentRaw, true);
            const expectedStruct = cleanCode(expectedSolution, true);
            if (studentStruct === expectedStruct && studentStruct !== '') {
                isSuccess = true;
            }
        }

        if (!isSuccess) {
            function extractCoreContent(c) {
                const bodyMatch = c.match(/<body>(.*?)<\/body>/i);
                if (bodyMatch) return bodyMatch[1].trim();
                return c
                    .replace(/<!doctype\s+html>/gi, '')
                    .replace(/<\/?html>/gi, '')
                    .replace(/<head>.*?<\/head>/gi, '')
                    .replace(/<\/?body>/gi, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            const expectedContent = extractCoreContent(expectedCleaned);
            const studentClean = cleanCode(studentRaw);
            const hasStructureTags = /<(html|head|body|!doctype)/i.test(studentRaw);

            if (!hasStructureTags) {
                if (studentClean === expectedContent && studentClean !== '') {
                    isSuccess = true;
                }
                if (!isSuccess) {
                    const studentCleanStruct = cleanCode(studentRaw, true);
                    const expectedContentStruct = cleanCode(expectedContent, true);
                    if (studentCleanStruct === expectedContentStruct && studentCleanStruct !== '') {
                        isSuccess = true;
                    }
                }
            }

            if (!isSuccess && matchesExpectedFlexibly(studentRaw, expectedSolution)) {
                isSuccess = true;
            }
        }

        if (!isSuccess) {
            return res.json({ success: false });
        }

        if (isPracticeMode) {
             return res.json({ success: true, isPractice: true });
        }

        let earnedPoints = 25;
        if (timeBonus) earnedPoints += 5;
        if (hintUsed) earnedPoints -= 5;
        if (multipleChoiceUsed) earnedPoints -= 5;
        if (earnedPoints < 5) earnedPoints = 5; // Minimum points for passing

        const updatedUser = await storage.atomicUpdate('users', { id: req.user.id }, (user) => {
            if (!user.completedChallenges) user.completedChallenges = [];
            
            if (!user.completedChallenges.includes(challengeId)) {
                user.completedChallenges.push(challengeId);
                user.points = (user.points || 0) + earnedPoints;
                
                // Track challenge time logs (similar to what was in progress.js)
                if (!user.timeLogs) user.timeLogs = {};
                if (!user.timeLogs.challenges) user.timeLogs.challenges = {};
                user.timeLogs.challenges[challengeId] = new Date().toISOString();
            }
            return user;
        });

        if (!updatedUser) return res.status(404).json({ message: 'User not found' });

        res.json({ success: true, earnedPoints, user: updatedUser });

    } catch (err) {
        console.error('Challenge Validation Error:', err);
        res.status(500).json({ error: 'Server validation failed' });
    }
});

module.exports = router;
