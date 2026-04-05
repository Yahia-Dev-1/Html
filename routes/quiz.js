const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const storage = require('../services/supabase-storage');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';

// --- Innovative Solution: Embedded Data (No 404s on Vercel) ---
const quizData = [
  {
    "category": "أساسيات HTML - يوم 1",
    "questions": [
      {
        "question": "ما الدور الأساسي لـ HTML في بناء صفحات الويب؟",
        "choices": ["إدارة قواعد البيانات", "تصميم الألوان والخطوط", "بناء الهيكل الأساسي للصفحة", "إضافة التفاعل والحركة"],
        "correctAnswer": "بناء الهيكل الأساسي للصفحة",
        "hint": "فكر في الوظيفة الأساسية للغة HTML.",
        "explanationCorrect": "تُستخدم HTML لبناء الهيكل الأساسي والمحتوى المنظم لصفحات الويب.",
        "explanationsWrong": {
          "إدارة قواعد البيانات": "هذا من مسؤولية Back-End.",
          "تصميم الألوان والخطوط": "هذا دور CSS.",
          "إضافة التفاعل والحركة": "هذا دور JavaScript."
        }
      },
      {
        "question": "أي لغة مسؤولة عن شكل الصفحة والتصميم؟",
        "choices": ["HTML", "CSS", "JavaScript", "SQL"],
        "correctAnswer": "CSS",
        "hint": "تضيف الألوان والخطوط.",
        "explanationCorrect": "تتحكم CSS في مظهر وتصميم وتخطيط صفحات الويب.",
        "explanationsWrong": {
          "HTML": "يُستخدم لبناء هيكل الصفحة وليس لتصميمها.",
          "JavaScript": "يُستخدم لإضافة التفاعل وليس للتصميم.",
          "SQL": "هي لغة لإدارة قواعد البيانات."
        }
      },
      {
        "question": "ماذا يعني HTML؟",
        "choices": ["Hyper Text Markup Language", "High Tool Machine Language", "Hyper Transfer Mark Language", "Home Text Mark Language"],
        "correctAnswer": "Hyper Text Markup Language",
        "hint": "تذكر الاختصار الكامل.",
        "explanationCorrect": "HTML = Hyper Text Markup Language.",
        "explanationsWrong": {
          "High Tool Machine Language": "إجابة خاطئة.",
          "Hyper Transfer Mark Language": "إجابة خاطئة.",
          "Home Text Mark Language": "إجابة خاطئة."
        }
      },
      {
        "question": "أين يوضع المحتوى الذي يظهر للمستخدم؟",
        "choices": ["<head>", "<body>", "<meta>", "<title>"],
        "correctAnswer": "<body>",
        "hint": "الجزء الرئيسي من المستند.",
        "explanationCorrect": "يُوضع المحتوى المرئي الذي يظهر للمستخدم داخل وسم <body>.",
        "explanationsWrong": {
          "<head>": "للعناصر غير المرئية.",
          "<meta>": "بيانات وصفية.",
          "<title>": "عنوان الصفحة فقط."
        }
      },
      {
        "question": "أي وسم يمثل أكبر عنوان في الصفحة؟",
        "choices": ["<h6>", "<h3>", "<h1>", "<header>"],
        "correctAnswer": "<h1>",
        "hint": "الأهمية الأكبر.",
        "explanationCorrect": "يمثل وسم <h1> أكبر عنوان رئيسي في الصفحة.",
        "explanationsWrong": {
          "<h6>": "أصغر عنوان.",
          "<h3>": "وسط.",
          "<header>": "لرأس الصفحة، ليس عنوانًا."
        }
      },
      {
        "question": "ما وظيفة الوسم <br>؟",
        "choices": ["إنشاء فقرة", "كسر السطر", "إنشاء عنوان", "إنشاء قائمة"],
        "correctAnswer": "كسر السطر",
        "hint": "للبدء بسطر جديد.",
        "explanationCorrect": "يُستخدم وسم <br> لكسر السطر والانتقال إلى سطر جديد دون إنشاء فقرة جديدة.",
        "explanationsWrong": {
          "إنشاء فقرة": "<p> تستخدم لذلك.",
          "إنشاء عنوان": "<h1>-<h6> تستخدم لذلك.",
          "إنشاء قائمة": "<ul> أو <ol> تستخدم لذلك."
        }
      },
      {
        "question": "أي وسم يحتوي على معلومات لا تظهر مباشرة للمستخدم؟",
        "choices": ["<body>", "<head>", "<footer>", "<section>"],
        "correctAnswer": "<head>",
        "hint": "البيانات الوصفية.",
        "explanationCorrect": "يحتوي وسم <head> على معلومات وصفية عن الصفحة مثل العنوان والبيانات الوصفية (Meta Tags) التي لا تظهر مباشرة للمستخدم.",
        "explanationsWrong": {
          "<body>": "يظهر للمستخدم.",
          "<footer>": "يظهر في يمثل الجزء السفلي من الصفحة.",
          "<section>": "قسم المحتوى الرئيسي."
        }
      },
      {
        "question": "ما أول سطر في ملف HTML5؟",
        "choices": ["<html>", "<head>", "<!DOCTYPE html>", "<meta>"],
        "correctAnswer": "<!DOCTYPE html>",
        "hint": "يحدد نوع المستند.",
        "explanationCorrect": "يُحدد <!DOCTYPE html> نوع المستند وإصدار HTML المستخدم.",
        "explanationsWrong": {
          "<html>": "يأتي بعد <!DOCTYPE html>.",
          "<head>": "يأتي بعد <html>.",
          "<meta>": "داخل <head>."
        }
      },
      {
        "question": "أي جزء يهتم بما يراه المستخدم؟",
        "choices": ["Back-End", "Server", "Front-End", "Database"],
        "correctAnswer": "Front-End",
        "hint": "الواجهة الأمامية.",
        "explanationCorrect": "الـ Front-End هو الجزء المسؤول عن الواجهة التي يتفاعل معها المستخدم وما يراه على الشاشة.",
        "explanationsWrong": {
          "Back-End": "الخادم والبيانات.",
          "Server": "الخادم فقط.",
          "Database": "البيانات فقط."
        }
      },
      {
        "question": "أي من التالي محرر أكواد؟",
        "choices": ["Google Chrome", "Microsoft Word", "Visual Studio Code", "Photoshop"],
        "correctAnswer": "Visual Studio Code",
        "hint": "برنامج للكتابة البرمجية.",
        "explanationCorrect": "Visual Studio Code هو محرر أكواد شهير ومستخدم على نطاق واسع.",
        "explanationsWrong": {
          "Google Chrome": "متصفح فقط.",
          "Microsoft Word": "معالج نصوص.",
          "Photoshop": "تحرير الصور."
        }
      }
    ]
  },
  {
    "category": "وسائط وقوائم - يوم 2",
    "questions": [
      {
        "question": "وسم الرابط؟",
        "choices": ["<link>", "<a>", "<url>", "<href>"],
        "correctAnswer": "<a>",
        "hint": "Anchor",
        "explanationCorrect": "وسم <a> هو المسؤول عن إنشاء الروابط التشعبية (hyperlinks).",
        "explanationsWrong": {
          "<link>": "يُستخدم عادةً داخل وسم <head>.",
          "<url>": "ليس وسم HTML صالحًا.",
          "<href>": "هو سمة (attribute) وليس وسمًا (tag)."
        }
      },
      {
        "question": "وسم الصورة؟",
        "choices": ["<img>", "<picture>", "<image>", "<photo>"],
        "correctAnswer": "<img>",
        "hint": "عرض الصور",
        "explanationCorrect": "وسم <img> هو الوسم الأساسي لإدراج الصور في صفحات الويب.",
        "explanationsWrong": {
          "<picture>": "هو وسم متقدم وليس الأساسي.",
          "<image>": "إجابة غير صحيحة.",
          "<photo>": "غير موجود في HTML."
        }
      }
    ]
  },
  {
    "category": "جداول وفورم - يوم 3",
    "questions": [
      {
        "question": "أي وسم ينشئ جدول كامل؟",
        "choices": ["<table>", "<grid>", "<data>", "<tab>"],
        "correctAnswer": "<table>",
        "hint": "الوسم الأساسي للجدول.",
        "explanationCorrect": "وسم <table> هو الحاوية الرئيسية لإنشاء الجداول في HTML.",
        "explanationsWrong": {
          "<grid>": "لا يُستخدم في HTML.",
          "<data>": "إجابة غير صحيحة.",
          "<tab>": "إجابة غير صحيحة."
        }
      },
      {
        "question": "أي وسم ينشأ صفًا في الجدول؟",
        "choices": ["<tr>", "<td>", "<row>", "<th>"],
        "correctAnswer": "<tr>",
        "hint": "الصفوف الأفقية.",
        "explanationCorrect": "وسم <tr> يمثل صفًا كاملاً داخل الجدول.",
        "explanationsWrong": {
          "<td>": "يمثل خلية بيانات فقط.",
          "<row>": "غير موجود في HTML.",
          "<th>": "يمثل خلية عنوان فقط."
        }
      },
      {
        "question": "أي وسم ينشئ خلية بيانات؟",
        "choices": ["<td>", "<tr>", "<row>", "<cell>"],
        "correctAnswer": "<td>",
        "hint": "البيانات داخل الصف.",
        "explanationCorrect": "وسم <td> يمثل خلية بيانات عادية داخل صف الجدول.",
        "explanationsWrong": {
          "<tr>": "يمثل صفًا كاملاً.",
          "<row>": "غير موجود في HTML.",
          "<cell>": "غير موجود في HTML."
        }
      },
      {
        "question": "أي وسم يمثل خلية عنوان؟",
        "choices": ["<th>", "<td>", "<tr>", "<thead>"],
        "correctAnswer": "<th>",
        "hint": "رأس الجدول.",
        "explanationCorrect": "وسم <th> يمثل خلية عنوان (رأس) للجدول.",
        "explanationsWrong": {
          "<td>": "يمثل خلية بيانات فقط.",
          "<tr>": "يمثل صفًا كاملاً.",
          "<thead>": "مجموعة رؤوس الجدول."
        }
      },
      {
        "question": "أين توضع الصفوف <tr>؟",
        "choices": ["داخل <table>", "داخل <form>", "داخل <div>", "داخل <nav>"],
        "correctAnswer": "داخل <table>",
        "hint": "الحاوية الصحيحة للصفوف.",
        "explanationCorrect": "يجب أن توضع الصفوف <tr> دائمًا داخل وسم <table>.",
        "explanationsWrong": {
          "داخل <form>": "إجابة خاطئة.",
          "داخل <div>": "إجابة خاطئة.",
          "داخل <nav>": "إجابة خاطئة."
        }
      },
      {
        "question": "أي وسم يستخدم لإنشاء نموذج؟",
        "choices": ["<form>", "<input>", "<submit>", "<data>"],
        "correctAnswer": "<form>",
        "hint": "الوسم الحاوي للنموذج.",
        "explanationCorrect": "وسم <form> هو الحاوية الرئيسية لعناصر النموذج التي تجمع مدخلات المستخدم.",
        "explanationsWrong": {
          "<input>": "عنصر داخل النموذج.",
          "<submit>": "زر داخل النموذج.",
          "<data>": "إجابة غير صحيحة."
        }
      },
      {
        "question": "أي نوع لإدخال البريد؟",
        "choices": ["text", "email", "mail", "password"],
        "correctAnswer": "email",
        "hint": "نوع البريد الإلكتروني.",
        "explanationCorrect": "يُستخدم input type='email' لجمع عناوين البريد الإلكتروني.",
        "explanationsWrong": {
          "text": "يُستخدم لإدخال نص عادي.",
          "mail": "غير موجود في HTML.",
          "password": "للكلمات السرية."
        }
      },
      {
        "question": "أي نوع لإدخال كلمة المرور؟",
        "choices": ["text", "email", "password", "hidden"],
        "correctAnswer": "password",
        "hint": "تخفي الأحرف المدخلة.",
        "explanationCorrect": "يُستخدم input type='password' لإدخال كلمات المرور مع إخفاء الأحرف.",
        "explanationsWrong": {
          "text": "يُظهر النص المدخل.",
          "email": "مخصص لإدخال البريد الإلكتروني فقط.",
          "hidden": "لا يظهر محتواه على الصفحة."
        }
      },
      {
        "question": "زر الإرسال؟",
        "choices": ["button", "submit", "send", "push"],
        "correctAnswer": "submit",
        "hint": "يُستخدم لإرسال البيانات.",
        "explanationCorrect": "يُستخدم زر الإرسال (submit) لإرسال بيانات النموذج إلى الخادم.",
        "explanationsWrong": {
          "button": "يمثل زرًا عاديًا.",
          "send": "لا يُستخدم في HTML.",
          "push": "غير موجود في HTML."
        }
      },
      {
        "question": "ما الهدف من <form>؟",
        "choices": ["عرض صور", "جمع بيانات", "جداول", "تنقل"],
        "correctAnswer": "جمع بيانات",
        "hint": "الغرض الأساسي من النموذج.",
        "explanationCorrect": "<form> يُستخدم لجمع البيانات من المستخدم.",
        "explanationsWrong": {
          "عرض صور": "إجابة خاطئة.",
          "جداول": "إجابة خاطئة.",
          "تنقل": "إجابة خاطئة."
        }
      }
    ]
  },
  {
    "category": "التخطيط والوسوم الدلالية - يوم 4",
    "questions": [
      {
        "question": "أي وسم يمثل رأس الصفحة؟",
        "choices": ["<header>", "<head>", "<top>", "<nav>"],
        "correctAnswer": "<header>",
        "hint": "يمثل الجزء العلوي من الصفحة.",
        "explanationCorrect": "يمثل وسم <header> الجزء العلوي أو الترويسة للصفحة أو لقسم معين.",
        "explanationsWrong": {
          "<head>": "يحتوي على بيانات وصفية فقط.",
          "<top>": "غير موجود في HTML.",
          "<nav>": "يُستخدم للتنقل فقط."
        }
      },
      {
        "question": "أي وسم يمثل نهاية الصفحة؟",
        "choices": ["<footer>", "<bottom>", "<end>", "<finish>"],
        "correctAnswer": "<footer>",
        "hint": "يمثل الجزء السفلي من الصفحة.",
        "explanationCorrect": "<footer> يحتوي على معلومات تذييل الصفحة.",
        "explanationsWrong": {
          "<bottom>": "غير موجود في HTML.",
          "<end>": "غير موجود في HTML.",
          "<finish>": "غير موجود في HTML."
        }
      },
      {
        "question": "أي وسم يستخدم للتنقل؟",
        "choices": ["<menu>", "<nav>", "<links>", "<route>"],
        "correctAnswer": "<nav>",
        "hint": "يُستخدم لتجميع روابط التنقل الرئيسية في الموقع.",
        "explanationCorrect": "<nav> يحتوي على روابط تنقل.",
        "explanationsWrong": {
          "<menu>": "لا يُستخدم في هذا السياق.",
          "<links>": "غير موجود في HTML.",
          "<route>": "غير موجود في HTML."
        }
      },
      {
        "question": "أي وسم يحتوي على المحتوى الرئيسي؟",
        "choices": ["<main>", "<body>", "<content>", "<section>"],
        "correctAnswer": "<main>",
        "hint": "يحتوي على المحتوى الأساسي والفريد للصفحة.",
        "explanationCorrect": "يحتوي وسم <main> على المحتوى الرئيسي والفريد للمستند.",
        "explanationsWrong": {
          "<body>": "يحتوي على كامل محتوى الصفحة المرئي، وليس فقط المحتوى الرئيسي.",
          "<content>": "غير موجود في HTML.",
          "<section>": "يُستخدم لتقسيم جزء من المحتوى."
        }
      },
      {
        "question": "أي وسم يستخدم لمقال مستقل؟",
        "choices": ["<article>", "<section>", "<main>", "<aside>"],
        "correctAnswer": "<article>",
        "hint": "يُستخدم لمحتوى مستقل بذاته مثل مقال أو خبر.",
        "explanationCorrect": "يُستخدم وسم <article> لمحتوى مستقل بذاته وقابل للتوزيع بشكل مستقل، مثل مقال أو منشور مدونة.",
        "explanationsWrong": {
          "<section>": "يُستخدم لتقسيم أقسام المحتوى.",
          "<main>": "يُستخدم للمحتوى الرئيسي.",
          "<aside>": "يُستخدم للمحتوى الجانبي."
        }
      },
      {
        "question": "أي وسم للمحتوى الجانبي؟",
        "choices": ["<aside>", "<side>", "<extra>", "<box>"],
        "correctAnswer": "<aside>",
        "hint": "يُستخدم للمحتوى الجانبي أو الثانوي.",
        "explanationCorrect": "يُستخدم وسم <aside> للمحتوى الثانوي أو الجانبي الذي له صلة بالمحتوى الرئيسي ولكن يمكن فهمه بشكل منفصل.",
        "explanationsWrong": {
          "<side>": "غير موجود في HTML.",
          "<extra>": "غير موجود في HTML.",
          "<box>": "غير موجود في HTML."
        }
      },
      {
        "question": "عنصر <div> يعتبر؟",
        "choices": ["عنصر دلالي", "حاوية عامة", "صورة", "جدول"],
        "correctAnswer": "حاوية عامة",
        "hint": "يُستخدم غالبًا لأغراض التخطيط والتصميم.",
        "explanationCorrect": "يُستخدم وسم <div> كحاوية عامة لتجميع عناصر HTML لأغراض التنسيق أو التخطيط.",
        "explanationsWrong": {
          "عنصر دلالي": "إجابة غير صحيحة.",
          "صورة": "إجابة غير صحيحة.",
          "جدول": "إجابة غير صحيحة."
        }
      },
      {
        "question": "ما الفرق بين block و inline؟",
        "choices": ["الحجم", "السطر الجديد", "اللون", "الرابط"],
        "correctAnswer": "السطر الجديد",
        "hint": "يُشير إلى كيفية تأثير العنصر على تدفق المحتوى.",
        "explanationCorrect": "عناصر Block-level تبدأ سطرًا جديدًا وتأخذ العرض الكامل المتاح، بينما عناصر Inline-level تظهر في نفس السطر وتأخذ فقط المساحة التي تحتاجها.",
        "explanationsWrong": {
          "الحجم": "إجابة خاطئة.",
          "اللون": "إجابة خاطئة.",
          "الرابط": "إجابة خاطئة."
        }
      },
      {
        "question": "ما الهدف من Semantic Tags؟",
        "choices": ["تحسين الفهم لمحركات البحث", "تسريع الإنترنت", "صور", "جداول"],
        "correctAnswer": "تحسين الفهم لمحركات البحث",
        "hint": "يُساهم في تحسين محركات البحث (SEO).",
        "explanationCorrect": "تساعد الوسوم الدلالية (Semantic Tags) محركات البحث على فهم بنية ومحتوى الصفحة بشكل أفضل.",
        "explanationsWrong": {
          "تسريع الإنترنت": "إجابة خاطئة.",
          "صور": "إجابة خاطئة.",
          "جداول": "إجابة خاطئة."
        }
      },
      {
        "question": "<section> يستخدم لـ؟",
        "choices": ["تقسيم الصفحة", "صورة", "جدول", "نموذج"],
        "correctAnswer": "تقسيم الصفحة",
        "hint": "يُستخدم لتنظيم المحتوى في أقسام.",
        "explanationCorrect": "يُستخدم وسم <section> لتقسيم المحتوى إلى أقسام موضوعية مستقلة داخل المستند.",
        "explanationsWrong": {
          "صورة": "إجابة خاطئة.",
          "جدول": "إجابة خاطئة.",
          "نموذج": "إجابة خاطئة."
        }
      }
    ]
  }
];

