/* =====================================================
   HTML Mastery Quiz & Challenge Platform - Frontend Logic
   ===================================================== */

const API_URL = '/api';

let state = {
    screen: 'auth',
    authMode: 'login',
    user: null,
    token: localStorage.getItem('token'),
    sessions: [
        { id: 1, title: 'أساسيات HTML - يوم 1', desc: 'هيكل الصفحة، العناوين، والفقرات', unlocked: true },
        { id: 2, title: 'وسائط وقوائم - يوم 2', desc: 'إضافة التفاعل والوسائط', unlocked: false },
        { id: 3, title: 'جداول وفورم - يوم 3', desc: 'تنظيم البيانات والمحتوى', unlocked: false },
        { id: 4, title: 'Semantic - يوم 4', desc: 'بناء واجهات تفاعلية', unlocked: false },
    ],
    currentChallenge: null,
    builderCode: []
};

// Helper functions to reduce code duplication
function getQuizId(sessionId) {
    return `q_s${sessionId}`;
}

function getChallengeIds(sessionId) {
    return [
        `s${sessionId}c1`,
        `s${sessionId}c2`,
        `s${sessionId}c3`,
        `s${sessionId}c4`
    ];
}

function isQuizCompleted(sessionId) {
    const quizId = getQuizId(sessionId);
    const completedQuizzes = state.user?.completedQuizzes || [];
    return completedQuizzes.includes(quizId);
}

function isSessionFullyCompleted(sessionId) {
    // Check Quiz completion (score >= 50%)
    const quizId = getQuizId(sessionId);
    const completedQuizzes = state.user?.completedQuizzes || [];
    const quizPassed = completedQuizzes.includes(quizId);

    // Check Challenges completion (e.g., s1c1 to s1c4)
    const { isDone: challengesDone } = getChallengeProgress(sessionId);
    
    return quizPassed && challengesDone;
}

function getQuizScore(sessionId) {
    const quizId = getQuizId(sessionId);
    return state.user?.quizScores?.[quizId] || null;
}

function getChallengeProgress(sessionId) {
    const challengeIds = getChallengeIds(sessionId);
    const completedChallenges = state.user?.completedChallenges || [];
    const completeCount = challengeIds.filter(id => completedChallenges.includes(id)).length;
    const isDone = completeCount === 4;
    return { completeCount, isDone, challengeIds };
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved session on page load
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const lastScreen = sessionStorage.getItem('lastScreen');
    
    if (savedToken && savedUser) {
        state.token = savedToken;
        state.user = JSON.parse(savedUser);
        
        // Restore additional state
        const currentSession = localStorage.getItem('currentSession');
        const currentChallengeId = localStorage.getItem('currentChallengeId');
        
        if (currentSession) {
            state.currentSession = parseInt(currentSession);
        }
        if (currentChallengeId) {
            state.currentChallenge = { id: parseInt(currentChallengeId) };
        }
        
        // Restore the last screen if available
        if (lastScreen && lastScreen !== 'auth') {
            // Show the last screen
            showScreen(lastScreen, true, true);
            
            // Handle specific screen restoration
            if (lastScreen === 'dashboard') {
                renderDashboard(false); // Don't switch screen again
            } else if (lastScreen === 'quiz') {
                // Try to restore quiz state
                const savedQuizState = localStorage.getItem('quizState');
                if (savedQuizState) {
                    try {
                        const parsedState = JSON.parse(savedQuizState);
                        quizState = parsedState;
                        renderQuestion();
                        // Restore help buttons state
                        if (quizState.hintUsed || quizState.deleteOptionUsed) {
                            disableHelpButtons(quizState.hintUsed);
                        }
                    } catch (err) {
                        // If parsing fails, go to dashboard
                        showScreen('dashboard', true, true);
                        renderDashboard();
                    }
                } else {
                    // No saved state, go to dashboard
                    showScreen('dashboard', true, true);
                    renderDashboard();
                }
            } else if (lastScreen === 'challenge') {
                // Restore challenge with full state from localStorage
                const savedChallengeState = localStorage.getItem('challengeState');
                if (savedChallengeState) {
                    try {
                        const challengeStateData = JSON.parse(savedChallengeState);
                        console.log('Restoring challenge state:', challengeStateData);
                        
                        // Setup basic state first
                        state.currentChallenge = challengeStateData.data;
                        state.builderCode = challengeStateData.builderCode || [];
                        
                        // Use the setup function directly to avoid reloading everything
                        setupChallengeUI(challengeStateData.data);
                        
                        // Explicitly render editor with restored code
                        renderEditor();
                    } catch (err) {
                        console.error('Failed to restore challenge state:', err);
                        showScreen('dashboard', true, true);
                        renderDashboard();
                    }
                } else {
                    // No saved state, go to dashboard
                    showScreen('dashboard', true, true);
                    renderDashboard();
                }
            } else if (lastScreen === 'category') {
                // Try to restore category
                const currentPageState = restoreCurrentPageState();
                if (currentPageState && currentPageState.screenType === 'category') {
                    showCategories(currentPageState.data.sessionId);
                } else {
                    showScreen('dashboard', true, true);
                    renderDashboard();
                }
            } else if (lastScreen === 'admin') {
                // Restore admin panel if user is admin
                const isAdmin = state.user && (state.user.role === 'Admin' || state.user.role === 'admin');
                console.log('Restoring admin screen, user:', state.user?.username, 'role:', state.user?.role, 'isAdmin:', isAdmin);
                if (isAdmin) {
                    showScreen('admin', true, true);
                    initAdminDashboard();
                } else {
                    console.log('User is not admin, redirecting to dashboard');
                    showScreen('dashboard', true, true);
                    renderDashboard();
                }
            } else {
                // Any other screen, go to dashboard
                showScreen('dashboard', true, true);
                renderDashboard();
            }
        } else {
            // Logged in but no last screen, go to dashboard
            showScreen('dashboard', true, true);
            renderDashboard();
        }

        // Verify token is still valid in background
        fetch(`${API_URL}/progress`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        }).then(res => {
            if (res.ok) {
                return res.json();
            } else {
                // Token invalid, clear saved data and show auth
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.removeItem('lastScreen');
                state.token = null;
                state.user = null;
                throw new Error('Invalid token');
            }
        }).then(userData => {
            // Verify the returned user matches the current user
            if (userData && userData.id && state.user && state.user.id && userData.id !== state.user.id) {
                console.error('User ID mismatch! API returned different user. Keeping original user data.');
                // Don't overwrite user data - keep the original from localStorage
                return;
            }
            
            // Merge fresh data with existing user data to preserve important fields
            const originalUser = { ...state.user };
            state.user = { ...originalUser, ...userData };
            
            // Ensure critical fields are preserved
            if (!state.user.username && originalUser.username) {
                state.user.username = originalUser.username;
            }
            if (!state.user.role && originalUser.role) {
                state.user.role = originalUser.role;
            }
            if (!state.user.id && originalUser.id) {
                state.user.id = originalUser.id;
            }
            
            localStorage.setItem('user', JSON.stringify(state.user));
            
            // Refresh the current screen with fresh data if needed
            if (state.screen === 'dashboard') {
                renderDashboard(false); 
            } else if (state.screen === 'category') {
                showCategories(state.currentSession);
            } else if (state.screen === 'admin' && state.user.role === 'Admin') {
                initAdminDashboard();
            }
        }).catch(err => {
            console.error('Token validation failed:', err);
            // Don't logout if we are just on the wrong screen but token might be fine
            if (state.screen === 'admin' && state.user && state.user.role !== 'Admin') {
                showScreen('dashboard');
                renderDashboard();
            } else {
                resetAuthForm('register');
                showScreen('auth', true, true);
                sessionStorage.removeItem('lastScreen');
            }
        });
    } else {
        // Not logged in, go to registration by default
        resetAuthForm('register');
        showScreen('auth', true, true);
        sessionStorage.removeItem('lastScreen');
    }

    // Quiz Help Buttons Event Listeners - MOVED OUTSIDE initEditorUI
    const quizHintBtn = document.getElementById('btn-quiz-hint');
    const quizDeleteBtn = document.getElementById('btn-delete-option');
    
    if (quizHintBtn) {
        quizHintBtn.onclick = async () => {
            // Check if questions are loaded and we have a current question
            if (!quizState || !quizState.questions || quizState.questions.length === 0) {
                showPopup('خطأ', 'الأسئلة لم يتم تحميلها بعد', 'warning', '⚠️');
                return;
            }
            
            if (quizState.currentIndex >= quizState.questions.length) {
                showPopup('خطأ', 'لا يوجد سؤال حالي', 'warning', '⚠️');
                return;
            }
            
            if (quizState.hintUsed || quizState.deleteOptionUsed) {
                showPopup('تنبيه', 'لقد استخدمت المساعدة بالفعل في هذا السؤال', 'warning', '⚠️');
                return;
            }
            
            // Use consolidated deductPoints
            const hintId = `quiz_${quizState.sessionId}_q${quizState.currentIndex}_hint`;
            const success = await deductPoints(5, 'quiz_hint', hintId);
            if (!success) return;

            quizState.hintUsed = true;
            quizState.hintsUsed = (quizState.hintsUsed || 0) + 1;
            disableHelpButtons(true);
            
            // Save updated quiz state
            localStorage.setItem('quizState', JSON.stringify(quizState));
            
            // Show hint for current question
            const q = quizState.questions[quizState.currentIndex];
            showHint(q);
        };
    }
    
    if (quizDeleteBtn) {
        quizDeleteBtn.onclick = async () => {
            // Check if questions are loaded and we have a current question
            if (!quizState || !quizState.questions || quizState.questions.length === 0) {
                showPopup('خطأ', 'الأسئلة لم يتم تحميلها بعد', 'warning', '⚠️');
                return;
            }
            
            if (quizState.currentIndex >= quizState.questions.length) {
                showPopup('خطأ', 'لا يوجد سؤال حالي', 'warning', '⚠️');
                return;
            }
            
            if (quizState.hintUsed || quizState.deleteOptionUsed) {
                showPopup('تنبيه', 'لقد استخدمت المساعدة بالفعل في هذا السؤال', 'warning', '⚠️');
                return;
            }
            
            // Use consolidated deductPoints
            const hintId = `quiz_${quizState.sessionId}_q${quizState.currentIndex}_delete`;
            const success = await deductPoints(10, 'quiz_delete_option', hintId);
            if (!success) return;

            quizState.deleteOptionUsed = true;
            quizState.deleteOptionsUsed = (quizState.deleteOptionsUsed || 0) + 1;
            disableHelpButtons(false);
            
            // Save updated quiz state
            localStorage.setItem('quizState', JSON.stringify(quizState));
            
            // Strike through one random wrong option
            const q = quizState.questions[quizState.currentIndex];
            
            // Check if distractorToRemove is specified, use it instead of random
            let targetOption;
            if (q.distractorToRemove) {
                targetOption = q.distractorToRemove;
                console.log('Using specified distractor to remove:', targetOption);
            } else {
                // Fallback (though distractorToRemove is defined for all questions)
                targetOption = q.choices[0];
                console.log('Using fallback option to remove:', targetOption);
            }
            
            // Find and strike through the wrong option - try both selectors
            const options = document.querySelectorAll('.option, .option-btn');
            console.log('Found options:', options.length);
            
            let optionDeleted = false;
            options.forEach(option => {
                const optionText = option.querySelector('.option-text')?.textContent || option.textContent;
                console.log('Checking option:', optionText, 'against:', targetOption);
                
                if (optionText === targetOption) {
                    console.log('Found matching option, applying strike-through');
                    option.style.textDecoration = 'line-through';
                    option.style.opacity = '0.5';
                    option.style.pointerEvents = 'none';
                    option.style.position = 'relative';
                    
                    // Add X mark next to the deleted option
                    const xMark = document.createElement('span');
                    xMark.textContent = '❌';
                    xMark.style.cssText = `
                        position: absolute;
                        left: -25px;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 16px;
                        color: #ef4444;
                    `;
                    option.style.paddingLeft = '25px';
                    option.appendChild(xMark);
                    
                    optionDeleted = true;
                }
            });
            
            // If still not found, try to find by button text directly
            if (!optionDeleted) {
                console.log('Option not found with .option-text, trying direct text search');
                const allButtons = document.querySelectorAll('button');
                allButtons.forEach(button => {
                    if (button.textContent.includes(targetOption)) {
                        console.log('Found button with direct text match, applying strike-through');
                        button.style.textDecoration = 'line-through';
                        button.style.opacity = '0.5';
                        button.style.pointerEvents = 'none';
                        button.style.position = 'relative';
                        
                        // Add X mark next to the deleted option
                        const xMark = document.createElement('span');
                        xMark.textContent = '❌';
                        xMark.style.cssText = `
                            position: absolute;
                            left: -25px;
                            top: 50%;
                            transform: translateY(-50%);
                            font-size: 16px;
                            color: #ef4444;
                        `;
                        button.style.paddingLeft = '25px';
                        button.appendChild(xMark);
                        
                        optionDeleted = true;
                    }
                });
            }
            
            console.log('Option deleted successfully:', optionDeleted);
        };
    }

    initAuth();
    initEditorUI();

    // Back Buttons
    const backCategory = document.getElementById('btn-back-category');
    if (backCategory) backCategory.onclick = () => {
        // Clear any saved page state
        localStorage.removeItem('currentPageState');
        sessionStorage.setItem('lastScreen', 'dashboard');
        showScreen('dashboard');
        renderDashboard();
    };

    const backChallenge = document.getElementById('btn-back-challenge');
    if (backChallenge) backChallenge.onclick = () => {
        // Clear any saved page state
        localStorage.removeItem('currentPageState');
        
        // Clear builder code when leaving challenge
        state.builderCode = [];
        localStorage.removeItem('challengeState');
        
        showScreen('category');
    };

    const backAdmin = document.getElementById('btn-admin-logout');
    if (backAdmin) backAdmin.onclick = () => logout();

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.onclick = () => logout();

    // WhatsApp Button Event
    const whatsappBtn = document.getElementById('whatsapp-btn');
    
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            // Open WhatsApp securely via backend
            window.open('/api/contact/whatsapp', '_blank');
        });
    }

    // Quiz Help Buttons Event Listeners
    const hintBtn = document.getElementById('btn-quiz-hint');
    const deleteBtn = document.getElementById('btn-delete-option');
    
    if (hintBtn) {
        hintBtn.onclick = async () => {
            // Check if questions are loaded and we have a current question
            if (!quizState || !quizState.questions || quizState.questions.length === 0) {
                showPopup('خطأ', 'الأسئلة لم يتم تحميلها بعد', 'warning', '⚠️');
                return;
            }
            
            if (quizState.currentIndex >= quizState.questions.length) {
                showPopup('خطأ', 'لا يوجد سؤال حالي', 'warning', '⚠️');
                return;
            }
            
            if (quizState.hintUsed || quizState.deleteOptionUsed) {
                showPopup('تنبيه', 'لقد استخدمت المساعدة بالفعل في هذا السؤال', 'warning', '⚠️');
                return;
            }
            
            quizState.hintUsed = true;
            // Increment hints used counter
            quizState.hintsUsed = (quizState.hintsUsed || 0) + 1;
            disableHelpButtons(true);
            
            // Check if user has points
            const currentPoints = state.user.points || 0;
            if (currentPoints < 5) {
                showPopup('لا توجد نقاط', 'ليس لديك نقاط كافية لاستخدام التلميح (تحتاج 5 نقاط)', 'warning', '⚠️');
                quizState.hintUsed = false; // Reset the flag
                return;
            }
            
            // Deduct 5 points for using hint
            state.user.points = Math.max(0, currentPoints - 5);
            updateAllPointsDisplays();
            
            // Save updated quiz state
            localStorage.setItem('quizState', JSON.stringify(quizState));
            
            // Show hint for current question
            const q = quizState.questions[quizState.currentIndex];
            showHint(q);
        };
    }
    
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            // Check if questions are loaded and we have a current question
            if (!quizState || !quizState.questions || quizState.questions.length === 0) {
                showPopup('خطأ', 'الأسئلة لم يتم تحميلها بعد', 'warning', '⚠️');
                return;
            }
            
            if (quizState.currentIndex >= quizState.questions.length) {
                showPopup('خطأ', 'لا يوجد سؤال حالي', 'warning', '⚠️');
                return;
            }
            
            if (quizState.hintUsed || quizState.deleteOptionUsed) {
                showPopup('تنبيه', 'لقد استخدمت المساعدة بالفعل في هذا السؤال', 'warning', '⚠️');
                return;
            }
            
            quizState.deleteOptionUsed = true;
            // Increment delete options used counter
            quizState.deleteOptionsUsed = (quizState.deleteOptionsUsed || 0) + 1;
            disableHelpButtons(false);
            
            // Check if user has points
            const currentPoints = state.user.points || 0;
            if (currentPoints < 10) {
                showPopup('لا توجد نقاط', 'ليس لديك نقاط كافية لاستخدام خيار الحذف (تحتاج 10 نقاط)', 'warning', '⚠️');
                quizState.deleteOptionUsed = false; // Reset the flag
                return;
            }
            
            // Deduct 10 points for using delete option
            state.user.points = Math.max(0, currentPoints - 10);
            updateAllPointsDisplays();
            
            // Save updated quiz state
            localStorage.setItem('quizState', JSON.stringify(quizState));
            
            // Strike through one random wrong option
            const q = quizState.questions[quizState.currentIndex];
            
            // Check if distractorToRemove is specified, use it instead of random
            let targetOption;
            if (q.distractorToRemove) {
                targetOption = q.distractorToRemove;
                console.log('Using specified distractor to remove:', targetOption);
            } else {
                targetOption = q.choices[0]; // Fallback
                console.log('Using fallback option to remove:', targetOption);
            }
            
            // Find and strike through the wrong option - try both selectors
            const options = document.querySelectorAll('.option, .option-btn');
            console.log('Found options:', options.length);
            
            let optionDeleted = false;
            options.forEach(option => {
                const optionText = option.querySelector('.option-text')?.textContent || option.textContent;
                console.log('Checking option:', optionText, 'against:', targetOption);
                
                if (optionText === targetOption) {
                    console.log('Found matching option, applying strike-through');
                    option.style.textDecoration = 'line-through';
                    option.style.opacity = '0.5';
                    option.style.pointerEvents = 'none';
                    option.style.position = 'relative';
                    
                    // Add X mark next to the deleted option
                    const xMark = document.createElement('span');
                    xMark.textContent = '❌';
                    xMark.style.cssText = `
                        position: absolute;
                        left: -25px;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 16px;
                        color: #ef4444;
                    `;
                    option.style.paddingLeft = '25px';
                    option.appendChild(xMark);
                    
                    optionDeleted = true;
                }
            });
            
            // If still not found, try to find by button text directly
            if (!optionDeleted) {
                console.log('Option not found with .option-text, trying direct text search');
                const allButtons = document.querySelectorAll('button');
                allButtons.forEach(button => {
                    if (button.textContent.includes(targetOption)) {
                        console.log('Found button with direct text match, applying strike-through');
                        button.style.textDecoration = 'line-through';
                        button.style.opacity = '0.5';
                        button.style.pointerEvents = 'none';
                        button.style.position = 'relative';
                        
                        // Add X mark next to the deleted option
                        const xMark = document.createElement('span');
                        xMark.textContent = '❌';
                        xMark.style.cssText = `
                            position: absolute;
                            left: -25px;
                            top: 50%;
                            transform: translateY(-50%);
                            font-size: 16px;
                            color: #ef4444;
                        `;
                        button.style.paddingLeft = '25px';
                        button.appendChild(xMark);
                        
                        optionDeleted = true;
                    }
                });
            }
        };
    }
});

