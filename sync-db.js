require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Force using Google DNS to bypass local ISP blocking
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error('❌ MONGO_URI not found in .env file!');
    process.exit(1);
}

async function sync() {
    let client;
    try {
        client = new MongoClient(mongoUri);
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas (Native Driver)');

        const db = client.db(); // Uses DB from URI
        const dataDir = path.join(__dirname, 'data');

        // Sync Quizzes
        if (fs.existsSync(path.join(dataDir, 'quizzes.json'))) {
            const quizData = JSON.parse(fs.readFileSync(path.join(dataDir, 'quizzes.json'), 'utf8'));
            try { await db.collection('quizzes').drop(); } catch (e) { }
            await db.collection('quizzes').insertMany(quizData);
            console.log(`✅ Uploaded ${quizData.length} Quizzes`);
        }

        // Sync Challenges
        if (fs.existsSync(path.join(dataDir, 'challenges.json'))) {
            const challengeData = JSON.parse(fs.readFileSync(path.join(dataDir, 'challenges.json'), 'utf8'));
            try { await db.collection('challenges').drop(); } catch (e) { }
            await db.collection('challenges').insertMany(challengeData);
            console.log(`✅ Uploaded ${challengeData.length} Challenges`);
        }

        console.log('\n🚀 ALL DATA SYNCED SUCCESSFULLY!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during sync:', err);
        process.exit(1);
    } finally {
        if (client) await client.close();
    }
}

sync();
