require('dotenv').config();
const { MongoClient } = require('mongodb');
const dns = require('dns');

// Force using Google DNS to bypass local ISP blocking for SRV records
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    // Ignore if not supported
}

/**
 * MongoDB Atlas Connection "Sanity Check" Example (Audit Log)
 * This script verifies your connection and performs basic CRUD operations.
 */

async function main() {
    // 1. Read MONGODB_URI from environment variables (from your .env file)
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!uri || uri.includes('<db_password>')) {
        console.error('❌ Error: MONGODB_URI is missing or contains the <db_password> placeholder.');
        console.log('Please ensure your .env file has the correct URI with your actual password.');
        process.exit(1);
    }

    // Initialize the MongoDB Client
    const client = new MongoClient(uri);

    try {
        console.log('📡 Attempting to connect to MongoDB Atlas...');
        await client.connect();
        console.log('✅ Connected successfully!');

        const db = client.db('audit_log_db');
        const collection = db.collection('system_logs');

        // 2. Insert 10 realistic Audit Log documents
        console.log('📝 Inserting 10 test audit logs...');
        const logs = [
            { action: 'user_login', user: 'yahia_admin', status: 'success', timestamp: new Date(Date.now() - 10000) },
            { action: 'page_view', user: 'student_01', page: 'html_basics', timestamp: new Date(Date.now() - 9000) },
            { action: 'quiz_start', user: 'student_02', quiz_id: 'q1', timestamp: new Date(Date.now() - 8000) },
            { action: 'challenge_submit', user: 'student_01', status: 'pass', timestamp: new Date(Date.now() - 7000) },
            { action: 'admin_login', user: 'yahia_dev', status: 'success', timestamp: new Date(Date.now() - 6000) },
            { action: 'settings_change', user: 'yahia_admin', field: 'site_title', timestamp: new Date(Date.now() - 5000) },
            { action: 'user_logout', user: 'student_01', timestamp: new Date(Date.now() - 4000) },
            { action: 'quiz_complete', user: 'student_02', score: 85, timestamp: new Date(Date.now() - 3000) },
            { action: 'password_reset', user: 'student_03', status: 'success', timestamp: new Date(Date.now() - 2000) },
            { action: 'system_backup', user: 'system', status: 'completed', timestamp: new Date() }
        ];

        const insertResult = await collection.insertMany(logs);
        console.log(`✅ Successfully inserted ${insertResult.insertedCount} documents.`);

        // 3. Read and print the 5 most recent documents (Sorted by timestamp)
        console.log('\n🔍 Reading the 5 most recent logs:');
        const recentLogs = await collection.find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        recentLogs.forEach((log, index) => {
            console.log(`  [${index + 1}] ${log.timestamp.toISOString()} - ${log.user}: ${log.action}`);
        });

        // 4. Read one specific document by its ID
        const firstId = insertResult.insertedIds[0];
        console.log(`\n🆔 Fetching a single document by _id: ${firstId}`);
        const singleDoc = await collection.findOne({ _id: firstId });
        console.log('Result:', JSON.stringify(singleDoc, null, 2));

        console.log('\n✨ Database sanity check completed successfully!');

    } catch (error) {
        console.error('❌ Connection or Query Failure:', error.message);
    } finally {
        // 5. Close the connection
        await client.close();
        console.log('🔌 Connection closed.');
    }
}

// Run the example
main().catch(console.error);