// --- Screen Management ---


function showScreen(screenId, addHistory = true, isInitialLoad = false) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screenEl = document.getElementById(`screen-${screenId}`);
    if (screenEl) {
        screenEl.classList.add('active');
        screenEl.classList.add('animate-fadeIn');
        state.screen = screenId;

        // Manage browser history state so back/forward works
        // Use replaceState on initial load to avoid history trap
        if (addHistory) {
            const stateObj = { screenId };
            try {
                if (isInitialLoad) {
                    window.history.replaceState(stateObj, '', `#${screenId}`);
                } else {
                    window.history.pushState(stateObj, '', `#${screenId}`);
                }
            } catch (err) {
                console.warn('History state update failed', err);
            }
        }

        // Control WhatsApp button visibility
        const whatsappFloat = document.querySelector('.whatsapp-float');
        if (whatsappFloat) {
            if (screenId === 'dashboard') {
                whatsappFloat.classList.add('visible');
            } else {
                whatsappFloat.classList.remove('visible');
            }
        }
        
        // Save current screen to sessionStorage (persists until tab is closed)
        sessionStorage.setItem('lastScreen', screenId);
        
        // Also save to localStorage for backup (persists across browser restarts)
        localStorage.setItem('lastScreen', screenId);
        
        // Save additional state based on current screen
        if (state.currentSession) {
            localStorage.setItem('currentSession', state.currentSession);
        }
        if (state.currentChallenge) {
            localStorage.setItem('currentChallengeId', state.currentChallenge.id);
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            screenEl.classList.remove('animate-fadeIn');
        }, 600);
    }
}

// Handle browser back/forward buttons with SPA navigation
window.addEventListener('popstate', (event) => {
    const screenId = (event.state && event.state.screenId) || window.location.hash.replace('#', '') || 'dashboard';
    showScreen(screenId, false);
});

// Ensure initial history state is set correctly
window.addEventListener('load', () => {
    const initialScreen = window.location.hash.replace('#', '') || sessionStorage.getItem('lastScreen') || 'dashboard';
    window.history.replaceState({ screenId: initialScreen }, '', `#${initialScreen}`);
    showScreen(initialScreen, false, true);
});

// --- Navigation ---
// Removed this function as it's replaced with the above Screen Management function

// --- Enhanced Auth Logic with Simple Characters ---
// --- Authentication Helpers ---

function resetAuthForm(mode = 'register') {
    const fullNameInput = document.getElementById('fullName');
    const passwordInput = document.getElementById('password');
    const authError = document.getElementById('auth-error');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const btnAuth = document.getElementById('btn-auth');
    const nameLabel = document.querySelector('label[for="fullName"]');

    if (fullNameInput) fullNameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (authError) authError.classList.add('hidden');

    state.authMode = mode;

    if (mode === 'register') {
        if (tabRegister) tabRegister.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
        if (btnAuth) btnAuth.textContent = 'إنشاء حساب جديد';
        if (nameLabel) nameLabel.textContent = 'الاسم بالكامل (ثنائي على الأقل)';
        if (fullNameInput) fullNameInput.required = true;
    } else {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (btnAuth) btnAuth.textContent = 'تسجيل الدخول';
        if (nameLabel) nameLabel.textContent = 'اسم المستخدم (الاسم بالكامل)';
    }
}

function initAuth() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const authForm = document.getElementById('auth-form');
    const btnAuth = document.getElementById('btn-auth');
    const fullNameInput = document.getElementById('fullName');
    const passwordInput = document.getElementById('password');
    const characters = document.querySelectorAll('.character');
    
    // Character animation state (handled by eye-tracking.js now)
    characters.forEach((char, index) => {
        char.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s both`;
    });
    
    // Character states
    function setCharacterState(state) {
        characters.forEach(char => {
            char.classList.remove('watching', 'spinning', 'reaching');
            if (state) char.classList.add(state);
        });
    }
    
    // Full name focus - eyes reach forward
    fullNameInput?.addEventListener('focus', () => {
        setCharacterState('reaching');
    });
    
    fullNameInput?.addEventListener('blur', () => {
        setCharacterState('');
    });
    
    fullNameInput?.addEventListener('input', () => {
        setCharacterState('reaching');
    });
    
    // Password focus - eyes spin
    passwordInput?.addEventListener('focus', () => {
        setCharacterState('spinning');
    });
    
    passwordInput?.addEventListener('blur', () => {
        setCharacterState('');
    });

    tabLogin.addEventListener('click', () => {
        if (state.authMode === 'login') return;
        state.authMode = 'login';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        btnAuth.textContent = 'تسجيل الدخول';
        
        // Dynamic field transition
        const nameLabel = document.querySelector('label[for="fullName"]');
        if (nameLabel) nameLabel.textContent = 'اسم المستخدم (الاسم بالكامل)';
        
        // Add animation to form
        authForm.classList.add('animate-scaleIn');
        setTimeout(() => authForm.classList.remove('animate-scaleIn'), 500);
        
        document.getElementById('fullName').required = true;
        document.getElementById('auth-error').classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        if (state.authMode === 'register') return;
        state.authMode = 'register';
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        btnAuth.textContent = 'إنشاء حساب جديد';
        
        const nameLabel = document.querySelector('label[for="fullName"]');
        if (nameLabel) nameLabel.textContent = 'الاسم بالكامل (ثنائي على الأقل)';

        authForm.classList.add('animate-scaleIn');
        setTimeout(() => authForm.classList.remove('animate-scaleIn'), 500);
        
        document.getElementById('fullName').required = true;
        document.getElementById('auth-error').classList.add('hidden');
    });

    let isSubmitting = false;
    let lastSubmissionTime = 0;
    const SUBMISSION_COOLDOWN = 3000; // 3 seconds cooldown
    
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Prevent duplicate submissions with cooldown
        const now = Date.now();
        if (isSubmitting || (now - lastSubmissionTime) < SUBMISSION_COOLDOWN) {
            return;
        }
        
        isSubmitting = true;
        lastSubmissionTime = now;
        
        // Disable button and show loading state
        const btnAuth = document.getElementById('btn-auth');
        const originalBtnText = btnAuth.textContent;
        btnAuth.disabled = true;
        btnAuth.innerHTML = '<span class="animate-pulse">⏳ جاري التحقق...</span>';
        
        const fullName = document.getElementById('fullName').value.trim();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('auth-error');
        
        // Validation for registration
        if (state.authMode === 'register') {
            const nameParts = fullName.split(/\s+/).filter(p => p.length >= 2);
            
            // Check for at least 2 name parts
            if (nameParts.length < 2) {
                errorEl.innerHTML = '⚠️ يرجى إدخال <b>الاسم الأول والثاني</b> بشكل صحيح';
                errorEl.classList.remove('hidden');
                errorEl.classList.add('animate-shake');
                setTimeout(() => errorEl.classList.remove('animate-shake'), 500);
                
                isSubmitting = false;
                btnAuth.disabled = false;
                btnAuth.textContent = originalBtnText;
                return;
            }
        }
        
        const username = fullName;
        const route = state.authMode === 'login' ? '/auth/login' : '/auth/register';

        try {
            const res = await fetch(`${API_URL}${route}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                state.token = data.token;
                state.user = data.user;
                
                // Save session to localStorage
                localStorage.setItem('token', state.token);
                localStorage.setItem('user', JSON.stringify(state.user));
                
                // Success animation
                btnAuth.innerHTML = '✅ تم بنجاح!';
                btnAuth.classList.add('animate-fadeIn');
                btnAuth.style.background = '#10b981';
                
                setTimeout(() => {
                    renderDashboard();
                }, 800);
            } else {
                showAuthError(data.message || '⚠️ فشل في إكمال العملية، تأكد من البيانات');
                btnAuth.disabled = false;
                btnAuth.textContent = originalBtnText;
            }
        } catch (err) {
            showAuthError('❌ تعذر الاتصال بالخادم، حاول لاحقاً');
            btnAuth.disabled = false;
            btnAuth.textContent = originalBtnText;
        } finally {
            isSubmitting = false;
        }
    });
}

function showAuthError(msg) {
    const err = document.getElementById('auth-error');
    err.textContent = msg;
    err.classList.remove('hidden');
    err.classList.add('animate-shake');
    setTimeout(() => err.classList.remove('animate-shake'), 500);
}

// --- Dashboard Logic ---
async function fetchUserProgress() {
    try {
        const res = await fetch(`${API_URL}/progress`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const data = await res.json();
        if (res.ok) {
            state.user = data;
            renderDashboard(false); // Only prepare data, don't switch screen yet
            return data;
        } else {
            console.error('[Auth] Progress fetch failed, clearing session.');
            localStorage.removeItem('token');
            state.token = null;
            showScreen('auth');
        }
    } catch (err) {
        showScreen('auth');
    }
}

// Update points displays across the app
function updateAllPointsDisplays() {
    const points = state.user?.points || 0;
    
    // Save points to localStorage for persistence
    localStorage.setItem('userPoints', points);
    
    // Update navigation points
    const navPoints = document.getElementById('user-points');
    if (navPoints) {
        navPoints.textContent = points;
        // Add highlight effect
        navPoints.style.color = '#10b981';
        setTimeout(() => {
            navPoints.style.color = '';
        }, 1000);
    }
    
    // Update dashboard points bubble if it exists
    updatePointsUI();
}

// تحسين صياغة السؤال تلقائياً عند العرض
function polishQuestionText(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    let text = raw.trim();

    // Escape and wrap anything that looks like a HTML tag in <code> blocks for better styling
    // This handles both pre-escaped and non-escaped tags
    text = text.replace(/<([a-zA-Z0-9]+)>/g, '&lt;$1&gt;');
    text = text.replace(/(&lt;[a-zA-Z0-9!-/]+&gt;)/g, '<code class="tag-code">$1</code>');

    // أزل المسافات الزائدة
    text = text.replace(/\s+/g, ' ');

    // ضع علامة استفهام عربية بالنهاية إن لم توجد
    if (!/[؟?]$/.test(text)) {
        text = text + '؟';
    }

    // اجعل أول حرف كبير إذا كان لاتينًا (لا ينطبق على العلامات العربية)
    text = text.replace(/^([a-z])/, (m) => m.toUpperCase());

    return text;
}

// إصلاح للكود بأقوى منطق ممكن حتى لو كان به أخطاء ترتيبية
function enhanceAutoFixCode(code) {
    let fixed = code;

    // قاعدة بيانات أخطاء إملائية شائعة وأسماء وسوم
    const commonMistakes = {
        'titel': 'title', 'titl': 'title', 'boddy': 'body', 'hml': 'html', 'htm': 'html',
        'headd': 'head', 'parapraph': 'paragraph', 'pargraph': 'p', 'brk': 'br', 'spna': 'span',
        'dvi': 'div', 'buton': 'button', 'inpt': 'input', 'scr': 'src', 'altt': 'alt',
        'herf': 'href', 'formm': 'form', 'imge': 'img'
    };

    for (let mistake in commonMistakes) {
        const regex = new RegExp(`<${mistake}([>\\s/])`, 'gi');
        fixed = fixed.replace(regex, `<${commonMistakes[mistake]}$1`);
        const closeRegex = new RegExp(`</${mistake}>`, 'gi');
        fixed = fixed.replace(closeRegex, `</${commonMistakes[mistake]}>`);
    }

    // أضف DOCTYPE و html/head/body إذا مفقود
    if (!/<!doctype\s+html>/i.test(fixed)) {
        fixed = '<!DOCTYPE html>\n' + fixed;
    }
    if (!/<html[^>]*>/i.test(fixed)) {
        fixed = fixed.replace(/<\s*head/i, '<html>\n<head');
        if (!/<head[^>]*>/i.test(fixed)) {
            fixed = fixed.replace(/<\s*body/i, '<html>\n<head>\n<title>عنوان الصفحة</title>\n</head>\n<body');
        }
    }
    if (!/<head[^>]*>/i.test(fixed)) {
        fixed = fixed.replace(/<\s*html[^>]*>/i, match => `${match}\n<head>\n<title>عنوان الصفحة</title>\n</head>`);
    }
    if (!/<body[^>]*>/i.test(fixed)) {
        fixed = fixed.replace(/<\/head>/i, '</head>\n<body>');
    }

    // اصنع حالة توازن وسوم مع مكدس
    const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    const tagRegex = /<\/?\s*([a-zA-Z0-9]+)([^>]*)>/g;
    let match;
    const stack = [];
    while ((match = tagRegex.exec(fixed)) !== null) {
        const full = match[0];
        const tagName = match[1].toLowerCase();
        const isClosing = /^<\s*\//.test(full);
        const isSelfClosing = selfClosingTags.includes(tagName) || /\/>\s*$/.test(full);

        if (isClosing) {
            if (stack.length && stack[stack.length - 1] === tagName) {
                stack.pop();
            } else {
                const idx = stack.lastIndexOf(tagName);
                if (idx !== -1) {
                    stack.splice(idx);
                }
            }
        } else if (!isSelfClosing) {
            // الذي تكون الخاصية disabled أو مختصر link
            stack.push(tagName);
        }
    }
    while (stack.length > 0) {
        const tag = stack.pop();
        if (!selfClosingTags.includes(tag)) {
            fixed += `</${tag}>`;
        }
    }

    // تنظيف المسافات والأسطر المكررة
    fixed = fixed.replace(/\n\s*\n+/g, '\n').trim();

    return fixed;
}

async function deductPoints(amount, action, hintId = null) {
    if (!state.user) return false;

    // Check if hint/action already unlocked
    if (hintId && state.user.unlockedHints && state.user.unlockedHints.includes(hintId)) {
        console.log(`Action ${hintId} already unlocked`);
        return true;
    }

    const currentPoints = state.user.points || 0;
    if (currentPoints < amount) {
        showFeedback(t('not_enough_points'), 'warning');
        return false;
    }

    const newPoints = currentPoints - amount;
    state.user.points = newPoints;
    
    // Add to unlocked hints if hintId provided
    if (hintId) {
        if (!state.user.unlockedHints) state.user.unlockedHints = [];
        if (!state.user.unlockedHints.includes(hintId)) {
            state.user.unlockedHints.push(hintId);
        }
    }

    updateAllPointsDisplays();
    localStorage.setItem('user', JSON.stringify(state.user));

    try {
        const res = await fetch(`${API_URL}/progress/points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ 
                points: newPoints, 
                action,
                unlockedHints: state.user.unlockedHints
            })
        });
        return res.ok;
    } catch (err) {
        console.error('Error deducting points:', err);
        return false;
    }
}

async function addPoints(amount, action) {
    if (!state.user) return;
    state.user.points = (state.user.points || 0) + amount;
    updateAllPointsDisplays();
    localStorage.setItem('user', JSON.stringify(state.user));

    try {
        await fetch(`${API_URL}/progress/points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ points: state.user.points, action })
        });
    } catch (err) {
        console.error('Error adding points:', err);
    }
}

