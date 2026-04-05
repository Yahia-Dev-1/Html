const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const storage = require('../services/supabase-storage');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

// --- Innovative Solution: Embedded Data (No 404s on Vercel) ---
const challengesData = [
  {
    "id": "d1c1",
    "sessionNumber": 1,
    "title": "عنوان رئيسي",
    "description": "اكتب عنوان كبير يحتوي على النص: مرحباً بك في تعلم HTML",
    "hint": "استخدم <h1>",
    "required": "عنوان فقط",
    "expectedSolution": "<h1>مرحباً بك في تعلم HTML</h1>"
  },
  {
    "id": "d1c2",
    "sessionNumber": 1,
    "title": "فقرة بسطرين",
    "description": "اكتب فقرة تحتوي على النص: أنا أتعلم البرمجة ثم سطر جديد ثم النص: HTML سهلة",
    "hint": "استخدم <p> و <br>",
    "required": "فقرة فيها سطرين",
    "expectedSolution": "<p>أنا أتعلم البرمجة<br>HTML سهلة</p>"
  },
  {
    "id": "d1c3",
    "sessionNumber": 1,
    "title": "صفحة كاملة",
    "description": "أنشئ صفحة HTML كاملة بعنوان التبويب: موقعي وبداخلها عنوان يقول: أهلاً بك",
    "hint": "DOCTYPE + head + body",
    "required": "هيكل كامل",
    "expectedSolution": "<!DOCTYPE html><html><head><title>موقعي</title></head><body><h1>أهلاً بك</h1></body></html>"
  },
  {
    "id": "d1c4",
    "sessionNumber": 1,
    "title": "تعليق مخفي",
    "description": "أنشئ صفحة تحتوي على تعليق مكتوب فيه: هذا تعليق + عنوان: مرحباً",
    "hint": "<!-- -->",
    "required": "تعليق + عنوان",
    "expectedSolution": "<!-- هذا تعليق --><h1>مرحباً</h1>"
  },
  {
    "id": "d2c1",
    "sessionNumber": 2,
    "title": "رابط",
    "description": "أنشئ رابط يفتح موقع Google ويعرض النص: اضغط هنا",
    "hint": "<a href>",
    "required": "رابط يعمل",
    "expectedSolution": "<a href=\"https://google.com\">اضغط هنا</a>"
  },
  {
    "id": "d2c2",
    "sessionNumber": 2,
    "title": "صورة",
    "description": "اعرض صورة اسمها img.jpg مع نص بديل: صورة",
    "hint": "<img>",
    "required": "صورة + alt",
    "expectedSolution": "<img src=\"img.jpg\" alt=\"صورة\">"
  },
  {
    "id": "d2c3",
    "sessionNumber": 2,
    "title": "قائمة مهارات",
    "description": "اعرض قائمة تحتوي على: HTML و CSS و JavaScript",
    "hint": "<ul> و <li>",
    "required": "3 عناصر",
    "expectedSolution": "<ul><li>HTML</li><li>CSS</li><li>JavaScript</li></ul>"
  },
  {
    "id": "d2c4",
    "sessionNumber": 2,
    "title": "كارت بسيط",
    "description": "أنشئ عنوان: منتج + صورة + وصف: منتج رائع",
    "hint": "h2 + img + p",
    "required": "3 عناصر",
    "expectedSolution": "<h2>منتج</h2><img src=\"img.jpg\"><p>منتج رائع</p>"
  },
  {
    "id": "d3c1",
    "sessionNumber": 3,
    "title": "جدول بسيط",
    "description": "أنشئ جدول يحتوي على رقم 1 و 2 في صف واحد",
    "hint": "table + tr + td",
    "required": "صف واحد",
    "expectedSolution": "<table><tr><td>1</td><td>2</td></tr></table>"
  },
  {
    "id": "d3c2",
    "sessionNumber": 3,
    "title": "جدول كامل",
    "description": "أنشئ جدول يحتوي على 2 صف و 2 عمود",
    "hint": "كرر tr",
    "required": "2x2",
    "expectedSolution": "<table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>"
  },
  {
    "id": "d3c3",
    "sessionNumber": 3,
    "title": "نموذج",
    "description": "أنشئ فورم يحتوي على input نصي و input إيميل",
    "hint": "form + input",
    "required": "input text + email",
    "expectedSolution": "<form><input type=\"text\"><input type=\"email\"></form>"
  },
  {
    "id": "d3c4",
    "sessionNumber": 3,
    "title": "فورم تسجيل",
    "description": "أنشئ فورم يحتوي على اسم + إيميل + زر إرسال",
    "hint": "submit",
    "required": "form كامل",
    "expectedSolution": "<form><input type=\"text\"><input type=\"email\"><button type=\"submit\">إرسال</button></form>"
  },
  {
    "id": "d4c1",
    "sessionNumber": 4,
    "title": "Header و Footer",
    "description": "أنشئ header يحتوي على عنوان: موقعي و footer يحتوي على: جميع الحقوق محفوظة",
    "hint": "header + footer",
    "required": "2 عناصر",
    "expectedSolution": "<header><h1>موقعي</h1></header><footer>جميع الحقوق محفوظة</footer>"
  },
  {
    "id": "d4c2",
    "sessionNumber": 4,
    "title": "قائمة تنقل",
    "description": "أنشئ nav يحتوي على رابطين: الرئيسية و من نحن",
    "hint": "nav + ul",
    "required": "روابط",
    "expectedSolution": "<nav><ul><li><a href=\"#\">الرئيسية</a></li><li><a href=\"#\">من نحن</a></li></ul></nav>"
  },
  {
    "id": "d4c3",
    "sessionNumber": 4,
    "title": "قسم ومقال",
    "description": "أنشئ section يحتوي على article به نص: هذا مقال",
    "hint": "section + article",
    "required": "هيكل صحيح",
    "expectedSolution": "<section><article><p>هذا مقال</p></article></section>"
  },
  {
    "id": "d4c4",
    "sessionNumber": 4,
    "title": "صفحة كاملة",
    "description": "أنشئ صفحة تحتوي على header + main + footer",
    "hint": "layout كامل",
    "required": "3 أجزاء",
    "expectedSolution": "<header>Header</header><main>Main</main><footer>Footer</footer>"
  }
];

