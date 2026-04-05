const translations = {
    ar: {
        // General
        app_title: "إتقان HTML",
        loading: "جاري التحميل...",
        error_generic: "حدث خطأ ما",
        success: "تم بنجاح",
        confirm_delete_title: "تأكيد الحذف",
        confirm_delete_msg: "هل أنت متأكد من حذف هذا السطر؟",
        btn_confirm_yes: "نعم، حذف",
        btn_cancel: "إلغاء",
        btn_back: "العودة",
        not_enough_points: "ليس لديك نقاط كافية!",
        
        // Auth
        tab_login: "تسجيل الدخول",
        tab_register: "إنشاء حساب",
        label_fullname: "الاسم بالكامل",
        label_password: "كلمة المرور",
        placeholder_name: "أدخل اسمك بالكامل",
        placeholder_pass: "أدخل كلمة المرور",
        btn_auth_login: "تسجيل الدخول",
        btn_auth_register: "إنشاء حساب جديد",
        auth_error: "خطأ في تسجيل الدخول",
        
        // Dashboard
        welcome_back: "أهلاً بك مجدداً!",
        hero_sub: "استكمل مسار إتقان لغة الـ HTML",
        points: "نقطة",
        btn_admin: "⚙️ لوحة الإدارة",
        btn_logout: "🚪 تسجيل الخروج",
        session_locked: "🔒 هذه المرحلة مقفولة حالياً",
        
        // Quiz
        quiz_title: "اختبار نظري",
        btn_confirm: "تأكيد الإجابة",
        btn_next_q: "السؤال التالي ⬅️",
        btn_finish_quiz: "إنهاء الاختبار 🏁",
        quiz_timeout: "⏰ انتهى الوقت!",
        quiz_completed: "تم إنهاء الاختبار بنجاح!",
        btn_hint: "💡 تلميح (-5 نقاط)",
        btn_delete_option: "❌ حذف خيار (-10 نقاط)",
        
        // Challenge
        challenge_title: "التحدي العملي",
        btn_check_solution: "✅ التحقق من الحل",
        btn_show_hint: "💡 تلميح (-10 نقاط)",
        btn_clear_code: "🔄 إعادة ضبط المحرر",
        magic_repair_success: "✅ تم إصلاح الكود تلقائياً!",
        item_deleted_success: "تم حذف العنصر بنجاح",
        
        // Admin
        admin_panel: "لوحة الإدارة",
        total_students: "إجمالي الطلاب",
        btn_reset_points: "تصفير النقاط",
        btn_unlock_next: "فتح المستوى التالي",
        btn_delete: "حذف الطالب",
        confirm_delete_message: "هل أنت متأكد من حذف هذا الطالب نهائياً؟",
        confirm_delete_warning: "لا يمكن التراجع عن هذا الإجراء وسيتم مسح جميع بياناته.",
        student_delete_success: "تم حذف الطالب بنجاح",
        points_reset_success: "تم تصفير النقاط بنجاح",
        session_unlock_success: "تم فتح المستوى التالي بنجاح"
    }
};

function t(key) {
    return translations.ar[key] || key;
}

window.t = t;