function renderDashboard(switchScreen = true) {
    if (!state.user) return;
    console.log('[Dashboard] Rendering for user:', state.user.username);
    if (switchScreen) showScreen('dashboard');
    document.getElementById('user-display').textContent = state.user.username;

    const adminNavBtn = document.getElementById('btn-admin-nav');
    if (adminNavBtn) {
        if (state.user.username === 'yahia') {
            adminNavBtn.classList.remove('hidden');
            adminNavBtn.onclick = () => {
                initAdminDashboard();
            };
        } else {
            adminNavBtn.classList.add('hidden');
        }
    }

    // Update navigation points
    updateAllPointsDisplays();

    const ptsDisplay = document.getElementById('user-points-display');
    if (state.user.username === 'yahia') {
        if (ptsDisplay) ptsDisplay.style.display = 'none';
    } else {
        if (ptsDisplay) ptsDisplay.style.display = 'inline-block';
    }

    // Load sessions data (using fallback since API doesn't exist)
    state.sessions = [
        { id: 1, title: 'أساسيات HTML - يوم 1', desc: 'هيكل الصفحة، العناوين، والفقرات' },
        { id: 2, title: 'وسائط وقوائم - يوم 2', desc: 'إضافة التفاعل والوسائط' },
        { id: 3, title: 'جداول وفورم - يوم 3', desc: 'تنظيم البيانات وجمع المدخلات' },
        { id: 4, title: 'Semantic - يوم 4', desc: 'تصميم متجاوب وتخطيط دلالي' }
    ];

    const grid = document.querySelector('.sessions-grid');
    if (!grid) return;
    grid.innerHTML = '';

    state.sessions.forEach(session => {
        const userCurrentSession = state.user.currentSession || 1;
        const isUnlocked = session.id <= userCurrentSession;
        const quizId = `q_s${session.id}`;

        // تحديات الجلسة الأربعة: s1c1, s1c2, s1c3, s1c4 إلخ
        const allChallengeIds = [
            `s${session.id}c1`,
            `s${session.id}c2`,
            `s${session.id}c3`,
            `s${session.id}c4`
        ];

        const completedQuizzes = state.user.completedQuizzes || [];
        const isCompleted = completedQuizzes.includes(quizId);
        const quizScore = state.user.quizScores ? state.user.quizScores[quizId] : null;

        // تحقق من اكتمال الجلسة بالكامل (اختبار + تحديات)
        const sessionFullyDone = isSessionFullyCompleted(session.id);
        const { completeCount, isDone: challengeDone } = getChallengeProgress(session.id);
        const challengeProgressText = `${completeCount}/4`;

        const card = document.createElement('div');
        card.className = `session-card ${isUnlocked ? '' : 'locked'} ${sessionFullyDone ? 'completed' : ''}`;
        card.style.animationDelay = `${session.id * 0.1}s`;

        let statusHtml = isUnlocked ? 'مفتوحة' : '🔒 مقفولة';
        if (sessionFullyDone) {
            statusHtml = `<div class="completion-badge">✅ مكتمل بالكامل</div>`;
        }

        const quizScoreDisplay = (quizScore !== null && quizScore !== undefined) ? `${quizScore}%` : '---';

        card.innerHTML = `
            <div class="session-info">
                <h3>المرحلة ${session.id}: ${session.title}</h3>
                <p>${session.desc}</p>
                <div class="session-progress-markers">
                    <div class="marker-group">
                        <span class="marker-label">⭐ النتيجة في النظري</span>
                        <span class="marker-val ${quizScore >= 50 ? 'passed' : (quizScore !== null ? 'failed' : '')}">
                            ${quizScoreDisplay}
                        </span>
                    </div>
                    <div class="marker-group">
                        <span class="marker-label">🛠️ التحدي العملي</span>
                        <span class="marker-val ${challengeDone ? 'passed' : ''}">
                            ${challengeDone ? '✅ مكتمل' : `${completeCount > 0 ? '⏳ ' + challengeProgressText : 'قيد الانتظار'}`}
                        </span>
                    </div>
                </div>
            </div>
            <div class="session-status">
                ${statusHtml}
                ${(!isUnlocked && session.id > 1) ? `<div class="lock-reason">أكمل المرحلة ${session.id - 1} أولاً</div>` : ''}
            </div>
        `;
        
        if (isUnlocked || isCompleted) {
            card.onclick = () => startSession(session.id);
        } else {
            card.onclick = () => showPopup('مقفول', `🔒 عذراً، يجب عليك إكمال المرحلة ${Math.max(0, session.id - 1)} أولاً.`, 'warning', '🔒');
        }
        grid.appendChild(card);
    });
}

let challengeState = {
    startTime: null,
    hintUsed: false,
    multipleChoiceUsed: false,
    timeBonus: false
};

// Prevent duplicate tag insertion from overlapping events
let builderDropState = {
    lastPayload: null,
    lastIndex: null,
    lastTime: 0
};

function insertDroppedItems(newItems, insertIndex = null) {
    const now = Date.now();
    const payloadKey = JSON.stringify({ newItems, insertIndex });

    // Ignore repeated insertion within 300ms for identical payload
    if (builderDropState.lastPayload === payloadKey && now - builderDropState.lastTime < 300) {
        return false;
    }

    builderDropState.lastPayload = payloadKey;
    builderDropState.lastIndex = insertIndex;
    builderDropState.lastTime = now;

    if (insertIndex === null) {
        state.builderCode.push(...newItems);
    } else {
        state.builderCode.splice(insertIndex, 0, ...newItems);
    }

    renderEditor();
    updatePreview();
    saveBuilderCode();

    return true;
}

// --- Quiz System ---
let quizState = {
    questions: [],
    currentIndex: 0,
    userAnswers: [], // Store { questionIndex, selectedAnswer, isCorrect }
    score: 0,
    timer: null,
    timeLeft: 30,
    startTime: null,
    sessionId: null,
    hintUsed: false,
    deleteOptionUsed: false,
    deletedOptions: [] // Track deleted options for each question
};


function renderQuestion() {
    // Clean up any leftover header elements
    const quizHeader = document.querySelector('.quiz-header');
    if (quizHeader) {
        quizHeader.remove();
    }
    const categoryBadge = document.getElementById('category-badge');
    if (categoryBadge) {
        categoryBadge.remove();
    }
    
    const q = quizState.questions[quizState.currentIndex];

    // Update labels
    document.getElementById('q-current').textContent = quizState.currentIndex + 1;
    document.getElementById('q-total').textContent = quizState.questions.length;
    // Display question text with improved phrasing
    document.getElementById('question-text').innerHTML = polishQuestionText(q.question);

    // Progress Bar
    const progressPct = ((quizState.currentIndex + 1) / quizState.questions.length) * 100;
    document.getElementById('progress-pct').textContent = `${Math.round(progressPct)}%`;
    
    // Update progress fill bar
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progressPct}%`;
    }
    
    // Check if hint or delete help was purchased for this question and restore it
    const hintId = `quiz_${quizState.sessionId}_q${quizState.currentIndex}_hint`;
    const deleteId = `quiz_${quizState.sessionId}_q${quizState.currentIndex}_delete`;
    
    const isHintUnlocked = state.user.unlockedHints && state.user.unlockedHints.includes(hintId);
    const isDeleteUnlocked = state.user.unlockedHints && state.user.unlockedHints.includes(deleteId);
    
    if (isHintUnlocked) {
        quizState.hintUsed = true;
        // The display will be handled by showHint below current code or after options render
    }
    if (isDeleteUnlocked) {
        quizState.deleteOptionUsed = true;
    }
    
    // Disable buttons if any help was used
    if (quizState.hintUsed || quizState.deleteOptionUsed) {
        disableHelpButtons(quizState.hintUsed);
    }
    
    // Render options
    const optionsGrid = document.getElementById('options-grid');
    optionsGrid.innerHTML = '';
    
    const questionOptions = (q.options || q.choices || []).map(opt => polishQuestionText(opt || '').replace(/[؟?]$/,'')).map(opt => opt.trim());
    
    // Determine which options to hide if delete help was used
    let hiddenIndices = [];
    if (quizState.deleteOptionUsed) {
        // Instead of filtering by correctAnswer, we hide the single distractorToRemove
        // to match the main deleteOption logic
        if (q.distractorToRemove) {
            const distractorIndex = questionOptions.indexOf(q.distractorToRemove);
            if (distractorIndex !== -1) {
                hiddenIndices = [distractorIndex];
            }
        }
    }

    const questionOptionsRaw = (q.options || q.choices || []);
    
    if (questionOptionsRaw && Array.isArray(questionOptionsRaw)) {
        questionOptionsRaw.forEach((optRaw, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            
            if (hiddenIndices.includes(i)) {
                btn.style.display = 'none';
            }

            // Polish the text for display, but keep the raw for the data attribute
            const polishedOpt = polishQuestionText(optRaw || '');
            const finalDisplay = polishedOpt.replace(/[؟?]$/,'').trim();

            btn.setAttribute('data-raw-answer', optRaw.trim());
            btn.innerHTML = `
                <div class="option-letter">${String.fromCharCode(65 + i)}</div>
                <span class="option-text">${finalDisplay}</span>
                <div class="option-icon"></div>
            `;
            btn.onclick = () => selectOption(i, btn);
            
            // Restore selected choice if available from previous state (e.g., refresh)
            if (quizState.selectedChoice === i) {
                btn.classList.add('selected');
                document.getElementById('btn-confirm').disabled = false;
            }
            
            optionsGrid.appendChild(btn);
        });
        
        // Explicitly show hint if unlocked
        if (isHintUnlocked) {
            showHint(q);
        }
    } else {
        console.error('No options found for question:', q);
        console.error('Question data:', JSON.stringify(q, null, 2));
        optionsGrid.innerHTML = '<p style="color: red;">لا توجد خيارات متاحة لهذا السؤال</p>';
    }

    // Start timer for this question
    startTimer();

    // Reset explanation and action buttons
    document.getElementById('explanation-box').classList.add('hidden');
    document.getElementById('btn-confirm').classList.remove('hidden');
    // Reset confirm button text and class using locale
    const confirmBtn = document.getElementById('btn-confirm');
    confirmBtn.textContent = t('btn_confirm');
    confirmBtn.className = 'btn btn-blue';
    confirmBtn.disabled = true;
    confirmBtn.onclick = handleConfirmClick;
}

// Separate function for confirm button handler
async function handleConfirmClick() {
    console.log('Confirm button clicked');
    
    const selected = document.querySelector('.option-btn.selected');
    if (!selected) {
        console.log('No option selected - returning');
        return;
    }

    console.log('Option selected, processing answer');

    const q = quizState.questions[quizState.currentIndex];
    if (!q) {
        console.log('No question found - returning');
        return;
    }

    const confirmBtn = document.getElementById('btn-confirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'جاري التحقق...';

    const userAnswer = selected.getAttribute('data-raw-answer') || selected.querySelector('.option-text').textContent;
    
    let isCorrect = false;
    let correctAnswer = "";
    let explanation = "";

    try {
        const response = await fetch(`${API_URL}/quiz/check-question`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ 
                sessionId: quizState.sessionId,
                questionIndex: quizState.currentIndex,
                answer: userAnswer 
            })
        });

        const data = await response.json();
        isCorrect = data.isCorrect;
        correctAnswer = data.correctAnswer;
        explanation = data.explanation;
    } catch (error) {
        console.error('Validation error:', error);
        showPopup('خطأ الخادم', 'تعذر التحقق من الإجابة', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = t('btn_confirm');
        return;
    }

    console.log('Answer:', userAnswer, 'Correct:', correctAnswer, 'IsCorrect:', isCorrect);

    // Calculate time bonus
    const timeSpent = quizState.startTime ? (Date.now() - quizState.startTime) / 1000 : 0;
    const hasTimeBonus = timeSpent <= 120 && isCorrect; // Less than 2 minutes

    // Add to user answers
    quizState.userAnswers.push({
        questionIndex: quizState.currentIndex,
        selected: userAnswer,
        isCorrect: isCorrect,
        correct: correctAnswer,
        timeBonus: hasTimeBonus,
        timeSpent: timeSpent
    });

    // Update score immediately if correct
    // UI feedback for correct answer
    if (isCorrect) {
        quizState.score++;
        
        // Show points animation purely as visual feedback
        const pointsBubble = document.getElementById('user-points-display');
        if (pointsBubble) {
            pointsBubble.style.animation = 'pointsBubbleGlow 1s ease-in-out';
            setTimeout(() => {
                pointsBubble.style.animation = 'none';
            }, 1000);
        }
        
        console.log(`Question answered correctly. Current score: ${quizState.score}`);
    }

    // Show explanation for ALL answers (correct and wrong)
    const explanationBox = document.getElementById('explanation-box');
    if (explanationBox) {
        explanationBox.classList.remove('hidden');
        // Set class based on correct/wrong
        explanationBox.className = isCorrect ? 'explanation-box correct-box' : 'explanation-box wrong-box';
        
        const explanationText = document.getElementById('explanation-text');
        if (explanationText) {
            if (isCorrect) {
                explanationText.innerHTML = `<strong>✅ إجابة صحيحة!</strong><br><br>${explanation}`;
            } else {
                explanationText.innerHTML = `<strong>❌ إجابة خاطئة!</strong><br>الإجابة الصحيحة: <strong>${correctAnswer}</strong><br><br>${explanation}`;
            }
        }
    }

    // Mark correct/wrong
    selected.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
        // Highlight correct answer
        document.querySelectorAll('.option-btn').forEach(btn => {
            const rawAns = btn.getAttribute('data-raw-answer');
            if (rawAns === correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    // Disable all options
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
    
    // Transform confirm button to next button
    if (confirmBtn) {
        console.log('Current index:', quizState.currentIndex, 'Total questions:', quizState.questions.length);
        
        if (quizState.currentIndex < quizState.questions.length - 1) {
            // Change confirm button to next button
            console.log('Changing to next button');
            confirmBtn.textContent = t('btn_next_q');
            confirmBtn.className = 'btn btn-indigo';
            confirmBtn.disabled = false;
            
            // Set new onclick for next button
            confirmBtn.onclick = async function() {
                console.log('Next button clicked - moving to next question');
                
                // Remove hint when moving to next question
                const nextHint = document.querySelector('.hint-text');
                if (nextHint) {
                    console.log('Removing hint before moving to next question');
                    nextHint.remove();
                }
                
                // Only add time bonus for correct answers AND only if quiz not already completed
                if (isCorrect && !quizState.isAlreadyCompleted) {
                    const timeSpent = quizState.startTime ? (Date.now() - quizState.startTime) / 1000 : 0;
                    const hasTimeBonus = timeSpent <= 120; // Less than 2 minutes
                    
                    if (hasTimeBonus && !quizState.timeBonusGiven) {
                        quizState.timeBonusGiven = true;
                        
                        // Add small visual indicator instead of points
                        const explanationBox = document.getElementById('explanation-box');
                        if (explanationBox) {
                            explanationBox.classList.remove('hidden');
                            explanationBox.className = 'explanation-box correct-box has-bonus';
                        }
                        
                        console.log('Speed bonus marked for final calculation');
                    }
                } else if (!isCorrect) {
                    console.log('No bonus for wrong answer');
                } else {
                    console.log('Quiz already completed - no bonus for retry');
                }
                
                // Move to next question
                quizState.currentIndex++;
                
                // Save updated quiz state
                localStorage.setItem('quizState', JSON.stringify(quizState));
                
                if (quizState.currentIndex < quizState.questions.length) {
                    console.log('Rendering next question');
                    
                    // Remove any existing hint before loading next question
                    const currentHint = document.querySelector('.hint-text');
                    if (currentHint) {
                        console.log('Removing existing hint before loading next question');
                        currentHint.remove();
                    }
                    
                    // Clear saved hint if moving to different question
                    const savedHintIndex = localStorage.getItem('hintQuestionIndex');
                    if (savedHintIndex !== (quizState.currentIndex + 1).toString()) {
                        localStorage.removeItem('currentHint');
                        localStorage.removeItem('hintQuestionIndex');
                    }
                    
                    // Reset help options for new question (renew every question)
                    quizState.hintUsed = false;
                    quizState.deleteOptionUsed = false;
                    quizState.timeBonusGiven = false;
                    quizState.selectedChoice = null; // Reset selected choice for next question
                    
                    // Reset help buttons
                    const hintBtn = document.getElementById('btn-quiz-hint');
                    if (hintBtn) {
                        hintBtn.textContent = '💡 تلميح (-5 نقاط)';
                        hintBtn.disabled = false;
                        hintBtn.style.opacity = '1';
                        hintBtn.style.cursor = 'pointer';
                    }
                    const deleteBtn = document.getElementById('btn-delete-option');
                    if (deleteBtn) {
                        deleteBtn.textContent = '❌ حذف خيار (-10 نقاط)';
                        deleteBtn.disabled = false;
                        deleteBtn.style.opacity = '1';
                        deleteBtn.style.cursor = 'pointer';
                    }
                    
                    // Clear hint text if exists
                    const existingHint = document.getElementById('quiz-hint-text');
                    if (existingHint) {
                        existingHint.remove();
                    }
                    
                    // Render next question
                    renderQuestion();
                } else {
                    console.log('No more questions - showing results');
                    showResults();
                }
            };
        } else {
            // Change to finish button for last question
            console.log('Changing to finish button');
            confirmBtn.textContent = t('btn_finish_quiz');
            confirmBtn.className = 'btn btn-green';
            confirmBtn.disabled = false;
            
            confirmBtn.onclick = function() {
                console.log('Finish button clicked - showing results');
                showResults();
            };
        }
    }
}

function startTimer() {
    // Clear any existing timer
    if (quizState.timer) {
        clearInterval(quizState.timer);
    }
    
    // Reset timer
    quizState.timeLeft = 30;
    quizState.startTime = Date.now();
    
    // Update timer display
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.textContent = quizState.timeLeft;
    }
    
    // Start countdown
    quizState.timer = setInterval(() => {
        quizState.timeLeft--;
        
        if (timerDisplay) {
            timerDisplay.textContent = quizState.timeLeft;
            
            // Add warning color when time is low
            if (quizState.timeLeft <= 10) {
                timerDisplay.style.color = '#ef4444';
            } else {
                timerDisplay.style.color = '';
            }
        }
        
        // Time's up - auto confirm as wrong if no option selected
        if (quizState.timeLeft <= 0) {
            clearInterval(quizState.timer);
            quizState.timer = null;
            
            console.log('Timer reached 0 - handle timeout');
            if (!document.querySelector('.option-btn.selected')) {
                showFeedback(t('quiz_timeout'), 'warning');
                // Force move or show results if it was last question
                // For simplicity, we'll just disable inputs and show correct answer
                const q = quizState.questions[quizState.currentIndex];
                document.querySelectorAll('.option-btn').forEach(btn => {
                    const text = btn.querySelector('.option-text').textContent;
                    if (text === q.correctAnswer) btn.classList.add('correct');
                    btn.disabled = true;
                });
                
                // Show "Next" or "Finish" button
                const confirmBtn = document.getElementById('btn-confirm');
                confirmBtn.disabled = false;
                if (quizState.currentIndex < quizState.questions.length - 1) {
                    confirmBtn.textContent = t('btn_next_q');
                } else {
                    confirmBtn.textContent = t('btn_finish_quiz');
                }
            }
        }
    }, 1000);
}

function selectOption(choice, btn) {
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    quizState.selectedChoice = choice;
    document.getElementById('btn-confirm').disabled = false;
    
    // Save selected choice to quizState in localStorage
    localStorage.setItem('quizState', JSON.stringify(quizState));
}

function autoConfirm() {
    const q = quizState.questions[quizState.currentIndex];

    if (!quizState.selectedChoice) {
        // الوقت انتهى بدون اختيار - أظهر الإجابة الصحيحة مباشرة (0 نقاط)
        console.log(`Time's up! Correct answer: ${q.correctAnswer}`);

        // سجل الإجابة الخاطئة (لم يختر شيء)
        quizState.userAnswers[quizState.currentIndex] = {
            question: q.question,
            selected: '❌ لم يتم اختيار إجابة (انتهى الوقت)',
            correct: q.correctAnswer,
            isCorrect: false,
            isTimeout: true
        };

        // اعرض الإجابة الصحيحة
        document.querySelectorAll('.option-btn').forEach(btn => {
            const text = btn.querySelector('.option-text').textContent;
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
            if (text === q.correctAnswer) {
                btn.classList.add('correct');
            }
        });

        // أظهر الشرح
        const explanationBox = document.getElementById('explanation-box');
        explanationBox.classList.remove('hidden');
        document.getElementById('explanation-text').textContent = q.explanation || 'لا يوجد شرح متاح';

        // أظهر زر التالي
        if (quizState.currentIndex < quizState.questions.length - 1) {
            // Don't show btn-next since we're using confirm button as next
            console.log('Ready for next question');
        } else {
            console.log('Last question completed');
        }
    } else {
        // اختار إجابة - تحقق منها عادياً
        confirmAnswer();
    }
}

