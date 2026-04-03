# 🎓 منصة تعلم HTML التفاعلية (HTML Quiz & Challenge)

منصة تعليمية متكاملة لتعلم لغة HTML من خلال الاختبارات النظرية والتحديات العملية بنظام النقاط (Gamification).

## ✨ المميزات الرئيسيّة
- **🏠 لوحة تحكم الطالب:** تتبع التقدم في 4 مراحل أساسية.
- **📝 اختبارات نظرية:** أسئلة لكل مرحلة بنظام تصحيح ذكي وتلميحات.
- **🛠️ تحديات عملية:** محرر سحب وإفلات (Drag & Drop) لبناء الأكواد مع معاينة مباشرة وحفظ تلقائي.
- **🏆 نظام النقاط:** الحصول على نقاط عند الإتمام، مكافآت للسرعة، وخصم للنقاط عند استخدام المساعدات.
- **🔐 نظام الحماية:** تشفير بيانات المستخدمين وحماية المسارات الإدارية.
- **📊 لوحة تحكم الإدارة:** متابعة الطلاب، تعديل النقاط، وفتح المستويات يدوياً.

## 🚀 التشغيل المباشر (Local)
1. قم بتركيب المكتبات المطلوبة:
   ```bash
   npm install
   ```
2. ابدأ التشغيل:
   ```bash
   npm run start
   ```
3. افتح المتصفح على: `http://localhost:5000`

---

## 🌍 الرفع على Vercel و GitHub

### 1. الرفع على GitHub
- تأكد أن لديك حساب على GitHub.
- قم بإنشاء Repo جديد.
- اتبع الأوامر التالية:
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  git branch -M main
  git remote add origin [رابط_المخزن_الخاص_بك]
  git push -u origin main
  ```

### 2. الرفع على Vercel
1. ادخل على [Vercel](https://vercel.com).
2. قم بربط حساب GitHub الخاص بك.
3. اختر مشروع `HTML-Quiz-main`.
4. في **Environment Variables**، قم بإضافة:
   - `JWT_SECRET`: سر التشفير (أي نص قوي).
   - `MONGO_URI`: رابط قاعدة بيانات MongoDB (يفضل MongoDB Atlas للاستمرار بعد إغلاق المتصفح).
   - `WHATSAPP_NUMBER`: رقم التواصل.
5. اضغط **Deploy**.

---

## 🛠️ تفاصيل تقنية
- **Backend:** Node.js, Express.js.
- **Database:** JSON Files (Development) / MongoDB (Production).
- **Frontend:** Vanilla JS, CSS3, HTML5 (Semantic).
- **Auth:** JWT (JSON Web Tokens) & Bcrypt.

## 📂 هيكل المجلدات
- `/public`: ملفات الواجهة الأمامية (HTML, CSS, JS).
- `/routes`: مسارات الـ API (Auth, Quiz, Challenge, Admin).
- `/services`: خدمات التخزين والربط بقاعدة البيانات.
- `/data`: البيانات الثابتة (الأسئلة والتحديات).

---

## 👨‍💻 للمطورين
تم تطوير النظام ليكون مرناً، يمكنك إضافة أسئلة جديدة في `data/quizzes.json` أو تحديات في `data/challenges.json` وستنعكس تلقائياً في الموقع.

**صنع بفضل الله لتطوير مهارات الويب العربي** 🚀
