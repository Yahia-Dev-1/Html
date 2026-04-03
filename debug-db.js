require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI;

async function check() {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    const challenges = await db.collection('challenges').find({ sessionNumber: 1 }).toArray();
    console.log('--- Challenges Session 1 ---');
    console.log(JSON.stringify(challenges[0], null, 2));

    const quizzes = await db.collection('quizzes').find({ sessionNumber: 1 }).toArray();
    console.log('--- Quizzes Session 1 ---');
    console.log(JSON.stringify(quizzes[0], null, 2));

    process.exit(0);
}

check();