document.getElementById('btn-back-quiz').onclick = () => {
    // Stop timer
    if (quizState.timer) {
        clearInterval(quizState.timer);
        quizState.timer = null;
    }
    
    // Clear quiz state from localStorage
    localStorage.removeItem('quizState');
    
    // Clear any saved page state
    localStorage.removeItem('currentPageState');
    sessionStorage.setItem('lastScreen', 'dashboard');
    
    // Go back to dashboard
    showScreen('dashboard');
    renderDashboard();
};

async function showResults() {
    // Prevent duplicate calls
    if (quizState.resultsShown) {
        return;
    }
    quizState.resultsShown = true;
    
    // Clear quiz state from localStorage since quiz is finished
    localStorage.removeItem('quizState');
    
    // Stop timer
    if (quizState.timer) {
        clearInterval(quizState.timer);
        quizState.timer = null;
    }
    
    // Save progress
    try {
        const isQuizAlreadyCompleted = isQuizCompleted(quizState.sessionId);
        const currentQuizScore = getQuizScore(quizState.sessionId);
        
        // Calculate total points earned in this quiz
        let totalQuizPoints = 0;
        
        // فقط احسب النقاط إذا لم يكن الاختبار مكتمل من قبل
        if (!isQuizAlreadyCompleted) {
            totalQuizPoints = quizState.score * 15; // 15 points per correct answer
            
            // Deduct help points from total
            const helpDeductions = (quizState.hintsUsed || 0) * 5 + (quizState.deleteOptionsUsed || 0) * 10;
            totalQuizPoints = Math.max(0, totalQuizPoints - helpDeductions);
            
            // Count time bonuses
            let timeBonusCount = 0;
            quizState.userAnswers.forEach((answer, idx) => {
                if (answer.isCorrect && answer.timeBonus) {
                    timeBonusCount++;
                }
            });
            totalQuizPoints += timeBonusCount * 10; // 10 bonus per fast answer (less than 2 minutes)
        }
        
        await fetch(`${API_URL}/progress/quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                sessionId: quizState.sessionId,
                score: quizState.score,
                totalQuestions: quizState.questions.length,
                pointsAwarded: totalQuizPoints,
                hintUsed: quizState.hintUsed,
                deleteOptionUsed: quizState.deleteOptionUsed
            })
        });
        await fetchUserProgress();
        
        // Try to unlock next session after quiz completion
        await checkAndUnlockNextSession(quizState.sessionId);
    } catch (err) {
        console.error('Error saving progress:', err);
    }
    
    // Show results screen before going back to dashboard
    const totalQuestions = quizState.questions.length;
    const correctAnswers = quizState.score;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);
    const basePoints = correctAnswers * 15;
    const timeBonuses = quizState.userAnswers.filter(a => a.isCorrect && a.timeBonus).length;
    const bonusPoints = timeBonuses * 10; // 10 bonus per fast answer (less than 2 minutes)
    const hintsUsed = quizState.hintsUsed || 0;
    const deleteOptionsUsed = quizState.deleteOptionsUsed || 0;
    const helpDeductions = hintsUsed * 5 + deleteOptionsUsed * 10;
    const totalPoints = Math.max(0, basePoints + bonusPoints - helpDeductions);
    
    // Use the isAlreadyCompleted flag captured at quiz start
    const isQuizAlreadyCompleted = quizState.isAlreadyCompleted || false;
    
    // Create results overlay
    const resultsHTML = `
        <div id="quiz-results" class="quiz-results-overlay">
            <div class="results-card">
                <div class="results-header">
                    <span class="results-icon">${isQuizAlreadyCompleted ? '🔄' : '🎉'}</span>
                    <h2>${isQuizAlreadyCompleted ? 'تم إعادة الاختبار!' : 'تم إنهاء الاختبار!'}</h2>
                </div>
                <div class="results-stats">
                    <div class="stat-row">
                        <span class="stat-label">الإجابات الصحيحة:</span>
                        <span class="stat-value correct">${correctAnswers} / ${totalQuestions}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">النسبة:</span>
                        <span class="stat-value">${percentage}%</span>
                    </div>
                    ${isQuizAlreadyCompleted ? `
                        <div class="stat-row warning">
                            <span class="stat-label">النقاط المحتسبة:</span>
                            <span class="stat-value warning">0 نقطة</span>
                        </div>
                        <div class="warning-message">
                            <p>⚠️ لقد أكملت هذا الاختبار من قبل، لن يتم احتساب نقاط إضافية.</p>
                            <p>يمكنك إعادة الاختبار للممارسة فقط.</p>
                        </div>
                    ` : `
                        <div class="stat-row">
                            <span class="stat-label">النقاط الأساسية:</span>
                            <span class="stat-value">+${basePoints}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">مكافآت السرعة (${timeBonuses}):</span>
                            <span class="stat-value bonus">+${bonusPoints}</span>
                        </div>
                        ${helpDeductions > 0 ? `
                            <div class="stat-row">
                                <span class="stat-label">المساعدات المستخدمة:</span>
                                <span class="stat-value deduction">-${helpDeductions}</span>
                            </div>
                            <div class="help-summary">
                                <span class="help-item">💡 ${hintsUsed} تلميح (${hintsUsed * 5} نقطة)</span>
                                ${deleteOptionsUsed > 0 ? `<span class="help-item">❌ ${deleteOptionsUsed} حذف (${deleteOptionsUsed * 10} نقطة)</span>` : ''}
                            </div>
                        ` : ''}
                        <div class="stat-row total">
                            <span class="stat-label">الإجمالي:</span>
                            <span class="stat-value total-points">${totalPoints} نقطة</span>
                        </div>
                    `}
                </div>
                <button id="btn-close-results" class="btn btn-primary">العودة للوحة التحكم</button>
            </div>
        </div>
    `;
    
    // Add results to page
    document.body.insertAdjacentHTML('beforeend', resultsHTML);
    
    // Handle close button
    document.getElementById('btn-close-results').onclick = () => {
        document.getElementById('quiz-results').remove();
        showScreen('dashboard');
        renderDashboard();
    };
}

/**
 * Centralized function to check if a session is fully completed (Quiz + Challenges)
 * and attempt to unlock the next session.
 */
async function checkAndUnlockNextSession(sessionId) {
    console.log(`🔍 Checking unlock for session ${sessionId}...`);
    
    if (!state.user) return;

    // 1. Check Quiz completion (score >= 50%)
    const quizId = `q_s${sessionId}`;
    const quizScore = (state.user.quizScores && state.user.quizScores[quizId]) || 0;
    const quizPassed = quizScore >= 50;

    // 2. Check Challenges completion (e.g., s1c1 to s1c4)
    const allChallengeIds = [
        `s${sessionId}c1`,
        `s${sessionId}c2`,
        `s${sessionId}c3`,
        `s${sessionId}c4`
    ];
    const completedChallenges = state.user.completedChallenges || [];
    const challengesDone = allChallengeIds.every(id => completedChallenges.includes(id));

    console.log(`- Quiz Passed: ${quizPassed} (Score: ${quizScore}%)`);
    console.log(`- Challenges Done: ${challengesDone}`);

    if (quizPassed && challengesDone) {
        // Attempt unlock from backend
        try {
            const res = await fetch(`${API_URL}/progress/unlock-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.currentSession > state.user.currentSession) {
                    const oldSession = state.user.currentSession;
                    state.user.currentSession = data.currentSession;
                    
                    showPopup('✨ مبروك!', `🎉 رائع! لقد فتحت المرحلة ${data.currentSession} بنجاح.`, 'success', '🏆');
                    
                    // Refresh dashboard if we are on it
                    const dashboardEl = document.getElementById('screen-dashboard');
                    if (dashboardEl && dashboardEl.classList.contains('active')) {
                        renderDashboard(false);
                    }
                }
            }
        } catch (err) {
            console.error('Error in checkAndUnlockNextSession API call:', err);
        }
    }
}