// Auth Middleware
const auth = (req, res, next) => {
    try {
        const token = req.get('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ message: 'No token' });
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

// GET /api/quiz - Returns quizzes WITHOUT correct answers
router.get('/', (req, res) => {
    try {
        const safeQuizzes = quizData.map(category => ({
            ...category,
            questions: category.questions.map(q => {
                const { correctAnswer, explanationCorrect, explanationsWrong, ...safeQuestion } = q;
                return safeQuestion;
            })
        }));
        res.json(safeQuizzes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load quizzes' });
    }
});

// POST /api/quiz/check-question
router.post('/check-question', auth, (req, res) => {
    try {
        const { sessionId, questionIndex, answer } = req.body;
        
        const sessionCategories = {
            1: "أساسيات HTML - يوم 1",
            2: "وسائط وقوائم - يوم 2",
            3: "جداول وفورم - يوم 3",
            4: "التخطيط والوسوم الدلالية - يوم 4"
        };
        
        const categoryName = sessionCategories[Number(sessionId)];
        const targetCategory = quizData.find(c => c.category === categoryName);
        
        if (!targetCategory) return res.status(404).json({ error: 'Category not found' });
        
        const actualQuestion = targetCategory.questions[questionIndex];
        if (!actualQuestion) return res.status(404).json({ error: 'Question not found' });

        const isCorrect = (answer || '').trim() === actualQuestion.correctAnswer.trim();
        
        res.json({
            isCorrect,
            correctAnswer: actualQuestion.correctAnswer,
            explanation: isCorrect ? actualQuestion.explanationCorrect : (actualQuestion.explanationsWrong?.[answer] || 'إجابة خاطئة، حاول مرة أخرى!')
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check answer' });
    }
});

module.exports = router;
module.exports.quizData = quizData;
