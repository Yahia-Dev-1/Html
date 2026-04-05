const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

const DATA_DIR = path.join(process.cwd(), 'data');
let usingFileStorage = false;

// File-based fallback
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists (with try-catch for Vercel)
try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
} catch (e) {
    console.log('[SupabaseStorage] File system is read-only (Vercel)');
}

// Read users from file (fallback)
const readUsersFromFile = () => {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('[SupabaseStorage] Error reading users file:', e.message);
        return [];
    }
};

// Write users to file (fallback - disabled on Vercel)
const writeUsersToFile = (users) => {
    if (process.env.VERCEL) return;
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
if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('[SupabaseStorage] ✅ Supabase client initialized');
    } catch (err) {
        console.error('[SupabaseStorage] ❌ Failed to initialize Supabase:', err.message);
    }
}

const ADMIN_USERS = ['yahia'];
function isAdminUser(username) {
    return ADMIN_USERS.includes(username);
}

const storage = {
    find: async (coll, query = {}) => {
        if (coll !== 'users') {
            const filePath = path.join(DATA_DIR, `${coll}.json`);
            try {
                if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {}
            return [];
        }

        if (supabase) {
            try {
                const { data, error } = await supabase.from('users').select('*');
                if (!error) {
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
                        return convertedData.filter(user => Object.keys(query).every(key => user[key] == query[key]));
                    }
                    return convertedData;
                }
            } catch (err) {}
        }
        return readUsersFromFile();
    },

    findOne: async (coll, query = {}) => {
        const results = await storage.find(coll, query);
        return results[0] || null;
    },

    findUser: async (username) => {
        const normalizedUsername = username.trim().toLowerCase();
        if (supabase) {
            try {
                const { data, error } = await supabase.from('users').select('*').ilike('username', normalizedUsername).single();
                if (data) {
                    const user = {
                        id: data.id,
                        username: data.username,
                        password: data.password,
                        role: isAdminUser(data.username) ? 'Admin' : data.role,
                        displayName: data.display_name,
                        currentSession: data.current_session,
                        points: data.points,
                        completedChallenges: data.completed_challenges,
                        completedQuizzes: data.completed_quizzes,
                        quizScores: data.quiz_scores
                    };
                    return user;
                }
            } catch (err) {}
        }
        const users = readUsersFromFile();
        const user = users.find(u => u.username.trim().toLowerCase() === normalizedUsername);
        if (user && isAdminUser(user.username)) user.role = 'Admin';
        return user;
    },

    createUser: async (item) => {
        const hashedPassword = await bcrypt.hash(item.password, 10);
        const newUser = { ...item, password: hashedPassword };

        if (supabase) {
            try {
                const supabaseItem = {
                    username: newUser.username,
                    password: newUser.password,
                    role: newUser.role,
                    display_name: newUser.displayName,
                    current_session: 1,
                    points: 0,
                    completed_challenges: [],
                    completed_quizzes: [],
                    quiz_scores: {}
                };
                const { data, error } = await supabase.from('users').insert([supabaseItem]).select().single();
                if (!error) return { ...data, id: data.id };
            } catch (err) {}
        }
        const users = readUsersFromFile();
        const finalUser = { ...newUser, id: generateId(), currentSession: 1, points: 0, completedChallenges: [], completedQuizzes: [], quizScores: {} };
        users.push(finalUser);
        writeUsersToFile(users);
        return finalUser;
    },

    comparePassword: async (password, hash) => {
        return bcrypt.compare(password, hash);
    },

    atomicUpdate: async (coll, query, updateFn) => {
        const user = await storage.findOne(coll, query);
        if (!user) return null;
        const updatedData = updateFn({ ...user });
        
        if (supabase && coll === 'users') {
            try {
                const supabaseUpdate = {
                    current_session: updatedData.currentSession,
                    points: updatedData.points,
                    completed_challenges: updatedData.completedChallenges,
                    completed_quizzes: updatedData.completedQuizzes,
                    quiz_scores: updatedData.quizScores,
                    display_name: updatedData.displayName,
                    role: updatedData.role
                };
                const { data, error } = await supabase.from('users').update(supabaseUpdate).match({ id: user.id }).select().single();
                if (!error) return updatedData;
                console.error('[SupabaseStorage] Update error:', error);
            } catch (err) {
                console.error('[SupabaseStorage] Update catch error:', err);
            }
        }
        
        const users = readUsersFromFile();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = updatedData;
            writeUsersToFile(users);
        }
        return updatedData;
    },

    deleteOne: async (coll, query) => {
        if (supabase && coll === 'users') {
            try {
                const { error } = await supabase.from('users').delete().match(query);
                if (!error) return true;
                console.error('[SupabaseStorage] Delete error:', error);
            } catch (err) {
                console.error('[SupabaseStorage] Delete catch error:', err);
            }
        }

        const users = readUsersFromFile();
        const initialLen = users.length;
        const filtered = users.filter(u => !Object.keys(query).every(key => u[key] == query[key]));
        if (filtered.length !== initialLen) {
            writeUsersToFile(filtered);
            return true;
        }
        return false;
    },

    isAdminUser
};

module.exports = storage;