// Helper to deduct hint points
async function deductHintPoints() {
    try {
        const res = await fetch(`${API_URL}/progress/hint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            }
        });
        
        if (res.ok) {
            await fetchUserProgress();
            return true;
        }
    } catch (err) {
        console.error('Error deducting hint points:', err);
    }
    return false;
}

// Show hint for current question
function showHint(question) {
    if (!question) {
        console.log('No question provided to showHint');
        return;
    }
    
    console.log('Showing hint for question:', question.question);
    
    const questionText = document.getElementById('question-text');
    if (!questionText) {
        console.log('Question text element not found');
        return;
    }
    
    // Check if hint already exists
    const existingHint = document.getElementById('quiz-hint-text');
    if (existingHint) {
        console.log('Hint already exists, removing old hint');
        existingHint.remove();
    }
    
    // Save hint to localStorage for persistence
    localStorage.setItem('currentHint', question.hint || 'لا يوجد تلميح متاح لهذا السؤال');
    localStorage.setItem('hintQuestionIndex', quizState.currentIndex.toString());
    
    // Create hint element with the correct answer
    const hintElement = document.createElement('div');
    hintElement.id = 'quiz-hint-text';
    hintElement.className = 'hint-text animate-popIn';
    hintElement.style.cssText = `
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.3);
        border-radius: 12px;
        padding: 1rem;
        margin: 1rem 0;
        color: #fbbf24;
        font-size: 0.95rem;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;
    hintElement.innerHTML = `
        <span style="font-size: 1.5rem;">💡</span>
        <div>
            <strong style="display: block; margin-bottom: 0.25rem;">تلميح للمساعدة:</strong>
            <span>${question.hint || 'لا يوجد تلميح متاح لهذا السؤال'}</span>
        </div>
    `;
    
    // Insert hint after question text
    questionText.parentNode.insertBefore(hintElement, questionText.nextSibling);
    
    console.log('Hint displayed successfully');
}

function disableHelpButtons(usedHint) {
    const hintBtn = document.getElementById('btn-quiz-hint');
    const deleteBtn = document.getElementById('btn-delete-option');
    
    if (usedHint) {
        if (hintBtn) {
            hintBtn.textContent = '💡 تم استخدام التلميح';
            hintBtn.disabled = true;
            hintBtn.style.opacity = '0.5';
            hintBtn.style.cursor = 'not-allowed';
        }
        if (deleteBtn) {
            deleteBtn.textContent = '❌ تم استخدام الحذف';
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = '0.5';
            deleteBtn.style.cursor = 'not-allowed';
        }
    } else {
        if (hintBtn) {
            hintBtn.textContent = '💡 تلميح (-5 نقاط)';
            hintBtn.disabled = false;
            hintBtn.style.opacity = '1';
            hintBtn.style.cursor = 'pointer';
        }
        if (deleteBtn) {
            deleteBtn.textContent = '❌ حذف خيار (-10 نقاط)';
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
            deleteBtn.style.cursor = 'pointer';
        }
    }
}

// --- Session Management ---
function startSession(id) {
    showCategories(id);
}

async function showCategories(sessionId) {
    showScreen('category');
    state.currentSession = sessionId;
    sessionStorage.setItem('currentSession', sessionId);
    saveCurrentPageState('category', { sessionId });

    const categoryGrid = document.getElementById('categories-grid');
    if (!categoryGrid) return;

    try {
        const res = await fetch(`${API_URL}/progress/challenge-data/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        let challenges;
        if (res.ok) {
            challenges = await res.json();
        } else {
            // Use fallback challenges based on session
            challenges = getFallbackChallenges(sessionId);
        }

        const completedChallenges = state.user.completedChallenges || [];
        
        // Find current challenge level
        let currentLevel = 0;
        let allCompleted = true;
        
        for (let i = 0; i < challenges.length; i++) {
            const challengeId = challenges[i].id || challenges[i].challengeId;
            if (!completedChallenges.includes(challengeId)) {
                currentLevel = i;
                allCompleted = false;
                break;
            }
        }

        let html = '';
        
        // Quiz card
        html += `
            <div class="category-card" onclick="startQuiz(${sessionId})">
                <div class="category-icon">📝</div>
                <h3>اختبار نظري شامل</h3>
                <p>اختبر معلوماتك في مفاهيم هذه المرحلة</p>
                <div class="category-type">نظري</div>
            </div>
        `;

        // Single challenge card with all levels
        if (allCompleted) {
            // All challenges completed - show replay
            html += `
                <div class="category-card completed">
                    <div class="category-icon">🏆</div>
                    <h3>جميع التحديات مكتملة!</h3>
                    <p>لقد أكملت جميع مستويات التحدي العملي</p>
                    <div class="category-type">مكتمل ✅</div>
                    <div class="category-actions">
                        <button onclick="replayAllChallenges(${sessionId})" class="btn btn-replay">
                            🔄 إعادة التحديات
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Show current challenge level
            const currentChallenge = challenges[currentLevel];
            const challengeDescription = currentChallenge.description || currentChallenge.goal || currentChallenge.focus?.join(' | ') || 'أكمل هذا التحدي للتقدم';
            
            html += `
                <div class="category-card challenge-level" onclick="openSpecificChallenge(${sessionId}, ${currentLevel})">
                    <div class="category-icon">🛠️</div>
                    <h3>${currentChallenge.title || 'تحدي'} </h3>
                    <p>${challengeDescription}</p>
                    <div class="category-type">التحدي العملي - المستوى ${currentLevel + 1}/${challenges.length}</div>
                    <div class="challenge-info">
                        <span class="points-reward">🏆 +25 نقطة</span>
                        <span class="challenge-status">🔓 متاح</span>
                    </div>
                    <div class="progress-indicator">
                        <div class="progress-text">التقدم: ${currentLevel}/${challenges.length}</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(currentLevel / challenges.length) * 100}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        categoryGrid.innerHTML = html;
    } catch (err) {
        console.error(err);
        showPopup('خطأ', 'تعذر تحميل بيانات المرحلة', 'error', '❌');
    }
}

// Get fallback challenges for each session
function getFallbackChallenges(sessionId) {
    const challengesData = {
        1: [
            { id: 'd1c1', title: 'المستوى 1: جدول بسيط', description: 'جدول يحتوي صفاً واحداً وعمودين.' },
            { id: 'd1c2', title: 'المستوى 2: قائمة مرتبة', description: 'إنشاء قائمة مرقمة للعناصر.' },
            { id: 'd1c3', title: 'المستوى 3: صورة مع رابط', description: 'إضافة صورة قابلة للنقر.' },
            { id: 'd1c4', title: 'المستوى 4: نموذج بسيط', description: 'إنشاء نموذج لإدخال البيانات.' }
        ],
        2: [
            { id: 'd2c1', title: 'المستوى 1: روابط متعددة', description: 'إنشاء قائمة روابط داخلية.' },
            { id: 'd2c2', title: 'المستوى 2: معرض صور', description: 'عرض صور بتنسيق منظم.' },
            { id: 'd2c3', title: 'المستوى 3: فيديو مضمن', description: 'إضافة فيديو مع عناصر تحكم.' },
            { id: 'd2c4', title: 'المستوى 4: خريطة صور', description: 'إنشاء خريطة صور تفاعلية.' }
        ],
        3: [
            { id: 'd3c1', title: 'المستوى 1: جدول معقد', description: 'جدول متعدد الصفوف والأعمدة.' },
            { id: 'd3c2', title: 'المستوى 2: نموذج متقدم', description: 'نموذج مع أنواع مختلفة من الحقول.' },
            { id: 'd3c3', title: 'المستوى 3: قوائم متداخلة', description: 'قوائم متعددة المستويات.' },
            { id: 'd3c4', title: 'المستوى 4: جدول بيانات', description: 'جدول بيانات مع رؤوس.' }
        ],
        4: [
            { id: 'd4c1', title: 'المستوى 1: تخطيط مرن', description: 'استخدام divs للتخطيط.' },
            { id: 'd4c2', title: 'المستوى 2: عناصر دلالية', description: 'استخدام وسوم HTML5 دلالية.' },
            { id: 'd4c3', title: 'المستوى 3: مقال منظم', description: 'إنشاء مقال بهيكلة صحيحة.' },
            { id: 'd4c4', title: 'المستوى 4: صفحة كاملة', description: 'تصميم صفحة ويب كاملة.' }
        ]
    };
    
    return challengesData[sessionId] || challengesData[1];
}

// Replay all challenges in a session
async function replayAllChallenges(sessionId) {
    try {
        let challenges;
        
        // Try to get from API first
        try {
            const res = await fetch(`${API_URL}/progress/challenge-data/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (res.ok) {
                challenges = await res.json();
            } else {
                throw new Error('API not available');
            }
        } catch (err) {
            // Use fallback challenges
            challenges = getFallbackChallenges(sessionId);
        }
        
        if (!challenges || challenges.length === 0) {
            showPopup('لا توجد تحديات', 'لا توجد تحديات متاحة لهذه المرحلة', 'warning', '⚠️');
            return;
        }
        
        // Show confirmation dialog
        const userConfirmed = await new Promise((resolve) => {
            const confirmMessage = `
                <div style="text-align: center; padding: 1.5rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🔄</div>
                    <h3 style="color: #60a5fa; margin-bottom: 1rem; font-size: 1.4rem;">إعادة جميع التحديات</h3>
                    <p style="color: #e2e8f0; margin-bottom: 1.5rem; line-height: 1.6;">
                        هل تريد إعادة جميع تحديات هذه المرحلة؟
                        <br><br>
                        <strong style="color: #fbbf24;">⚠️ لن يتم احتساب أي نقاط إضافية!</strong>
                    </p>
                    <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem;">
                        يمكنك إعادة التحديات للممارسة فقط
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="window._replayConfirmResult(true)" style="padding: 1rem 2rem; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: none; border-radius: 0.75rem; color: white; font-weight: 700; cursor: pointer; font-size: 1.1rem; min-width: 150px;">
                            ✅ نعم، إعادة
                        </button>
                        <button onclick="window._replayConfirmResult(false)" style="padding: 1rem 2rem; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 0.75rem; color: white; font-weight: 700; cursor: pointer; font-size: 1.1rem; min-width: 150px;">
                            ❌ إلغاء
                        </button>
                    </div>
                </div>
            `;
            showPopup('تأكيد الإعادة', confirmMessage, 'info', '🔄');
            window._replayConfirmResult = (result) => {
                closePopup();
                resolve(result);
            };
        });
        
        if (!userConfirmed) {
            return;
        }
        
        // Start with first challenge
        showPopup('بدء الإعادة', 'سيتم فتح أول تحدي في وضع الممارسة', 'info', '🎯');
        openChallengeAsPractice(sessionId, 0);
        
    } catch (err) {
        console.error('Error replaying challenges:', err);
        showPopup('خطأ', 'تعذر إعادة التحديات', 'error', '❌');
    }
}

// Refactored helper to load challenge data
async function loadChallengeData(sessionId, index, isPractice = false) {
    try {
        restoreBuilderCode();
        let challenges;
        
        try {
            const res = await fetch(`${API_URL}/progress/challenge-data/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (res.ok) {
                challenges = await res.json();
                if (challenges.challenges) challenges = challenges.challenges;
            } else {
                throw new Error('API Failed');
            }
        } catch (err) {
            const localRes = await fetch(`${API_URL}/challenge`);
            const localData = await localRes.json();
            challenges = localData.challenges || localData;
        }

        let data = challenges[index];
        if (!data || (!data.id && !data.challengeId)) {
            showPopup(t('error_generic'), t('session_locked'), 'warning', '⚠️');
            return null;
        }

        data.id = data.id || data.challengeId;
        data.sessionId = sessionId;
        data.isPracticeMode = isPractice;

        const completedChallenges = state.user.completedChallenges || [];
        const isAlreadyCompleted = completedChallenges.includes(data.id);

        // Save state
        data.index = index; // Store index for auto-advance
        data.isAlreadyCompleted = isAlreadyCompleted;
        state.currentChallenge = data;
        const challengeStateData = {
            id: data.id,
            sessionId: sessionId,
            index: index,
            data: data,
            isAlreadyCompleted: isAlreadyCompleted,
            isPracticeMode: isPractice,
            timestamp: Date.now(),
            builderCode: state.builderCode || []
        };
        localStorage.setItem('challengeState', JSON.stringify(challengeStateData));
        sessionStorage.setItem('lastScreen', 'challenge');
        saveCurrentPageState('challenge', { sessionId, index, isAlreadyCompleted, isPractice });

        return { data, isAlreadyCompleted };
    } catch (err) {
        console.error('Challenge Load Error:', err);
        showPopup(t('error_generic'), err.message, 'error', '❌');
        return null;
    }
}

async function openSpecificChallenge(sessionId, index) {
    const result = await loadChallengeData(sessionId, index, false);
    if (!result) return;

    const { data, isAlreadyCompleted } = result;

    if (isAlreadyCompleted) {
        const userConfirmed = await new Promise((resolve) => {
            const warningMessage = `
                <div style="text-align: center; padding: 1rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: #fbbf24; margin-bottom: 1rem; font-size: 1.4rem;">${t('confirm_delete_title')}: لقد أكملت هذا التحدي من قبل!</h3>
                    <p style="color: #e2e8f0; margin-bottom: 1.5rem; line-height: 1.6;">
                        لقد قمت بحل هذا التحدي بنجاح سابقاً. 
                        <br><br>
                        <strong style="color: #f87171; font-size: 1.1rem;">⚠️ لن يتم احتساب أي نقاط إضافية!</strong>
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="window._challengeWarningResult(true)" class="btn btn-primary">
                            متابعة للممارسة
                        </button>
                    </div>
                </div>
            `;
            window._challengeWarningResult = (res) => { closePopup(); resolve(res); };
            showPopup('تحذير', warningMessage, 'warning', '⚠️');
        });
        if (!userConfirmed) return;
    }

    setupChallengeUI(data);
}

async function openChallengeAsPractice(sessionId, index) {
    const result = await loadChallengeData(sessionId, index, true);
    if (result) setupChallengeUI(result.data);
}

function setupChallengeUI(data) {
    const challengeTitle = data.title || `التحدي ${data.day || data.sessionId || ''}`;
    const challengeDesc = data.description || data.goal || data.focus?.join(' | ') || t('no_description_available');

    document.getElementById('challenge-title').textContent = challengeTitle;
    document.getElementById('challenge-desc').textContent = challengeDesc;
    
    if (!restoreBuilderCode()) state.builderCode = [];
    
    challengeState = { startTime: Date.now(), hintUsed: false, multipleChoiceUsed: false, timeBonus: false };
    
    // Hint restoration using persistent unlockedHints
    const hintId = `challenge_${data.sessionId}_c${data.index}_hint`;
    const isHintUnlocked = state.user.unlockedHints && state.user.unlockedHints.includes(hintId);

    if (isHintUnlocked) {
        const hintContainer = document.getElementById('challenge-hint-container');
        if (hintContainer) {
            document.getElementById('challenge-hint-text').textContent = data.hint;
            hintContainer.style.display = 'block';
        }
    } else {
        const hintContainer = document.getElementById('challenge-hint-container');
        if (hintContainer) hintContainer.style.display = 'none';
    }
    
    renderEditor();
    showScreen('challenge');
}

async function startQuiz(sessionId, categoryFilter = null) {
    // Check if user is logged in
    if (!state.token || !state.user) {
        showPopup('تسجيل الدخول مطلوب', `
            <div style="text-align: center; padding: 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔐</div>
                <h3 style="color: #fbbf24; margin-bottom: 1rem;">يجب تسجيل الدخول أولاً</h3>
                <p style="color: #94a3b8; margin-bottom: 2rem;">للتمكن من أداء الاختبارات والحصول على النقاط</p>
                <button onclick="closePopup(); showScreen('screen-auth');" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: none; border-radius: 0.5rem; color: white; font-weight: 700; cursor: pointer;">
                    تسجيل الدخول
                </button>
            </div>
        `, 'warning', '🔐');
        return;
    }

    try {
        // Check if quiz already completed using helper function
        const isAlreadyCompleted = isQuizCompleted(sessionId);
        
        // Reset help buttons at the start of quiz
        const hintBtn = document.getElementById('btn-quiz-hint');
        if (hintBtn) {
            hintBtn.textContent = '💡 تلميح (-5 نقاط)';
            hintBtn.disabled = false;
            hintBtn.style.opacity = '1';
            hintBtn.style.cursor = 'pointer';
        }
        const deleteBtn = document.getElementById('btn-delete-option');
        if (deleteBtn) {
            deleteBtn.textContent = '❌ حذف خيار (-10 نقاط)';
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
            deleteBtn.style.cursor = 'pointer';
        }

        // Show warning if already completed - MORE PROMINENT
        if (isAlreadyCompleted) {
            const userConfirmed = await new Promise((resolve) => {
                const warningMessage = `
                    <div style="text-align: center; padding: 1rem;">
                        <div style="font-size: 3rem; margin-bottom: 0.5rem;">⚠️</div>
                        <h3 style="color: #fbbf24; margin-bottom: 1rem; font-size: 1.2rem; font-weight: 800;">
                            ⚠️ تنبيه هام: اختبار مكتمل بالفعل!
                        </h3>
                        <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
                            <p style="color: #fca5a5; font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem; line-height: 1.4;">
                                لقد أكملت هذا الاختبار بنجاح من قبل
                            </p>
                            <p style="color: #f87171; font-size: 1rem; font-weight: 800; margin: 0; line-height: 1.4;">
                                🚫 لن يتم احتساب أي نقاط جديدة
                            </p>
                        </div>
                        <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 0.5rem; padding: 0.75rem; margin-bottom: 1rem;">
                            <p style="color: #fbbf24; font-size: 0.85rem; margin: 0;">
                                💡 يمكنك المتابعة للممارسة والمراجعة فقط
                            </p>
                        </div>
                        <div style="display: flex; gap: 0.5rem; justify-content: center;">
                            <button onclick="window._quizWarningResult(true)" style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: none; border-radius: 0.5rem; color: white; font-weight: 700; cursor: pointer; font-size: 0.9rem; min-width: 120px;">
                                ✅ متابعة للممارسة
                            </button>
                        </div>
                    </div>
                `;
                
                window._quizWarningResult = (result) => {
                    closePopup();
                    delete window._quizWarningResult;
                    resolve(result);
                };
                
                showPopup('⚠️ تحذير إعادة الاختبار', warningMessage, 'warning', '⚠️');
            });
            
            if (!userConfirmed) return;
        }

        const res = await fetch(`${API_URL}/progress/quiz-data/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        let data = await res.json();

        console.log('Quiz data from server:', data); // Debug log
        console.log('Category filter:', categoryFilter);
        console.log('Response status:', res.status); // Debug log

        // If server returns empty, use local quiz data
        if (!data || data.length === 0) {
            console.log('Server returned empty, using local quiz data');
            // Load quiz data from local file
            try {
                const quizResponse = await fetch(`${API_URL}/quiz`);
                const localQuizData = await quizResponse.json();
                console.log('Local quiz data loaded:', localQuizData);
                
                // Get questions based on session ID
                if (sessionId === 1) {
                    data = localQuizData[0].questions; // أساسيات HTML
                } else if (sessionId === 2) {
                    data = localQuizData[1].questions; // الوسائط والقوائم
                } else if (sessionId === 3) {
                    data = localQuizData[2].questions; // الجداول والنماذج
                } else if (sessionId === 4) {
                    data = localQuizData[3].questions; // التخطيط والوسوم الدلالية
                } else {
                    // Default to all questions if session not found
                    data = [];
                    localQuizData.forEach(category => {
                        data = data.concat(category.questions);
                    });
                }
                console.log('Session quiz data:', data);
            } catch (err) {
                console.error('Error loading local quiz data:', err);
                data = [];
            }
        }

        if (categoryFilter) {
            data = data.filter(q => q.category === categoryFilter);
            console.log('Filtered quiz data:', data); // Debug log
        }

        if (data.length === 0) {
            console.log('No quiz questions found'); // Debug log
            showPopup('لا توجد أسئلة', 'لا توجد أسئلة متاحة حالياً.', 'info', '📝');
            return;
        }

        quizState = {
            questions: data,
            currentIndex: 0,
            userAnswers: [],
            score: 0,
            timeLeft: 30,
            startTime: Date.now(),
            sessionId: sessionId,
            categoryFilter: categoryFilter,
            hintUsed: false,
            deleteOptionUsed: false,
            deletedOptions: [],
            timeBonusGiven: false,
            isAlreadyCompleted: isAlreadyCompleted, // Track if already completed
            timestamp: Date.now()
        };

        // Save comprehensive quiz state to localStorage
        localStorage.setItem('quizState', JSON.stringify(quizState));
        localStorage.setItem('currentQuizSession', sessionId.toString());
        if (categoryFilter) {
            localStorage.setItem('currentQuizCategory', categoryFilter);
        }
        
        // Save current page state
        saveCurrentPageState('quiz', {
            sessionId: sessionId,
            categoryFilter: categoryFilter,
            isAlreadyCompleted: isAlreadyCompleted
        });

        // Reset help buttons
        document.getElementById('btn-quiz-hint').textContent = '💡 تلميح (-5 نقاط)';
        document.getElementById('btn-quiz-hint').disabled = false;
        document.getElementById('btn-quiz-hint').style.opacity = '1';
        document.getElementById('btn-quiz-hint').style.cursor = 'pointer';
        document.getElementById('btn-delete-option').textContent = '❌ حذف خيار (-10 نقاط)';
        document.getElementById('btn-delete-option').disabled = false;
        document.getElementById('btn-delete-option').style.opacity = '1';
        document.getElementById('btn-delete-option').style.cursor = 'pointer';

        // Update all points displays
        updateAllPointsDisplays();

        showScreen('quiz');
        renderQuestion();
        
        // Clean up any leftover header elements
        const quizHeader = document.querySelector('.quiz-header');
        if (quizHeader) {
            quizHeader.remove();
        }
        const categoryBadge = document.getElementById('category-badge');
        if (categoryBadge) {
            categoryBadge.remove();
        }
    } catch (err) {
        showPopup('خطأ', 'تعذر تحميل الأسئلة', 'error', '❌');
    }
}

// loadChallenge is deprecated in favor of openSpecificChallenge

// Save current page state to localStorage
function saveCurrentPageState(screenType, data = {}) {
    const pageState = {
        screenType: screenType,
        data: data,
        timestamp: Date.now()
    };
    localStorage.setItem('currentPageState', JSON.stringify(pageState));
}

// Restore current page state from localStorage
function restoreCurrentPageState() {
    const savedState = localStorage.getItem('currentPageState');
    if (savedState) {
        try {
            return JSON.parse(savedState);
        } catch (err) {
            console.error('Failed to restore page state:', err);
        }
    }
    return null;
}

// Save builder code to localStorage
function saveBuilderCode() {
    const savedChallengeState = localStorage.getItem('challengeState');
    if (savedChallengeState) {
        try {
            const challengeState = JSON.parse(savedChallengeState);
            challengeState.builderCode = state.builderCode;
            localStorage.setItem('challengeState', JSON.stringify(challengeState));
        } catch (err) {
            console.error('Failed to save builder code:', err);
        }
    }
}

// Restore builder code from localStorage
function restoreBuilderCode() {
    const savedChallengeState = localStorage.getItem('challengeState');
    if (savedChallengeState) {
        try {
            const challengeState = JSON.parse(savedChallengeState);
            if (challengeState.builderCode && Array.isArray(challengeState.builderCode)) {
                state.builderCode = challengeState.builderCode;
                return true;
            }
        } catch (err) {
            console.error('Failed to restore builder code:', err);
        }
    }
    return false;
}

function renderEditor() {
    const canvas = document.getElementById('editor-canvas');
    canvas.innerHTML = '';
    state.builderCode.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'editor-item';

        itemDiv.innerHTML = `
            <div class="line-number">${index + 1}</div>
            <div class="item-content">
                <span class="code-tag"></span>
            </div>
            <div class="item-controls">
                <button class="control-btn move-up" title="Move Up">🔼</button>
                <button class="control-btn move-down" title="Move Down">🔽</button>
                <button class="control-btn delete" title="Delete">🗑️</button>
            </div>
        `;

        const span = itemDiv.querySelector('.code-tag');
        span.textContent = item;

        // Click to Edit - INLINE EDITING
        span.onclick = (e) => {
            e.stopPropagation();
            
            // Create inline input
            const input = document.createElement('input');
            input.type = 'text';
            input.value = item;
            input.className = 'inline-code-editor';
            input.style.cssText = `
                background: rgba(15, 23, 42, 0.9);
                border: 2px solid #3b82f6;
                border-radius: 6px;
                color: #60a5fa;
                font-family: 'Courier New', monospace;
                font-size: 1rem;
                padding: 0.5rem;
                width: 100%;
                outline: none;
            `;
            
            // Replace span with input
            span.replaceWith(input);
            input.focus();
            input.select();
            
            // Handle save on blur or enter
            const saveEdit = () => {
                const newValue = input.value.trim();
                if (newValue && newValue !== item) {
                    state.builderCode[index] = newValue;
                    renderEditor();
                    updatePreview();
                    // Auto-save builder code
                    saveBuilderCode();
                } else if (newValue === '') {
                    // Delete if empty
                    state.builderCode.splice(index, 1);
                    renderEditor();
                    updatePreview();
                    // Auto-save builder code
                    saveBuilderCode();
                } else {
                    // Cancel - restore span
                    input.replaceWith(span);
                }
            };
            
            input.addEventListener('blur', saveEdit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit();
                } else if (e.key === 'Escape') {
                    input.replaceWith(span);
                }
            });
        };

        // Manual controls as backup to D&D
        itemDiv.querySelector('.move-up').onclick = (e) => {
            e.stopPropagation();
            if (index > 0) {
                const temp = state.builderCode[index];
                state.builderCode[index] = state.builderCode[index - 1];
                state.builderCode[index - 1] = temp;
                renderEditor();
                updatePreview();
                saveBuilderCode();
            }
        };

        itemDiv.querySelector('.move-down').onclick = (e) => {
            e.stopPropagation();
            if (index < state.builderCode.length - 1) {
                const temp = state.builderCode[index];
                state.builderCode[index] = state.builderCode[index + 1];
                state.builderCode[index + 1] = temp;
                renderEditor();
                updatePreview();
                saveBuilderCode();
            }
        };

        itemDiv.querySelector('.delete').onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            showPopup('تأكيد الحذف', t('confirm_delete_msg'), 'warning', '🗑️');
            
            const popupActions = document.querySelector('.popup-actions');
            if (popupActions) {
                popupActions.innerHTML = `
                    <button onclick="confirmDeleteBuilderLine(${index})" class="popup-btn popup-btn-danger">
                        ${t('btn_confirm_yes')}
                    </button>
                    <button onclick="closePopup()" class="popup-btn popup-btn-secondary">
                        ${t('btn_cancel')}
                    </button>
                `;
            }
        };

        itemDiv.setAttribute('draggable', true);
        itemDiv.dataset.index = index;

        itemDiv.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            itemDiv.classList.add('dragging');
            e.dataTransfer.setData('sourceIndex', index);
            e.dataTransfer.effectAllowed = 'move';
        });

        itemDiv.addEventListener('dragend', () => {
            itemDiv.classList.remove('dragging');
        });

        // Mobile touch support for reordering using helper
        initTouchDragSupport(itemDiv, () => {
            return {
                payload: item,
                index: index,
                isReordering: true,
                label: item.length > 20 ? item.substring(0, 20) + '...' : item
            };
        }, (sourceData, sourceIndex, targetIndex) => {
            // If it was a reorder within canvas
            if (sourceIndex !== null && targetIndex !== null && sourceIndex !== targetIndex) {
                const movedItem = state.builderCode.splice(sourceIndex, 1)[0];
                state.builderCode.splice(targetIndex, 0, movedItem);
                renderEditor();
                updatePreview();
                saveBuilderCode();
            } else if (sourceIndex === null && targetIndex !== null) {
                // If it was a tag drop from sidebar
                insertDroppedItems(sourceData, targetIndex);
            } else if (sourceIndex === null && targetIndex === null) {
                // If it was dropped on canvas (at end)
                insertDroppedItems(sourceData);
            }
        });

        canvas.appendChild(itemDiv);
    });

    // Allow dropping on empty canvas area (append at end)
    if (!canvas._dndHandlersInitialized) {
        canvas._dndHandlersInitialized = true;

        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        canvas.addEventListener('drop', (e) => {
            if (e.target === canvas || e.target.id === 'editor-canvas') {
                e.preventDefault();
                if (window._dropProcessed) return;
                window._dropProcessed = true;

                const tagData = e.dataTransfer.getData('tagData');
                if (tagData) {
                    const newItems = JSON.parse(tagData);
                    insertDroppedItems(newItems);
                }

                setTimeout(() => window._dropProcessed = false, 100);
            }
        });

        // Mobile touch support for canvas
        canvas.addEventListener('touchstart', (e) => {
            // Prevent scrolling when touching canvas when in a drag operation
            if (window._mobileDragData) {
                e.preventDefault();
            }
        });

        // Mobile touch drop support
        canvas.addEventListener('touchend', (e) => {
            if (window._mobileDragData && !window._mobileDragProcessed && (e.target === canvas || e.target.id === 'editor-canvas')) {
                e.preventDefault();
                if (window._dropProcessed) return;
                window._mobileDragProcessed = true;
                window._dropProcessed = true;

                const newItems = window._mobileDragData;
                insertDroppedItems(newItems);
                window._mobileDragData = null;

                setTimeout(() => {
                    window._mobileDragProcessed = false;
                    window._dropProcessed = false;
                }, 100);
            }
        });
    }

    updatePreview();
    
    // Auto-save builder code after rendering
    saveBuilderCode();
}
function confirmDeleteBuilderLine(index) {
    if (state.builderCode && index >= 0 && index < state.builderCode.length) {
        state.builderCode.splice(index, 1);
        renderEditor();
        updatePreview();
        saveBuilderCode();
        closePopup();
        showToast(t('item_deleted_success') || 'تم حذف العنصر بنجاح', 'success');
    }
}

