const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

const DATA_DIR = path.join(__dirname, '../data');
let usingFileStorage = false;

// File-based fallback
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read users from file (fallback)
const readUsersFromFile = () => {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf8');
            return [];
        }
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('[SupabaseStorage] Error reading users file:', e.message);
        return [];
    }
};

// Write users to file (fallback)
const writeUsersToFile = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('[SupabaseStorage] Error writing users file:', e.message);
    }
};

// Generate simple ID
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Initialize Supabase client
let supabase = null;
usingFileStorage = false; // Use Supabase now that table is created

if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('[SupabaseStorage] ✅ Supabase client initialized (using file storage fallback)');
    } catch (err) {
        console.error('[SupabaseStorage] ❌ Failed to initialize Supabase:', err.message);
    }
} else {
    console.log('[SupabaseStorage] No Supabase credentials, using file storage');
}

// Ensure users table exists
async function ensureUsersTable() {
    if (!supabase || usingFileStorage) return false;
    
    try {
        // Check if table exists by querying it
        const { error } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        
        if (error && error.code === '42P01') {
            // Table doesn't exist - we'll handle this in the calling code
            console.log('[SupabaseStorage] Users table may not exist');
            return false;
        }
        
        return true;
    } catch (err) {
        console.error('[SupabaseStorage] Error checking table:', err.message);
        return false;
    }
}

const ADMIN_USERS = ['yahia'];
function isAdminUser(username, userCount = null) {
    if (ADMIN_USERS.includes(username)) return true;
    if (userCount === 0) return true;
    return false;
}

