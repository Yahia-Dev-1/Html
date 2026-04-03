const locales = {
    en: {
        // General
        "app_title": "HTML Mastery Quiz",
        "app_desc": "Test your HTML knowledge with specialized interactive challenges",
        "btn_login": "Login",
        "btn_register": "Create Account",
        "btn_logout": "🚪 Logout",
        "username_label": "Username",
        "password_label": "Password",
        "username_placeholder": "Enter your name here",
        "password_placeholder": "Enter your password",

        // Dashboard
        "nav_student": "Learner",
        "nav_points": "💰 {points} Points",
        "admin_dashboard_btn": "⚙️ Admin Dashboard",
        "dash_welcome": "Welcome Back!",
        "dash_sub": "Continue your path to HTML mastery",

        // Materials
        "guide_title": "Comprehensive Guide",
        "guide_desc": "A complete guide to web building",
        "btn_open_book": "📖 Open Book",

        // Sessions
        "session_locked": "🔒 Locked",
        "session_unlocked": "Unlocked",
        "session_completed": "✅ Completed",
        "session_pending": "⏳ Pending",
        "theory_result": "⭐ Theory Result",
        "practical_challenge": "🛠️ Practical Challenge",
        "lock_reason": "Complete Session {id} first",
        "lock_alert": "🔒 Sorry, you must complete Session {id} first (Theory Quiz & Practical Challenge).",

        // Categories
        "category_title": "Session Content",
        "category_hint": "Select a section to start - each section contains specialized questions",
        "quiz_btn": "📝 Theory Quiz",
        "challenge_btn": "💻 Practical Challenge",

        // Quiz
        "quiz_title": "HTML Quiz",
        "q_progress": "Question: {current} / {total}",
        "time_left": "Time Left",
        "btn_prev": "Previous",
        "btn_next": "Next",
        "btn_confirm": "Confirm Answer",
        "explanation": "Explanation",
        "answered_count": "Answered: {count}",

        // Results
        "results_done": "Quiz Completed!",
        "results_success_sub": "Great job finishing the quiz!",
        "results_fail_sub": "You need {threshold}% to pass. Your current score: {score}%",
        "time_spent": "Time Spent",
        "score_label": "Score",
        "accuracy": "Accuracy",
        "btn_home": "🏠 Home",
        "btn_review": "👁️ Review Answers",
        "review_answers": "Review Answers:",
        "your_answer": "Your Answer: ",
        "correct_answer": "Correct: ",
        "not_selected": "Not Selected",

        // Challenge Editor
        "challenge_title": "Practical Challenge",
        "task_reqs": "📝 Task Requirements",
        "code_builder": "🛠️ Code Builder",
        "live_preview": "👁️ Live Preview",
        "tags_lib": "📦 Tags Library",
        "btn_validate": "Check Validation",
        "btn_hint": "Hint (Costs 10 pts)",

        // Generic Feedback
        "error_generic": "An error occurred, please try again",
        "loading": "Loading...",

        // Dynamic Session Content
        "s1_title": "HTML Basics",
        "s1_desc": "Page Structure, Headings, and Paragraphs",
        "s2_title": "Links & Images",
        "s2_desc": "Adding Interactivity and Media",
        "s3_title": "Tables & Lists",
        "s3_desc": "Organizing Data and Content",
        "s4_title": "Forms & Semantics",
        "s4_desc": "Building Interactive Interfaces",

        // Popups & Confirmations
        "btn_yes": "Yes",
        "btn_no": "No",
        "btn_confirm_delete": "Yes, Delete",
        "btn_cancel": "Cancel",
        "confirm_delete_title": "Confirm Delete",
        "confirm_delete_msg": "Are you sure you want to delete this item?",
        "confirm_delete_student_msg": "Are you sure you want to delete this student permanently?",
        "confirm_replay_title": "Replay All Challenges",
        "confirm_replay_msg": "Do you want to replay all challenges? No extra points will be given!",
        "confirm_hint_title": "Buy Hint",
        "confirm_hint_msg": "Do you want to buy a hint for {cost} points? You'll have {remaining} points left.",
        
        // Feedback
        "hint_purchased": "Hint Purchased!",
        "hint_deduction": "💰 Deducted {cost} points • Balance: {balance} pts",
        "insufficient_points": "⚠️ Not enough points (You have {current}, need {cost})",
        "quiz_timeout": "⏰ Time's up!",
        "code_added": "✅ Code added successfully!",
        "clipboard_error": "⚠️ Clipboard inaccessible. Please paste code manually.",
        
        // Buttons
        "btn_next_q": "Next",
        "btn_finish_quiz": "Finish Quiz",
        "btn_close": "Close",
        "btn_details": "📊 Details",
        "btn_delete": "🗑️ Delete"
    },
    ar: {
        // General
        "app_title": "اختبار إتقان HTML",
        "app_desc": "اختبر معلوماتك في HTML من خلال أسئلة وتحديات تفاعلية",
        "btn_login": "تسجيل الدخول",
        "btn_register": "إنشاء حساب",
        "btn_logout": "🚪 تسجيل الخروج",
        "username_label": "اسم المستخدم",
        "password_label": "كلمة المرور",
        "username_placeholder": "أدخل اسمك هنا",
        "password_placeholder": "أدخل كلمة المرور",

        // Dashboard
        "nav_student": "المتعلم",
        "nav_points": "💰 {points} نقطة",
        "admin_dashboard_btn": "⚙️ لوحة الإدارة",
        "dash_welcome": "أهلاً بك مجدداً!",
        "dash_sub": "استكمل مسار إتقان لغة الـ HTML",

        // Materials
        "guide_title": "المادة العلمية الشاملة",
        "guide_desc": "دليل شامل لتعلم بناء المواقع",
        "btn_open_book": "📖 فتح الكتاب",

        // Sessions
        "session_locked": " مقفولة",
        "session_unlocked": "مفتوحة",
        "session_completed": " مكتمل",
        "session_pending": " معلق",
        "theory_result": " النتيجة في النظري",
        "practical_challenge": " التحدي العملي",
        "lock_reason": "أكمل المرحلة {id} أولاً",
        "lock_alert": " عذراً، يجب إكمال المرحلة {id} أولاً (الاختبار النظري والتحدي العملي).",
        "points_reset_success": "✅ تم تصفير النقاط بنجاح",
        "add_points_prompt": "أدخل عدد النقاط المراد إضافتها:",
        "session_unlock_success": "✅ تم فتح المرحلة بنجاح",
        "btn_magic_repair": "✨ إصلاح ذكي (-20 نقطة)",
        "magic_repair_success": "✅ تم إصلاح الكود وتصحيح الأخطاء!",
        "btn_reset_points": "💰 تصفير النقاط",
        "btn_unlock_next": "🔓 فتح المرحلة التالية",
        "reset_points_confirm": "هل أنت متأكد من تصفير نقاط هذا الطالب؟",
        "unlock_session_confirm": "هل أنت متأكد من فتح المرحلة التالية لهذا الطالب؟",
        "points_display": "النقاط الحالية: {points}",
        "challenge_repaired": "تم إصلاح {count} خطأ في الكود",
        "admin_action_performed": "✅ تم تنفيذ الإجراء بنجاح",
        "confirm_delete_title": "تأكيد الحذف",
        "confirm_delete_message": "هل أنت متأكد من حذف هذا الطالب نهائياً؟",
        "confirm_delete_warning": "لا يمكن التراجع عن هذا الإجراء",
        "btn_confirm_yes": "نعم، احذف",
        "btn_cancel": "إلغاء",

        // Categories
        "category_title": "محتوى المرحلة",
        "category_hint": "اختر قسماً لبدء الاختبار – كل قسم يحتوي على أسئلة متخصصة",
        "quiz_btn": " الاختبار النظري",
        "challenge_btn": " التحدي العملي",

        // Quiz
        "quiz_title": "اختبار HTML",
        "q_progress": "السؤال: {current} / {total}",
        "time_left": "الوقت المتبقي",
        "btn_prev": "السابق",
        "btn_next": "التالي",
        "btn_confirm": "تأكيد الإجابة",
        "explanation": "شرح الإجابة",
        "answered_count": "تم الإجابة: {count}",

        // Results
        "results_done": "اكتمل الاختبار!",
        "results_success_sub": "لقد قمت بعمل رائع في إنهاء جميع الأسئلة",
        "results_fail_sub": "تحتاج إلى {threshold}% للاجتياز. درجتك الحالية: {score}%",
        "time_spent": "الوقت المستغرق",
        "score_label": "الدرجة",
        "accuracy": "الدقة المئوية",
        "btn_home": "🏠 الرئيسية",
        "btn_review": "👁️ مراجعة الإجابات",
        "review_answers": "مراجعة الإجابات:",
        "your_answer": "إجابتك: ",
        "correct_answer": "الصحيحة: ",
        "not_selected": "لم يتم الاختيار",

        // Challenge Editor
        "challenge_title": "التحدي العملي",
        "task_reqs": "📝 متطلبات التحدي",
        "code_builder": "🛠️ باني الأكواد",
        "live_preview": "👁️ المعاينة المباشرة",
        "tags_lib": "📦 مكتبة الوسوم",
        "btn_validate": "التحقق من الكود",
        "btn_hint": "تلميح (يخصم 10 نقاط)",

        // Generic Feedback
        "error_generic": "حدث خطأ، يرجى المحاولة لاحقاً",
        "loading": "جاري التحميل...",

        // Dynamic Session Content
        "s1_title": "أساسيات HTML - يوم 1",
        "s1_desc": "هيكل الصفحة، العناوين، والفقرات",
        "s2_title": "وسائط وقوائم - يوم 2",
        "s2_desc": "إضافة التفاعل والوسائط",
        "s3_title": "جداول وفورم - يوم 3",
        "s3_desc": "تنظيم البيانات والمحتوى",
        "s4_title": "Semantic - يوم 4",
        "s4_desc": "بناء واجهات تفاعلية",

        // Popups & Confirmations
        "btn_yes": "نعم",
        "btn_no": "لا",
        "btn_confirm_delete": "🗑️ نعم، احذف",
        "btn_cancel": "❌ إلغاء",
        "confirm_delete_title": "تأكيد الحذف",
        "confirm_delete_msg": "هل أنت متأكد من حذف هذا العنصر؟",
        "confirm_delete_student_msg": "هل أنت متأكد من حذف هذا الطالب نهائياً؟",
        "confirm_replay_title": "إعادة جميع التحديات",
        "confirm_replay_msg": "هل تريد إعادة جميع التحديات؟ لن يتم احتساب نقاط إضافية!",
        "confirm_hint_title": "تأكيد شراء التلميح",
        "confirm_hint_msg": "هل تريد شراء تلميح مقابل {cost} نقطة؟ سيتبقى معك {remaining} نقطة.",
        
        // Feedback
        "hint_purchased": "تم شراء التلميح!",
        "hint_deduction": "💰 تم خصم {cost} نقطة • رصيدك: {balance} نقطة",
        "insufficient_points": "⚠️ ليس لديك نقاط كافية (لديك {current}، تحتاج {cost})",
        "quiz_timeout": "⏰ انتهى الوقت!",
        "code_added": "✅ تم إضافة الكود بنجاح!",
        "clipboard_error": "⚠️ لا يمكن الوصول للحافظة. يرجى لصق الكود يدوياً.",
        "error_empty_code": "⚠️ لا يوجد كود لتصحيحه! أضف بعض الوسوم أولاً.",
        
        // Buttons
        "btn_next_q": "التالي",
        "btn_finish_quiz": "إنهاء الاختبار",
        "btn_close": "إغلاق",
        "btn_details": "📊 التفاصيل",
        "btn_delete": "🗑️ حذف"
    }
};

// Helper function to get text by key and replace variables
function t(key, replacements = {}) {
    // Current lang is retrieved from global state or localStorage, defaulting to 'en'
    const currentLang = localStorage.getItem('appLang') || 'en';
    let text = locales[currentLang][key] || key;

    for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}
