const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Force using Google DNS to bypass local ISP blocking for SRV records
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.log('DNS secondary servers not supported or already set.');
}

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const DATA_DIR = path.join(__dirname, '../data');

let client;
let db;
let usingFileStorage = false;

// File-based user storage for development
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read users from file
const readUsersFromFile = () => {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading users file:', e.message);
    }
    return [];
};

// Write users to file
const writeUsersToFile = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('Error writing users file:', e.message);
    }
};

// Generate simple ID for file storage
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Connect to MongoDB (For Users only)
async function connectToDatabase() {
    if (db) return db;
    
    // If no MongoDB URI, use file storage
    if (!uri) {
        usingFileStorage = true;
        return null;
    }
    
    try {
        if (!client) {
            client = new MongoClient(uri);
            await client.connect();
        }
        db = client.db(); // Use DB from URI
        console.log('✅ Connected to MongoDB Atlas successfully');
        return db;
    } catch (err) {
        console.log('MongoDB connection failed, using file storage');
        usingFileStorage = true;
        return null;
    }
}

// Read Local JSON (For Quizzes/Challenges)
const readLocalData = (collection) => {
    try {
        const filePath = path.join(DATA_DIR, `${collection}.json`);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {
        console.error(`Error reading local ${collection}:`, e.message);
    }
    return [];
};

// Helper function to check if user should be admin
const ADMIN_USERS = ['yahia'];
function isAdminUser(username, userCount = null) {
    if (ADMIN_USERS.includes(username)) return true;
    if (userCount === 0) return true; // First user is admin
    return false;
}

const storage = {
    find: async (coll, query = {}) => {
        // Users from Cloud or File Storage
        if (coll === 'users') {
            if (usingFileStorage) {
                let users = readUsersFromFile();
                return users.filter(user => {
                    return Object.keys(query).every(key => {
                        if (key === '_id') {
                            return user[key] === query[key];
                        }
                        return user[key] == query[key];
                    });
                });
            } else {
                const database = await connectToDatabase();
                if (!database) {
                    usingFileStorage = true;
                    return await storage.find('users', query);
                }
                if (query._id && typeof query._id === 'string' && query._id.length === 24) {
                    query._id = new ObjectId(query._id);
                }
                return await database.collection('users').find(query).toArray();
            }
        }

        // Quizzes/Challenges from Local Files (ALWAYS WORKS)
        const data = readLocalData(coll);
        return data.filter(item => {
            return Object.keys(query).every(key => {
                if (key === '$or') { // Basic support for the or query
                    return query[key].some(subQuery =>
                        Object.keys(subQuery).every(subKey => item[subKey] == subQuery[subKey])
                    );
                }
                return item[key] == query[key];
            });
        });
    },

    findOne: async (coll, query = {}) => {
        if (coll === 'users') {
            if (usingFileStorage) {
                let users = readUsersFromFile();
                const user = users.find(user => {
                    return Object.keys(query).every(key => {
                        if (key === '_id') {
                            return user[key] === query[key];
                        }
                        return user[key] == query[key];
                    });
                });
                if (user && user.username.trim().toLowerCase() === 'yahia') {
                    user.role = 'Admin';
                }
                return user;
            } else {
                const database = await connectToDatabase();
                // If no database connection, fallback to file storage
                if (!database) {
                    usingFileStorage = true;
                    let users = readUsersFromFile();
                    const user = users.find(user => {
                        return Object.keys(query).every(key => {
                            if (key === '_id') return user[key] === query[key];
                            return user[key] == query[key];
                        });
                    });
                    if (user && isAdminUser(user.username)) user.role = 'Admin';
                    return user;
                }
                if (query._id && typeof query._id === 'string' && query._id.length === 24) {
                    query._id = new ObjectId(query._id);
                }
                const user = await database.collection('users').findOne(query);
                if (user && isAdminUser(user.username)) {
                    user.role = 'Admin';
                }
                return user;
            }
        }
        const data = readLocalData(coll);
        return data.find(item => Object.keys(query).every(key => item[key] == query[key]));
    },

    insert: async (coll, item) => {
        if (coll === 'users') {
            if (usingFileStorage) {
                let users = readUsersFromFile();
                const newUser = { ...item, _id: generateId() };
                users.push(newUser);
                writeUsersToFile(users);
                return newUser;
            } else {
                const database = await connectToDatabase();
                if (!database) {
                    usingFileStorage = true;
                    return await storage.insert('users', item);
                }
                const result = await database.collection('users').insertOne(item);
                return { ...item, _id: result.insertedId };
            }
        }
        return item;
    },

    update: async (coll, query, updates) => {
        if (coll === 'users') {
            const database = await connectToDatabase();
            if (!database) {
                usingFileStorage = true;
                return await storage.update('users', query, updates);
            }
            if (query._id && typeof query._id === 'string' && query._id.length === 24) {
                query._id = new ObjectId(query._id);
            }
            return await database.collection('users').updateOne(query, { $set: updates });
        }
        return null;
    },

    deleteOne: async (coll, query) => {
        if (coll === 'users') {
            if (usingFileStorage) {
                let users = readUsersFromFile();
                const initialLength = users.length;
                
                // Keep all users EXCEPT the one matching the query _id
                users = users.filter(user => user._id !== query._id);
                
                if (users.length < initialLength) {
                    writeUsersToFile(users);
                    return { deletedCount: 1 };
                }
                return { deletedCount: 0 };
            } else {
                const database = await connectToDatabase();
                if (!database) {
                    usingFileStorage = true;
                    return await storage.deleteOne('users', query);
                }
                if (query._id && typeof query._id === 'string' && query._id.length === 24) {
                    query._id = new ObjectId(query._id);
                }
                return await database.collection('users').deleteOne(query);
            }
        }
        return null;
    },

    atomicUpdate: async (coll, query, callback) => {
        if (coll === 'users') {
            if (usingFileStorage) {
                let users = readUsersFromFile();
                const userIndex = users.findIndex(user => {
                    return Object.keys(query).every(key => {
                        if (key === '_id') {
                            return user[key] === query[key];
                        }
                        return user[key] == query[key];
                    });
                });
                
                if (userIndex !== -1) {
                    const updated = callback({ ...users[userIndex] });
                    const userId = updated._id;
                    delete updated._id;
                    updated._id = userId;
                    users[userIndex] = updated;
                    writeUsersToFile(users);
                    return updated;
                }
                return null;
            } else {
                const database = await connectToDatabase();
                if (!database) {
                    usingFileStorage = true;
                    return await storage.atomicUpdate('users', query, callback);
                }
                if (query._id && typeof query._id === 'string' && query._id.length === 24) {
                    query._id = new ObjectId(query._id);
                }
                const user = await database.collection('users').findOne(query);
                if (user) {
                    const updated = callback({ ...user });
                    const userId = user._id;
                    delete updated._id;
                    const result = await database.collection('users').findOneAndUpdate(
                        { _id: userId },
                        { $set: updated },
                        { returnDocument: 'after' }
                    );
                    return result;
                }
            }
        }
        return null;
    },

    findUser: async (username) => {
        // Normalize username for consistent comparison
        const normalizedUsername = username.trim().toLowerCase();
        
        if (usingFileStorage) {
            let users = readUsersFromFile();
            // Find user with case-insensitive comparison
            const user = users.find(user => 
                user.username.trim().toLowerCase() === normalizedUsername
            );
            
            if (user && user.username.trim().toLowerCase() === 'yahia') {
                user.role = 'Admin';
            }
            return user;
        } else {
            const database = await connectToDatabase();
            // If no database connection, fallback to file storage
            if (!database) {
                usingFileStorage = true;
                return await storage.findUser(username);
            }
            
            // For MongoDB, use case-insensitive query
            return await database.collection('users').findOne({
                username: { $regex: new RegExp(`^${normalizedUsername}$`, 'i') }
            });
        }
    },

    createUser: async (userData) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        let userCount = 0;
        if (usingFileStorage) {
            const users = readUsersFromFile();
            userCount = users.length;
        } else {
            const database = await connectToDatabase();
            if (database) {
                userCount = await database.collection('users').countDocuments();
            } else {
                usingFileStorage = true;
                const users = readUsersFromFile();
                userCount = users.length;
            }
        }

        // Check if user should be admin (yahia or first user)
        const role = isAdminUser(userData.username, userCount) ? 'Admin' : 'Student';

        const user = {
            ...userData,
            password: hashedPassword,
            role: role,
            currentSession: 1,
            completedChallenges: [],
            completedQuizzes: [],
            quizScores: {},
            points: 0,
            createdAt: new Date()
        };
        
        return await storage.insert('users', user);
    },

    comparePassword: async (p, h) => await bcrypt.compare(p, h),
    
    isAdminUser: (username, userCount = null) => isAdminUser(username, userCount)
};

module.exports = storage;
