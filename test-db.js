require('dotenv').config();
const storage = require('./services/storage');

async function test() {
    console.log('Testing MongoDB connection...');
    try {
        const users = await storage.find('users', {});
        console.log('Search completed. Result count:', users.length);
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

test();