const storage = {
    find: async (coll, query = {}) => {
        if (coll !== 'users') {
            // For non-user collections, use local JSON files
            const filePath = path.join(DATA_DIR, `${coll}.json`);
            try {
                if (fs.existsSync(filePath)) {
                    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
                }
            } catch (e) {
                console.error(`[SupabaseStorage] Error reading ${coll}:`, e.message);
            }
            return [];
        }

        // Users from Supabase or file
        if (!usingFileStorage && supabase) {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*');
                
                if (error) {
                    console.error('[SupabaseStorage] Supabase query error:', error.message);
                    usingFileStorage = true;
                } else {
                    // Convert snake_case to camelCase and apply query filter
                    const convertedData = (data || []).map(user => ({
                        id: user.id,
                        username: user.username,
                        password: user.password,
                        role: user.role,
                        displayName: user.display_name,
                        currentSession: user.current_session,
                        points: user.points,
                        completedChallenges: user.completed_challenges,
                        completedQuizzes: user.completed_quizzes,
                        quizScores: user.quiz_scores,
                        createdAt: user.created_at
                    }));
                    
                    if (query && Object.keys(query).length > 0) {
                        return convertedData.filter(user => {
                            return Object.keys(query).every(key => {
                                return user[key] == query[key];
                            });
                        });
                    }
                    return convertedData;
                }
            } catch (err) {
                console.error('[SupabaseStorage] Supabase find error:', err.message);
                usingFileStorage = true;
            }
        }
        
        // Fallback to file storage
        return readUsersFromFile();
    },

    findOne: async (coll, query = {}) => {
        const results = await storage.find(coll, query);
        return results[0] || null;
    },

    findUser: async (username) => {
        const normalizedUsername = username.trim().toLowerCase();
        
        if (!usingFileStorage && supabase) {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .ilike('username', normalizedUsername)
                    .single();
                
                if (error && error.code !== 'PGRST116') {
                    console.error('[SupabaseStorage] findUser error:', error.message);
                }
                
                if (data) {
                    if (isAdminUser(data.username)) data.role = 'Admin';
                    return data;
                }
            } catch (err) {
                console.error('[SupabaseStorage] findUser exception:', err.message);
            }
        }
        
        // File fallback
        const users = readUsersFromFile();
        const user = users.find(u => 
            u.username.trim().toLowerCase() === normalizedUsername
        );
        if (user && isAdminUser(user.username)) user.role = 'Admin';
        return user;
    },

    insert: async (coll, item) => {
        if (coll !== 'users') return item;

        if (!usingFileStorage && supabase) {
            try {
                // Convert camelCase to snake_case for Supabase
                const supabaseItem = {
                    username: item.username,
                    password: item.password,
                    role: item.role,
                    display_name: item.displayName,
                    current_session: item.current_session || item.currentSession || 1,
                    points: item.points || 0,
                    completed_challenges: item.completed_challenges || item.completedChallenges || [],
                    completed_quizzes: item.completed_quizzes || item.completedQuizzes || [],
                    quiz_scores: item.quiz_scores || item.quizScores || {}
                };
                
                console.log('[SupabaseStorage] Inserting user:', supabaseItem.username);
                
                const { data, error } = await supabase
                    .from('users')
                    .insert([supabaseItem])
                    .select()
                    .single();
                
                if (error) {
                    console.error('[SupabaseStorage] Insert error:', error.message, error.code, error.details);
                    usingFileStorage = true;
                } else {
                    console.log('[SupabaseStorage] User inserted successfully:', data.id);
                    return data;
                }
            } catch (err) {
                console.error('[SupabaseStorage] Insert exception:', err.message);
                usingFileStorage = true;
            }
        }
        
        // File fallback
        const users = readUsersFromFile();
        const newUser = { ...item, id: generateId() };
        users.push(newUser);
        writeUsersToFile(users);
        return newUser;
    },

    update: async (coll, query, updates) => {
        if (coll !== 'users') return null;

        if (!usingFileStorage && supabase) {
            try {
                const { error } = await supabase
                    .from('users')
                    .update(updates)
                    .match(query);
                
                if (error) {
                    console.error('[SupabaseStorage] Update error:', error.message);
                }
                return { modifiedCount: 1 };
            } catch (err) {
                console.error('[SupabaseStorage] Update exception:', err.message);
            }
        }
        return null;
    },

    deleteOne: async (coll, query) => {
        if (coll !== 'users') return null;

        if (!usingFileStorage && supabase) {
            try {
                const { error } = await supabase
                    .from('users')
                    .delete()
                    .match(query);
                
                if (error) {
                    console.error('[SupabaseStorage] Delete error:', error.message);
                }
                return { deletedCount: 1 };
            } catch (err) {
                console.error('[SupabaseStorage] Delete exception:', err.message);
            }
        }
        
        // File fallback
        const users = readUsersFromFile();
        const initialLength = users.length;
        const filtered = users.filter(user => user._id !== query._id && user.id !== query.id);
        if (filtered.length < initialLength) {
            writeUsersToFile(filtered);
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    },

    atomicUpdate: async (coll, query, callback) => {
        if (coll !== 'users') return null;

        const user = await storage.findOne(coll, query);
        if (!user) return null;

        const updated = callback({ ...user });
        
        if (!usingFileStorage && supabase) {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .update(updated)
                    .match(query)
                    .select()
                    .single();
                
                if (error) {
                    console.error('[SupabaseStorage] AtomicUpdate error:', error.message);
                    usingFileStorage = true;
                } else {
                    return data;
                }
            } catch (err) {
                console.error('[SupabaseStorage] AtomicUpdate exception:', err.message);
                usingFileStorage = true;
            }
        }
        
        // File fallback
        const users = readUsersFromFile();
        const index = users.findIndex(u => 
            (u._id && u._id === query._id) || (u.id && u.id === query.id) ||
            (u.username && u.username === query.username)
        );
        if (index !== -1) {
            users[index] = { ...users[index], ...updated };
            writeUsersToFile(users);
            return users[index];
        }
        return null;
    },

    createUser: async (userData) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        // Count existing users
        let userCount = 0;
        try {
            const existing = await storage.find('users', {});
            userCount = existing.length;
        } catch (e) {
            console.error('[SupabaseStorage] Error counting users:', e.message);
        }

        const role = isAdminUser(userData.username, userCount) ? 'Admin' : 'Student';

        const user = {
            ...userData,
            password: hashedPassword,
            role: role,
            current_session: 1,
            completed_challenges: [],
            completed_quizzes: [],
            quiz_scores: {},
            points: 0,
            created_at: new Date().toISOString()
        };
        
        return await storage.insert('users', user);
    },

    comparePassword: async (password, hash) => await bcrypt.compare(password, hash),
    
    isAdminUser: (username, userCount = null) => isAdminUser(username, userCount),
    
    getStorageType: () => usingFileStorage ? 'file' : 'supabase'
};

module.exports = storage;
