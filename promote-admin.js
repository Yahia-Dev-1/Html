require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;

async function promote(username) {
    if (!username) {
        console.log('Usage: node promote-admin.js <username>');
        process.exit(1);
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const result = await db.collection('users').updateOne(
            { username: username },
            { $set: { role: 'Admin' } }
        );

        if (result.matchedCount > 0) {
            console.log(`✅ User "${username}" is now an Admin!`);
        } else {
            console.log(`❌ User "${username}" not found.`);
        }
    } finally {
        await client.close();
    }
}

promote(process.argv[2]);