// Auth Middleware
const auth = (req, res, next) => {
    const token = req.get('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

function cleanCode(code, structuralOnly = false) {
    if (!code) return '';
    let cleaned = code.toLowerCase()
        .replace(/&quot;/g, '"').replace(/'/g, '"')
        .replace(/<\s*([a-z0-9]+)\s*\/>/gi, '<$1>')
        .replace(/>\s+/g, '>').replace(/\s+</g, '<')
        .replace(/<\s+/g, '<').replace(/\s+>/g, '>')
        .replace(/\s+/g, ' ').trim();

    if (structuralOnly) {
        cleaned = cleaned.replace(/<([a-z0-9]+)([^>]*)>/gi, '<$1>').replace(/>[^<]+</g, '><');
    }
    return cleaned;
}

// Routes
router.get('/', (req, res) => res.json(challengesData));

router.post('/validate', auth, async (req, res) => {
    try {
        const { challengeId, code, isPracticeMode } = req.body;
        const challenge = challengesData.find(c => c.id === challengeId);
        if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

        const isCorrect = cleanCode(code) === cleanCode(challenge.expectedSolution);
        
        if (isCorrect && !isPracticeMode) {
            const updatedUser = await storage.atomicUpdate('users', { id: req.user.id }, (user) => {
                if (!user.completedChallenges) user.completedChallenges = [];
                if (!user.completedChallenges.includes(challengeId)) {
                    user.completedChallenges.push(challengeId);
                    user.points = (user.points || 0) + 20;
                }
                return user;
            });
            return res.json({ success: true, user: updatedUser });
        }

        res.json({ success: isCorrect });
    } catch (err) {
        console.error('Validation Error:', err);
        res.status(500).json({ error: 'Server error during validation' });
    }
});

module.exports = router;
module.exports.challengesData = challengesData;