function updatePreview() {
    const iframe = document.getElementById('preview-iframe');
    const code = state.builderCode.join('');
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`<html><head><style>body { font-family: sans-serif; direction: rtl; padding: 20px; }</style></head><body>${code}</body></html>`);
    doc.close();
}

document.querySelectorAll('.tag-button').forEach(btn => {
    // Build tag items helper
    function getTagItems(tag) {
        if (tag === "all") {
            return [
                "<!DOCTYPE html>",
                "<html>",
                "<head>",
                "<title>",
                "عنوان الصفحة",
                "</title>",
                "</head>",
                "<body>",
                "</body>",
                "</html>"
            ];
        } else if (tag === "!DOCTYPE html") {
            return [`<!DOCTYPE html>`];
        } else if (['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'wbr', 'embed', 'param', 'track'].includes(tag)) {
            return [`<${tag}>`];
        } else if (tag === "!-- content --") {
            return [`<!-- اكتب تعليقك هنا -->`];
        } else {
            let defaultText = "";
            const textTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'strong', 'i', 'em', 'small', 'u', 'mark', 'sub', 'sup', 'title', 'button', 'label', 'a', 'option', 'summary', 'caption'];
            if (textTags.includes(tag)) defaultText = "نص جديد";
            const items = [`<${tag}>`];
            if (defaultText) items.push(defaultText);
            items.push(`</${tag}>`);
            return items;
        }
    }

    // Click/tap to insert item directly (two modes: click or drag)
    let lastClickTime = 0;
    let justDragged = false;

    function animateTagButton(button) {
        button.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';

        setTimeout(() => {
            button.style.transform = '';
            button.style.boxShadow = '';
        }, 150);
    }

    function addTagImmediately() {
        const tag = btn.dataset.tag;
        const items = getTagItems(tag);
        animateTagButton(btn);
        insertDroppedItems(items);
    }

    // Drag to insert at specific position
    btn.setAttribute('draggable', true);
    btn.addEventListener('dragstart', (e) => {
        justDragged = true;
        const tag = btn.dataset.tag;
        const items = getTagItems(tag);
        e.dataTransfer.setData('tagData', JSON.stringify(items));
        e.dataTransfer.effectAllowed = 'copy';
        btn.style.opacity = '0.5';
        btn.style.transform = 'scale(1.06)';
        btn.style.boxShadow = '0 10px 25px rgba(0,0,0,0.25)';
    });
    btn.addEventListener('dragend', () => {
        btn.style.opacity = '1';
        btn.style.transform = '';
        btn.style.boxShadow = '';
        setTimeout(() => {
            justDragged = false;
        }, 150);
    });

    btn.addEventListener('click', (e) => {
        if (justDragged) {
            return;
        }
        const now = Date.now();
        if (now - lastClickTime < 250) return;
        lastClickTime = now;

        e.preventDefault();
        addTagImmediately();
    });

    // Mobile touch support for tag buttons using helper
    initTouchDragSupport(btn, () => {
        const tag = btn.dataset.tag;
        const items = getTagItems(tag);
        return {
            payload: items,
            index: null, // represents a new tag, not a reorder
            isReordering: false,
            label: tag
        };
    }, (sourceData, sourceIndex, targetIndex) => {
        // Tag was dropped
        if (targetIndex !== null) {
            insertDroppedItems(sourceData, targetIndex);
        } else {
            // Drop on canvas (append to end)
            insertDroppedItems(sourceData);
        }
    });
});

document.getElementById('btn-clear-code').onclick = () => {
    state.builderCode = [];
    renderEditor();
};

