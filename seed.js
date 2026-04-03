/**
 * Database Seeder - تهيئة البيانات الأولية
 * تشغيل: npm run seed
 */

const storage = require('./services/storage');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
    console.log('🌱 بدء تهيئة قاعدة البيانات...');

    // إنشاء مسؤول افتراضي
    const admin = await storage.createUser({
        username: 'admin',
        password: 'admin123',
        role: 'Admin'
    });
    console.log('✅ تم إنشاء المسؤول:', admin.username);

    // إنشاء حسابات اختبار
    const testUsers = [
        { username: 'student1', password: 'pass123', role: 'Student' },
        { username: 'student2', password: 'pass123', role: 'Student' },
        { username: 'yahia', password: '123456', role: 'Admin' },
        { username: 'dev', password: '123456', role: 'Student' }
    ];

    for (let user of testUsers) {
        try {
            const existingUser = storage.findUser(user.username);
            if (!existingUser) {
                const newUser = await storage.createUser(user);
                console.log(`✅ تم إنشاء المستخدم: ${newUser.username}`);
            } else {
                console.log(`⏭️  المستخدم موجود بالفعل: ${user.username}`);
            }
        } catch (err) {
            console.error(`❌ خطأ في إنشاء ${user.username}:`, err.message);
        }
    }

    console.log('\n✨ انتهت التهيئة بنجاح!');
    console.log('\n📝 حسابات الاختبار:');
    console.log('   مسؤول: admin / admin123');
    console.log('   مسؤول: yahia / 123456');
    console.log('   طالب: dev / 123456');
    console.log('   طالب: student1 / pass123');
    console.log('   طالب: student2 / pass123');
}

// تشغيل السيد
seedDatabase().catch(console.error);
