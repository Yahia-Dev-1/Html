require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI;

const userSchema = new mongoose.Schema({
    username: String,
    role: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function promote() {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB Atlas');

        const users = await User.find({});
        if (users.length === 0) {
            console.log('❌ No users found in database. Please register on the website first!');
            process.exit(0);
        }

        console.log('\nFound users:');
        users.forEach(u => console.log(`- ${u.username} (Role: ${u.role})`));

        // Let's promote the first user found or a specific name if provided
        const targetUsername = process.argv[2] || users[0].username;

        await User.updateOne({ username: targetUsername }, { $set: { role: 'Admin' } });
        console.log(`\n👑 User "${targetUsername}" has been promoted to Admin!`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

promote();