// Check Solution Button - moved inside DOMContentLoaded to ensure DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Make sure the button exists before adding event listener
    const checkSolutionBtn = document.getElementById('btn-check-solution');
    if (checkSolutionBtn) {
        checkSolutionBtn.onclick = async () => {

    // 🧾 الكود المدخل من الطالب
    const studentRaw = state.builderCode.join('');
    const challengeId = state.currentChallenge?.id || state.currentChallenge?.challengeId;
    const isReplay = state.currentChallenge?.isAlreadyCompleted;
    const timeTaken = (Date.now() - (challengeState?.startTime || Date.now())) / 1000;
    const timeBonus = timeTaken < 60; // bonus if under 1 minute

    const checkSolutionBtn = document.getElementById('btn-check-solution');
    if (checkSolutionBtn) {
        checkSolutionBtn.disabled = true;
        checkSolutionBtn.textContent = 'جاري التحقق...';
    }

    try {
        const response = await fetch(`${API_URL}/challenge/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
                challengeId: challengeId,
                code: studentRaw,
                isPracticeMode: !!isReplay,
                hintUsed: challengeState?.hintUsed || false,
                multipleChoiceUsed: challengeState?.multipleChoiceUsed || false,
                timeBonus: timeBonus
            })
        });

        const data = await response.json();
        
        if (checkSolutionBtn) {
            checkSolutionBtn.disabled = false;
            checkSolutionBtn.textContent = 'تحقق من الحل';
        }

        if (data.success) {
            // ✅ صح
            if (isReplay || data.isPractice) {
                showFeedback('✅ تم إكمال التحدي مرة أخرى! (وضع الممارسة)', 'success');
            } else {
                const points = data.earnedPoints || 25;
                showFeedback(`✅ الحل صحيح! (+${points} نقطة)`, 'success');
            }

            // 🎉 Confetti
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            
            console.log(`✅ Challenge ${challengeId} validated successfully by server`);

            await fetchUserProgress();
            
            // Try to unlock next session after challenge completion
            await checkAndUnlockNextSession(state.currentChallenge.sessionId);
            
            // Clear builder code after successful completion
            state.builderCode = [];
            localStorage.removeItem('challengeState');
            
            // مسح التلميح بعد إكمال التحدي
            localStorage.removeItem('hintPurchased');
            localStorage.removeItem('hintText');
            localStorage.removeItem('hintChallengeId');
            
            // إخفاء حاوية التلميح
            const hintContainer = document.getElementById('challenge-hint-container');
            if (hintContainer) {
                hintContainer.style.display = 'none';
            }
            
            // Auto-advance to next level or redirect to categories after a delay
            setTimeout(async () => {
                const sessionId = state.currentChallenge?.sessionId || 1;
                const nextIndex = (state.currentChallenge?.index !== undefined) ? state.currentChallenge.index + 1 : -1;

                if (nextIndex !== -1) {
                    try {
                        const res = await fetch(`${API_URL}/challenge`);
                        const allChallenges = await res.json();
                        const sessionChallenges = allChallenges.filter(c => c.sessionNumber === sessionId);
                        
                        if (nextIndex < sessionChallenges.length) {
                             openSpecificChallenge(sessionId, nextIndex);
                             return;
                        }
                    } catch (e) {
                        console.error('Auto-advance error:', e);
                    }
                }
                
                showCategories(sessionId);
            }, 2000);

        } else {
            // ❌ غلط
            showFeedback('❌ الحل غير صحيح', 'error');
            console.log('❌ تحدي غير صالح - تم الرفض من السيرفر');
        }
    } catch (err) {
        console.error('Validation API Error:', err);
        showFeedback('❌ خطأ في الاتصال بالخادم', 'error');
        if (checkSolutionBtn) {
            checkSolutionBtn.disabled = false;
            checkSolutionBtn.textContent = t('btn_check_solution') || 'تحقق من الحل';
        }
    }
        };
    }
});

// --- Mobile Touch D&D Helper ---
window._touchDragState = {
    ghost: null,
    sourceData: null,
    sourceIndex: null,
    isReordering: false,
    lastOverElement: null
};

/**
 * Enhanced Touch Drag and Drop support for mobile
 */
function initTouchDragSupport(element, getData, onDrop) {
    let startX, startY;
    let isDragging = false;
    const THRESHOLD = 10;

    element.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isDragging = false;
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (!startX || !startY) return;
        const touch = e.touches[0];
        const dist = Math.sqrt(Math.pow(touch.clientX - startX, 2) + Math.pow(touch.clientY - startY, 2));

        if (!isDragging && dist > THRESHOLD) {
            const data = getData();
            if (!data) return;
            
            isDragging = true;
            window._touchDragState.sourceData = data.payload;
            window._touchDragState.sourceIndex = data.index;
            window._touchDragState.isReordering = data.isReordering;

            // Create ghost for visual feedback
            const ghost = document.createElement('div');
            ghost.className = 'touch-ghost';
            ghost.textContent = data.label || 'Dragging...';
            document.body.appendChild(ghost);
            window._touchDragState.ghost = ghost;
            
            element.classList.add('dragging');
        }

        if (isDragging && window._touchDragState.ghost) {
            if (e.cancelable) e.preventDefault(); 
            const ghost = window._touchDragState.ghost;
            ghost.style.left = touch.clientX + 'px';
            ghost.style.top = touch.clientY + 'px';

            // Find drop target under finger
            const over = document.elementFromPoint(touch.clientX, touch.clientY);
            if (over) {
                const target = over.closest('.editor-item, #editor-canvas');
                if (target !== window._touchDragState.lastOverElement) {
                    if (window._touchDragState.lastOverElement) {
                        window._touchDragState.lastOverElement.classList.remove('drop-target-active');
                    }
                    if (target) {
                        target.classList.add('drop-target-active');
                    }
                    window._touchDragState.lastOverElement = target;
                }
            }
        }
    }, { passive: false });

    element.addEventListener('touchend', (e) => {
        if (isDragging) {
            const touch = e.changedTouches[0];
            const over = document.elementFromPoint(touch.clientX, touch.clientY);
            const target = over ? over.closest('.editor-item, #editor-canvas') : null;
            
            let targetIndex = null;
            if (target && target.classList.contains('editor-item')) {
                targetIndex = parseInt(target.dataset.index);
            }

            // Final callback
            onDrop(window._touchDragState.sourceData, window._touchDragState.sourceIndex, targetIndex);
            
            // Cleanup
            if (window._touchDragState.ghost) {
                window._touchDragState.ghost.remove();
                window._touchDragState.ghost = null;
            }
            if (window._touchDragState.lastOverElement) {
                window._touchDragState.lastOverElement.classList.remove('drop-target-active');
                window._touchDragState.lastOverElement = null;
            }
            element.classList.remove('dragging');
            isDragging = false;
        }
        startX = null;
        startY = null;
    });

    element.addEventListener('touchcancel', () => {
        if (window._touchDragState.ghost) {
            window._touchDragState.ghost.remove();
            window._touchDragState.ghost = null;
        }
        if (window._touchDragState.lastOverElement) {
            window._touchDragState.lastOverElement.classList.remove('drop-target-active');
            window._touchDragState.lastOverElement = null;
        }
        element.classList.remove('dragging');
        isDragging = false;
        startX = null;
        startY = null;
    });
}

// --- Admin Logic ---
async function initAdminDashboard() {
    const isAdmin = state.user && (state.user.role === 'Admin' || state.user.role === 'admin');
    if (!state.user || !isAdmin) {
        console.log('Not admin, redirecting to dashboard. User:', state.user?.username, 'Role:', state.user?.role);
        showScreen('dashboard');
        return;
    }

    // Save lastScreen for refresh restoration
    sessionStorage.setItem('lastScreen', 'admin');

    const tbody = document.getElementById('student-list-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;"><span class="loader"></span> جاري تحميل بيانات الطلاب...</td></tr>';
    }
    
    showScreen('admin');
    
    try {
        console.log('🚀 Loading Admin Dashboard data...');
        const res = await fetch(`${API_URL}/admin/students`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        if (!res.ok) {
            throw new Error('Failed to fetch admin data');
        }
        
        const students = await res.json();
        // Cache the list for details view
        window._adminStudentsList = students;
        
        const tbody = document.getElementById('student-list-body');
        tbody.innerHTML = '';

        let totalAccessCount = 0;
        let totalRetryCount = 0;
        let totalChallengeRetries = 0;
        let totalQuizRetries = 0;

        // Sort students by activity (most active first)
        students.sort((a, b) => {
            const aActivity = (a.accessCount || 0) + (a.challengeRetryCount || 0) + (a.quizRetryCount || 0);
            const bActivity = (b.accessCount || 0) + (b.challengeRetryCount || 0) + (b.quizRetryCount || 0);
            return bActivity - aActivity;
        });

        students.forEach((s, idx) => {
            const row = document.createElement('tr');
            
            // Calculate access counts
            const accessCount = s.accessCount || 0;
            const challengeRetries = s.challengeRetryCount || 0;
            const quizRetries = s.quizRetryCount || 0;
            const totalUserRetries = challengeRetries + quizRetries;
            
            totalAccessCount += accessCount;
            totalChallengeRetries += challengeRetries;
            totalQuizRetries += quizRetries;
            totalRetryCount += totalUserRetries;

            // Calculate help usage
            let hintsUsed = 0;
            let deleteOptionsUsed = 0;
            
            if (s.hintUsage) {
                hintsUsed = (s.hintUsage.quizHints || 0) + (s.hintUsage.challengeHints || 0);
            }
            
            if (s.deleteOptionUsage) {
                deleteOptionsUsed = s.deleteOptionUsage || 0;
            }

            const totalHelpUsed = hintsUsed + deleteOptionsUsed;
            const currentPoints = s.points || 0;

            // Create badges for access counts
            const accessBadgeClass = accessCount > 50 ? 'success' : accessCount > 20 ? 'primary' : 'warning';
            
            row.innerHTML = `
                <td style="animation: slideDown ${0.3 + (idx * 0.05)}s ease;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.5rem;">👤</span>
                        <div>
                            <span style="font-weight: 600; display: block;">${s.username}</span>
                            <span style="font-size: 0.75rem; color: #64748b;">${s.email || ''}</span>
                        </div>
                    </div>
                </td>
                <td style="animation: slideDown ${0.35 + (idx * 0.05)}s ease;">
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <span style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 0.5rem 1rem; border-radius: 0.75rem; font-weight: 600; color: white;">
                            المرحلة ${s.currentSession}/4
                        </span>
                        ${s.courseCompleted ? '<span style="font-size: 0.75rem; color: #22c55e;">✅ مكتمل</span>' : ''}
                    </div>
                </td>
                <td style="animation: slideDown ${0.4 + (idx * 0.05)}s ease;">
                    <span style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 0.5rem 1rem; border-radius: 0.75rem; font-weight: 700; color: white;">
                        💰 ${currentPoints}
                    </span>
                </td>
                <td style="animation: slideDown ${0.45 + (idx * 0.05)}s ease;">
                    <button class="btn btn-ghost btn-sm" onclick="showStudentDetails('${s.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); color: #60a5fa;">
                        📊 التفاصيل
                    </button>
                </td>
                <td style="animation: slideDown ${0.5 + (idx * 0.05)}s ease;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-ghost btn-sm" onclick="addPointsToStudent('${s.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.4); color: #22c55e;">
                            ➕ نقاط
                        </button>
                        <button class="btn btn-ghost danger btn-sm" onclick="deleteStudent('${s.id}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                            🗑️ حذف
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        console.log(`✅ Admin Dashboard loaded: ${students.length} students found.`);

        // Update summary stats
        document.getElementById('total-students').textContent = students.length;
        document.getElementById('completed-course-count').textContent = students.filter(s => s.courseCompleted).length;
        
        // Add new stats
        const totalAccessEl = document.getElementById('total-access-count');
        const totalRetriesEl = document.getElementById('total-retries-count');
        
        if (totalAccessEl) totalAccessEl.textContent = totalAccessCount;
        if (totalRetriesEl) totalRetriesEl.textContent = totalRetryCount;

        // Add search functionality
        const searchInput = document.getElementById('student-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const rows = tbody.querySelectorAll('tr');
                
                rows.forEach(row => {
                    const username = row.querySelector('td:first-child').textContent.toLowerCase();
                    if (username.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        }

    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        showFeedback('❌ خطأ في تحميل بيانات الإدارة', 'error');
    }
}

// Function to show student details popup
window.showStudentDetails = async function(studentId) {
    try {
        // Use cached list if available
        let students = window._adminStudentsList;
        
        if (!students) {
            const res = await fetch(`${API_URL}/admin/students`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch student data');
            students = await res.json();
            window._adminStudentsList = students;
        }
        
        const student = students.find(s => s.id === studentId);
        
        if (!student) {
            showFeedback(t('error_generic'), 'error');
            return;
        }
        
        const accessCount = student.accessCount || 0;
        const challengeRetries = student.challengeRetryCount || 0;
        const quizRetries = student.quizRetryCount || 0;
        
        let hintsUsed = 0;
        let deleteOptionsUsed = 0;
        
        // Get hints from quiz sessions
        if (student.quizSessions) {
            student.quizSessions.forEach(session => {
                if (session.hintsUsed) {
                    hintsUsed += session.hintsUsed;
                }
                if (session.deleteOptionsUsed) {
                    deleteOptionsUsed += session.deleteOptionsUsed;
                }
            });
        }
        
        // Get hints from challenge sessions
        if (student.challengeSessions) {
            student.challengeSessions.forEach(session => {
                if (session.hintUsed) {
                    hintsUsed += 1;
                }
                if (session.deleteOptionUsed) {
                    deleteOptionsUsed += 1;
                }
            });
        }
        
        // Fallback to old structure
        if (student.hintUsage) {
            const oldHints = (student.hintUsage.quizHints || 0) + (student.hintUsage.challengeHints || 0);
            hintsUsed = Math.max(hintsUsed, oldHints);
        }
        
        if (student.deleteOptionUsage) {
            const oldDeletes = student.deleteOptionUsage || 0;
            deleteOptionsUsed = Math.max(deleteOptionsUsed, oldDeletes);
        }
        
        const detailsHTML = `
            <div style="text-align: start; padding: 1rem;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="font-size: 3rem;">👤</span>
                    <div>
                        <h3 style="color: #fff; margin: 0; font-size: 1.3rem;">${student.username}</h3>
                        <p style="color: #94a3b8; margin: 0.25rem 0 0 0; font-size: 0.9rem;">${student.email || 'لا يوجد بريد'}</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 0.75rem; padding: 1rem; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🎯</div>
                        <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 0.25rem;">مرات الدخول</div>
                        <div style="color: #60a5fa; font-size: 1.3rem; font-weight: 700;">${accessCount}</div>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 0.75rem; padding: 1rem; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔄</div>
                        <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 0.25rem;">إعادة التحديات</div>
                        <div style="color: #fbbf24; font-size: 1.3rem; font-weight: 700;">${challengeRetries}</div>
                    </div>
                    <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 0.75rem; padding: 1rem; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📝</div>
                        <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 0.25rem;">إعادة الاختبارات</div>
                        <div style="color: #a78bfa; font-size: 1.3rem; font-weight: 700;">${quizRetries}</div>
                    </div>
                    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 0.75rem; padding: 1rem; text-align: center;">
                        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💰</div>
                        <div style="color: #64748b; font-size: 0.8rem; margin-bottom: 0.25rem;">النقاط الحالية</div>
                        <div style="color: #22c55e; font-size: 1.3rem; font-weight: 700;">${student.points || 0}</div>
                    </div>
                </div>

                <div style="background: rgba(15, 23, 42, 0.5); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; border: 1px solid rgba(255,255,255,0.05);">
                    <h4 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 1rem;">🛠️ إجراءات إدارية سريعة</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
                        <button onclick="resetStudentPoints('${student.id}')" class="btn btn-ghost danger btn-sm" style="flex: 1; min-width: 140px; padding: 0.6rem;">
                            ${t('btn_reset_points')}
                        </button>
                        <button onclick="unlockStudentSession('${student.id}')" class="btn btn-ghost btn-sm" style="flex: 1; min-width: 140px; padding: 0.6rem; border-color: #0ea5e9; color: #0ea5e9;">
                            ${t('btn_unlock_next')}
                        </button>
                        <button onclick="deleteStudent('${student.id}')" class="btn btn-ghost danger btn-sm" style="flex: 1; min-width: 140px; padding: 0.6rem; margin-top: 0.5rem; background: rgba(239, 68, 68, 0.1);">
                            🗑️ ${t('btn_delete')}
                        </button>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: center; margin-top: 1.5rem;">
                    <button onclick="closePopup()" style="padding: 0.75rem 2rem; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: none; border-radius: 0.75rem; color: white; font-weight: 600; cursor: pointer; font-size: 1rem;">
                        إغلاق
                    </button>
                </div>
            </div>
        `;
        
        showPopup('تفاصيل الطالب', detailsHTML, 'info', '📊');
        
    } catch (err) {
        console.error('🔥 Error showing student details:', err);
        showToast('❌ خطأ في تحميل تفاصيل الطالب', 'error');
    }
};

async function deleteStudent(id) {
    // confirmation logic ...
    const confirmed = await new Promise((resolve) => {
        const confirmMessage = `
            <div style="text-align: center; padding: 1rem;">
                <div style="font-size: 3.5rem; margin-bottom: 1rem;">🗑️</div>
                <h3 style="color: #f87171; margin-bottom: 1rem; font-size: 1.3rem;">${t('confirm_delete_title')}</h3>
                <p style="color: #e2e8f0; margin-bottom: 1.5rem; line-height: 1.6;">
                    ${t('confirm_delete_message')}
                    <br>
                    <span style="color: #94a3b8; font-size: 0.9rem;">${t('confirm_delete_warning')}</span>
                </p>
            </div>
        `;
        
        window._deleteConfirmResult = (result) => {
            closePopup();
            delete window._deleteConfirmResult;
            resolve(result);
        };
        
        showPopup('تأكيد الحذف', confirmMessage, 'error', '🗑️');
        
        // Use the new popup-actions container
        const popupActions = document.querySelector('.popup-actions');
        if (popupActions) {
            popupActions.innerHTML = `
                <button onclick="window._deleteConfirmResult(true)" class="popup-btn popup-btn-danger" style="min-width: 140px;">
                    🗑️ ${t('btn_confirm_yes')}
                </button>
                <button onclick="window._deleteConfirmResult(false)" class="popup-btn popup-btn-secondary" style="min-width: 140px;">
                    ❌ ${t('btn_cancel')}
                </button>
            `;
        }
    });
    
    if (!confirmed) return;

    try {
        console.log(`🗑️ Deleting student: ${id}`);
        const res = await fetch(`${API_URL}/admin/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (res.ok) {
            showToast(t('student_delete_success') || '✅ تم حذف الطالب بنجاح!', 'success');
            initAdminDashboard();
        } else {
            const errData = await res.json().catch(() => ({}));
            console.error('❌ Delete failed:', errData);
            showToast('❌ فشل في حذف الطالب: ' + (errData.message || 'خطأ غير متوقع'), 'error');
        }
    } catch (err) {
        console.error('🔥 Error deleting student:', err);
        showToast('❌ خطأ في الاتصال بالسيرفر', 'error');
    }
}

// Admin Action Handlers
window.resetStudentPoints = async function(id) {
    if (!confirm(t('reset_points_confirm') || 'هل أنت متأكد من تصفير نقاط هذا الطالب؟')) return;
    try {
        console.log(`🔄 Resetting points for student: ${id}`);
        const res = await fetch(`${API_URL}/admin/students/${id}/reset-points`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (res.ok) {
            showToast(t('points_reset_success') || '✅ تم تصفير النقاط بنجاح!', 'success');
            initAdminDashboard();
        } else {
            const errData = await res.json().catch(() => ({}));
            console.error('❌ Reset points failed:', errData);
            showToast('❌ فشل في تصفير النقاط: ' + (errData.message || 'خطأ في السيرفر'), 'error');
        }
    } catch (err) { 
        console.error('🔥 Error resetting points:', err);
        showToast('❌ خطأ في الاتصال بالسيرفر', 'error');
    }
}

window.addPointsToStudent = async function(id) {
    const points = prompt(t('add_points_prompt') || 'أدخل عدد النقاط المراد إضافتها:');
    if (points === null || points === '') return;
    
    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum <= 0) {
        showToast('❌ يرجى إدخال رقم صحيح موجب للنقاط', 'error');
        return;
    }
    
    try {
        console.log(`➕ Adding ${pointsNum} points to student: ${id}`);
        const res = await fetch(`${API_URL}/admin/students/${id}/add-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ points: pointsNum })
        });
        if (res.ok) {
            const data = await res.json();
            showToast(`✅ تم إضافة ${pointsNum} نقطة بنجاح!`, 'success');
            initAdminDashboard();
        } else {
            const errData = await res.json().catch(() => ({}));
            console.error('❌ Add points failed:', errData);
            showToast('❌ فشل في إضافة النقاط: ' + (errData.message || 'خطأ في السيرفر'), 'error');
        }
    } catch (err) {
        console.error('🔥 Error adding points:', err);
        showToast('❌ خطأ في الاتصال بالسيرفر', 'error');
    }
};

window.unlockStudentSession = async function(id) {
    if (!confirm(t('unlock_session_confirm') || 'هل أنت متأكد من فتح المستوى التالي للطالب؟')) return;
    try {
        console.log(`🔓 Unlocking session for student: ${id}`);
        const res = await fetch(`${API_URL}/admin/students/${id}/unlock-session`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if (res.ok) {
            showToast(t('session_unlock_success') || '✅ تم فتح المستوى بنجاح!', 'success');
            initAdminDashboard();
        } else {
            const errData = await res.json().catch(() => ({}));
            console.error('❌ Unlock session failed:', errData);
            showToast('❌ فشل في فتح المستوى: ' + (errData.message || 'خطأ غير معروف'), 'error');
        }
    } catch (err) { 
        console.error('🔥 Error unlocking session:', err);
        showToast('❌ خطأ في الاتصال بالسيرفر', 'error');
    }
};

// --- Specialized UI Interactions ---
function initEditorUI() {
    // Prevent multiple initializations
    if (window.editorUIInitialized) {
        console.log('Editor UI already initialized, skipping...');
        return;
    }
    window.editorUIInitialized = true;
    
    // Accordion Logic - Use event delegation to prevent multiple handlers
    document.addEventListener('click', (e) => {
        const header = e.target.closest('.tag-header');
        if (header) {
            e.preventDefault();
            e.stopPropagation();
            const cat = header.closest('.tag-cat');
            if (cat) {
                // Toggle expanded class
                const isExpanded = cat.classList.contains('expanded');
                
                // Close all other categories first
                document.querySelectorAll('.tag-cat.expanded').forEach(otherCat => {
                    if (otherCat !== cat) {
                        otherCat.classList.remove('expanded');
                        const otherGrid = otherCat.querySelector('.tag-grid');
                        if (otherGrid) otherGrid.style.display = 'none';
                    }
                });
                
                // Toggle current category
                cat.classList.toggle('expanded');
                
                // Force show/hide the grid immediately
                const grid = cat.querySelector('.tag-grid');
                if (grid) {
                    grid.style.display = cat.classList.contains('expanded') ? 'grid' : 'none';
                }
            }
        }
    });

    // ✨ دالة تصحيح الأخطاء الذكية
    function autoFixCode(code) {
        let fixed = code;

        // 1. تصحيح الأخطاء الإملائية الشائعة
        const commonMistakes = {
            'titel': 'title',
            'titl': 'title',
            'boddy': 'body',
            'hml': 'html',
            'htm': 'html',
            'headd': 'head',
            'parapraph': 'paragraph',
            'pargraph': 'p',
            'brk': 'br',
            'spna': 'span',
            'dvi': 'div',
            'buton': 'button',
            'inpt': 'input',
            'form': 'form',
            'img': 'img',
            'scr': 'src',
            'alt': 'alt',
            'href': 'href'
        };

        for (let mistake in commonMistakes) {
            const regex = new RegExp(`<${mistake}([>\\s/])`, 'gi');
            fixed = fixed.replace(regex, `<${commonMistakes[mistake]}$1`);
            const closeRegex = new RegExp(`</${mistake}>`, 'gi');
            fixed = fixed.replace(closeRegex, `</${commonMistakes[mistake]}>`);
        }

        // 2. إضافة DOCTYPE إذا كان مفقوداً
        if (!fixed.toLowerCase().includes('<!doctype')) {
            fixed = '<!DOCTYPE html>\n' + fixed;
        }

        // 3. التأكد من وجود html و head و body
        if (!fixed.toLowerCase().includes('<html')) {
            fixed = fixed.replace('<title', '<html>\n<head>\n<title');
            fixed = fixed.replace('</title>', '</title>\n</head>\n<body>\n').replace('</body>', '</body>\n</html>');
        }

        // 4. إضافة عناصر مفقودة
        if (!fixed.toLowerCase().includes('<head')) {
            fixed = fixed.replace(/<html[^>]*>/, '<html>\n<head>\n<title>عنوان الصفحة</title>\n</head>\n');
        }

        if (!fixed.toLowerCase().includes('<body')) {
            fixed = fixed.replace(/<\/head>/, '</head>\n<body>');
        }

        // 5. إغلاق العناصر التي لم تُغلق
        const openTags = ['html', 'head', 'body', 'p', 'div', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        openTags.forEach(tag => {
            const regex = new RegExp(`<${tag}([>\\s])`, 'gi');
            if (fixed.match(regex)) {
                const closeTag = `</${tag}>`;
                if (!fixed.toLowerCase().includes(closeTag)) {
                    fixed += `\n${closeTag}`;
                }
            }
        });

        return fixed;
    }

    // ⚙️ دالة ربط الأحداث (Event Binding) بشكل آمن
    const setupButtonHandler = () => {
        const btnParseCode = document.getElementById('btn-parse-code');
        const mobileToggle = document.getElementById('mobile-sidebar-toggle');
        const sidebar = document.getElementById('tag-sidebar');

        // الربط لزر التحكم في القائمة (الجوال)
        if (mobileToggle && sidebar) {
            console.log('✅ Found mobile-sidebar-toggle, attaching handler...');
            mobileToggle.onclick = () => {
                sidebar.classList.toggle('active');
                console.log('📱 Sidebar toggled. Active:', sidebar.classList.contains('active'));
                const icon = mobileToggle.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = sidebar.classList.contains('active') ? '🔽' : '🔼';
                }
            };
        }

        if (btnParseCode) {
            console.log('✅ Found btn-parse-code, attaching handler...');
            btnParseCode.onclick = () => {
                const codeInput = document.getElementById('html-code-input');
                const code = codeInput ? codeInput.value : '';
                
                console.log('📝 Parsing attempt. Input length:', code.length);

                if (!code || !code.trim()) {
                    showToast('⚠️ الرجاء كتابة الكود أولاً في المربع النصي', 'warning');
                    return;
                }

                // تقسيم الكود إلى وسوم ونصوص
                // regex matches tags: <...>
                const parts = code.split(/(<[^>]+>)/g).filter(p => p && p.trim() !== '');
                
                console.log('🔍 Found parts:', parts.length, parts);

                // إضافة العناصر للملف الحالي
                parts.forEach(part => {
                    state.builderCode.push(part.trim());
                });

                renderEditor();
                updatePreview();
                saveBuilderCode();
                
                if (codeInput) codeInput.value = '';
                showToast(t('code_parsed_success') || '✅ تم إضافة الكود بنجاح!', 'success');
            };
            return true;
        }
        return false;
    };
    
    // محاولة فورية
    if (!setupButtonHandler()) {
        // محاولة عند اكتمال الـ DOM
        document.addEventListener('DOMContentLoaded', setupButtonHandler);
        // محاولة بديلة بعد ثانية للتأكد
        setTimeout(setupButtonHandler, 1000);
    }

// 📋 نسخ الكود المولد
window.copyGeneratedCode = function() {
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) return;
    
    // محاكاة استخراج الكود من الـ iframe أو إعادة بنائه
    const generatedHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Code</title>
</head>
<body>
    ${state.builderCode.join('\n    ')}
</body>
</html>`;

    navigator.clipboard.writeText(generatedHtml).then(() => {
        showToast('📋 تم نسخ الكود بالكامل إلى الحافظة!', 'success');
    }).catch(err => {
        showToast('❌ فشل نسخ الكود', 'error');
    });
};

// 💾 تحميل الكود كملف HTML
window.downloadGeneratedHTML = function() {
    const generatedHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مشروعي - HTML Quiz</title>
    <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
    </style>
</head>
<body>
    ${state.builderCode.join('\n    ')}
</body>
</html>`;

    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-code.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('💾 بدأ تحميل ملف HTML بنجاح!', 'success');
};

// دالة إضافة الكود في المكان المحدد
window.insertCodeAtPosition = function(position) {
    const codeInput = window.tempCode;
    if (!codeInput) return;
    
    const lines = codeInput.split('\n').filter(line => line.trim());
    
    switch(position) {
        case 'start':
            state.builderCode = [...lines, ...state.builderCode];
            showFeedback('✅ تم إضافة الكود في البداية!', 'success');
            break;
        case 'end':
            state.builderCode = [...state.builderCode, ...lines];
            showFeedback('✅ تم إضافة الكود في النهاية!', 'success');
            break;
        case 'replace':
            state.builderCode = lines;
            showFeedback('✅ تم استبدال الكود!', 'success');
            break;
    }
    
    renderEditor();
    document.getElementById('html-code-input').value = '';
    closePopup();
    window.tempCode = null;
};

    // ➕ زر إضافة سطر فارغ
    const btnAddEmpty = document.getElementById('btn-add-empty');
    if (btnAddEmpty) {
        btnAddEmpty.onclick = () => {
            state.builderCode.push(''); // إضافة سطر فارغ
            renderEditor();
            showFeedback('✅ تم إضافة سطر فارغ', 'success');
        };
    }

    // Smart Help - Magic Repair Logic
    const btnMagicRepair = document.getElementById('btn-magic-repair');
    if (btnMagicRepair) {
        btnMagicRepair.onclick = async () => {
            if (state.builderCode.length === 0) {
                showFeedback(t('error_empty_code'), 'warning');
                return;
            }
            
            const hintId = `challenge_${state.currentChallenge.sessionId}_c${state.currentChallenge.index}_repair`;
            const success = await deductPoints(20, 'magic_repair', hintId);
            if (!success) return;

            const currentCode = state.builderCode.join('\n');
            const fixedCode = enhanceAutoFixCode(currentCode);
            state.builderCode = fixedCode.split('\n').filter(l => l.trim());
            
            renderEditor();
            showFeedback(t('magic_repair_success') || '✅ تم إصلاح الكود تلقائياً بأفضل طريقة ممكنة', 'success');
        };
    }

    // Hint Logic
    const btnShowHint = document.getElementById('btn-show-hint');
    if (btnShowHint) {
        btnShowHint.onclick = async () => {
            const hintId = `challenge_${state.currentChallenge.sessionId}_c${state.currentChallenge.index}_hint`;
            const success = await deductPoints(10, 'challenge_hint', hintId);
            if (!success) return;

            // Save hint state for UI persistence if needed
            localStorage.setItem('hintPurchased', 'true');
            localStorage.setItem('hintText', state.currentChallenge.hint);
            localStorage.setItem('hintChallengeId', state.currentChallenge.id ? state.currentChallenge.id.toString() : '');

            const hintContainer = document.getElementById('challenge-hint-container');
            if (hintContainer) {
                document.getElementById('challenge-hint-text').textContent = state.currentChallenge.hint;
                hintContainer.style.display = 'block';
                hintContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        };
    }



}

function updatePointsUI() {
    const el = document.getElementById('user-points');
    if (el) el.textContent = state.user.points || 0;
}

function showPopup(title, message, type = 'success', icon = '🎉') {
    const overlay = document.getElementById('popup-overlay');
    const popupIcon = document.querySelector('.popup-icon');
    const popupText = document.querySelector('.popup-text');
    const popupContent = document.querySelector('.popup-content');
    const popupActions = document.querySelector('.popup-actions');
    
    // Set content
    popupIcon.textContent = icon;
    popupText.textContent = title;
    popupContent.innerHTML = message;
    
    // Clear actions by default
    if (popupActions) popupActions.innerHTML = '';
    
    // Set type and activate
    overlay.className = `popup-overlay ${type} active`;
}

function closePopup() {
    const overlay = document.getElementById('popup-overlay');
    overlay.classList.remove('active');
}

function confirmDelete() {
    if (window.currentDeleteIndex !== undefined) {
        state.builderCode.splice(window.currentDeleteIndex, 1);
        renderEditor();
        updatePreview();
        saveBuilderCode();
        window.currentDeleteIndex = undefined;
    }
    closePopup();
}

function showFeedback(msg, type, persistent = false) {
    // Only use popups for critical success/error messages
    const criticalActions = ['magic_repair_success', 'quiz_completed', 'login_success', 'reg_success'];
    
    // Check if the message matches a critical translation key or is just a general error
    if (type === 'error' || persistent) {
        let title = type === 'error' ? 'خطأ!' : 'تنبيه!';
        let icon = type === 'error' ? '❌' : '⚠️';
        showPopup(title, msg, type, icon);
    } else {
        // Use toast for general feedback to reduce popups
        showToast(msg, type);
    }
}

function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 2rem;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            pointer-events: none;
            width: 90%;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const colors = {
        success: { bg: 'linear-gradient(135deg, #10b981, #059669)', border: '#059669' },
        error: { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', border: '#dc2626' },
        warning: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#d97706' },
        info: { bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: '#1d4ed8' }
    };
    
    const theme = colors[type] || colors.info;
    
    toast.style.cssText = `
        background: ${theme.bg};
        border: 1px solid ${theme.border};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 1rem;
        font-weight: 700;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// UI Init is handled in the main DOMContentLoaded below

document.getElementById('btn-admin-logout').onclick = () => {
    logout();
};

document.getElementById('btn-logout').onclick = () => {
    logout();
};

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastScreen');
    localStorage.removeItem('currentSession');
    localStorage.removeItem('currentChallengeId');
    sessionStorage.removeItem('lastScreen');
    
    state.token = null;
    state.user = null;
    state.currentSession = null;
    state.currentChallenge = null;
    
    // Clear and reset auth form to register mode
    resetAuthForm('register');
    
    showScreen('auth');
}

// --- Specialized UI Interactions ---
// Consolidated UI Initialization replaced by shared helper

// Copy Number Function
function copyNumber() {
    const number = '01273445173';
    navigator.clipboard.writeText(number).then(() => {
        // Show feedback
        const numberValue = document.querySelector('.number-value');
        if (numberValue) {
            const originalText = numberValue.textContent;
            numberValue.textContent = 'تم النسخ!';
            numberValue.style.color = '#10b981';
            
            setTimeout(() => {
                numberValue.textContent = originalText;
                numberValue.style.color = '#25d366';
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy number:', err);
    });
}
