require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Force using Google DNS to bypass local ISP blocking for SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in .env file!');
    process.exit(1);
}

async function migrateUsers() {
    let client;
    try {
        console.log('🚀 Starting User Migration to MongoDB Atlas...');
        
        const usersFilePath = path.join(__dirname, 'data', 'users.json');
        if (!fs.existsSync(usersFilePath)) {
            console.error('❌ users.json file not found in data folder.');
            process.exit(1);
        }

        const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        if (usersData.length === 0) {
            console.log('⚠️ No users found in users.json to migrate.');
            process.exit(0);
        }

        client = new MongoClient(mongoUri);
        await client.connect();
        console.log('✅ Connected to MongoDB Atlas');

        const db = client.db();
        const usersCollection = db.collection('users');

        // Check for existing users to avoid duplicates if needed
        // Or just clear the collection for a fresh start (caution)
        // For this task, we will insert them if they don't exist by username
        
        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of usersData) {
            const existing = await usersCollection.findOne({ username: user.username });
            if (!existing) {
                // Ensure _id from JSON is NOT used as MongoDB ObjectId if it's not valid
                const { _id, ...userData } = user;
                await usersCollection.insertOne(userData);
                migratedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`\n🎉 MIGRATION COMPLETED!`);
        console.log(`✅ Migrated: ${migratedCount} students`);
        console.log(`⚠️ Skipped (already exist): ${skippedCount} students`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during user migration:', err);
        process.exit(1);
    } finally {
        if (client) await client.close();
    }
}

migrateUsers();
