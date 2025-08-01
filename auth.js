// Authentication and User Management System
// Uses localStorage for data persistence in pure frontend implementation

// User data structure and management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
        this.initializeAuth();
    }

    initializeAuth() {
        // Load current user session
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
            } catch (error) {
                console.error('Error loading user session:', error);
                localStorage.removeItem('currentUser');
            }
        }
    }

    loadUsers() {
        try {
            return JSON.parse(localStorage.getItem('users')) || [];
        } catch (error) {
            console.error('Error loading users:', error);
            return [];
        }
    }

    saveUsers() {
        try {
            localStorage.setItem('users', JSON.stringify(this.users));
        } catch (error) {
            console.error('Error saving users:', error);
            throw new Error('Failed to save user data');
        }
    }

    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Password validation
    isValidPassword(password) {
        // At least 6 characters
        return password && password.length >= 6;
    }

    // Check if email already exists
    emailExists(email) {
        return this.users.some(user => user.email.toLowerCase() === email.toLowerCase());
    }

    // Generate user ID
    generateUserId() {
        return Date.now().toString(36);
    }

    // Register new user
    register(userData) {
        const { name, email, password } = userData;

        // Validation
        if (!name || name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters long');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!this.isValidPassword(password)) {
            throw new Error('Password must be at least 6 characters long');
        }

        if (this.emailExists(email)) {
            throw new Error('An account with this email already exists');
        }

        // Create new user
        const newUser = {
            id: this.generateUserId(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: this.hashPassword(password), // Simple hash for demo
            registrationDate: Date.now(),
            lastLogin: null,
            preferences: {
                theme: 'dark',
                defaultLanguage: 'en-US',
                autoSave: true
            }
        };

        // Add to users array
        this.users.push(newUser);
        this.saveUsers();

        // Log user in automatically
        this.currentUser = { ...newUser };
        delete this.currentUser.password; // Don't store password in session
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        return this.currentUser;
    }

    // Simple password hashing (for demo purposes)
    hashPassword(password) {
        // In a real application, use proper hashing like bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    // Login user
    login(email, password) {
        if (!this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!password) {
            throw new Error('Please enter your password');
        }

        // Find user
        const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
            throw new Error('No account found with this email address');
        }

        // Check password
        const hashedPassword = this.hashPassword(password);
        if (user.password !== hashedPassword) {
            throw new Error('Incorrect password');
        }

        // Update last login
        user.lastLogin = Date.now();
        this.saveUsers();

        // Set current user (without password)
        this.currentUser = { ...user };
        delete this.currentUser.password;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        return this.currentUser;
    }

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        
        // Clear any user-specific data from session
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('temp_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Redirect to login page
        window.location.href = 'login.html';
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Update user profile
    updateProfile(userData) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        const { name, email } = userData;

        // Validation
        if (!name || name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters long');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        // Check if email is taken by another user
        const existingUser = this.users.find(u => 
            u.email.toLowerCase() === email.toLowerCase() && 
            u.id !== this.currentUser.id
        );

        if (existingUser) {
            throw new Error('This email is already taken by another account');
        }

        // Find and update user in users array
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Update user data
        this.users[userIndex].name = name.trim();
        this.users[userIndex].email = email.toLowerCase().trim();
        this.saveUsers();

        // Update current user session
        this.currentUser.name = name.trim();
        this.currentUser.email = email.toLowerCase().trim();
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        return this.currentUser;
    }

    // Update user preferences
    updatePreferences(preferences) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Update preferences
        this.users[userIndex].preferences = {
            ...this.users[userIndex].preferences,
            ...preferences
        };
        this.saveUsers();

        // Update current user session
        this.currentUser.preferences = this.users[userIndex].preferences;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        return this.currentUser.preferences;
    }

    // Get user statistics
    getUserStats() {
        if (!this.currentUser) {
            return null;
        }

        const conversions = JSON.parse(localStorage.getItem(`conversions_${this.currentUser.email}`)) || [];
        
        return {
            totalConversions: conversions.length,
            speechToText: conversions.filter(c => c.type === 'stt').length,
            textToSpeech: conversions.filter(c => c.type === 'tts').length,
            memberSince: new Date(this.currentUser.registrationDate).toLocaleDateString(),
            lastLogin: this.currentUser.lastLogin ? new Date(this.currentUser.lastLogin).toLocaleDateString() : 'Never'
        };
    }

    // Delete user account
    deleteAccount() {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        // Remove user from users array
        this.users = this.users.filter(u => u.id !== this.currentUser.id);
        this.saveUsers();

        // Remove user's conversions
        localStorage.removeItem(`conversions_${this.currentUser.email}`);

        // Logout
        this.logout();
    }

    // Password change
    changePassword(currentPassword, newPassword) {
        if (!this.currentUser) {
            throw new Error('No user logged in');
        }

        if (!this.isValidPassword(newPassword)) {
            throw new Error('New password must be at least 6 characters long');
        }

        // Find user
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Verify current password
        const hashedCurrentPassword = this.hashPassword(currentPassword);
        if (this.users[userIndex].password !== hashedCurrentPassword) {
            throw new Error('Current password is incorrect');
        }

        // Update password
        this.users[userIndex].password = this.hashPassword(newPassword);
        this.saveUsers();

        return true;
    }

    // Get all users (admin function - for demo purposes)
    getAllUsers() {
        return this.users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            registrationDate: user.registrationDate,
            lastLogin: user.lastLogin
        }));
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Global authentication functions
function register(userData) {
    try {
        return authManager.register(userData);
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

function login(email, password) {
    try {
        return authManager.login(email, password);
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

function logout() {
    authManager.logout();
}

function getCurrentUser() {
    return authManager.getCurrentUser();
}

function isAuthenticated() {
    return authManager.isAuthenticated();
}

function updateProfile(userData) {
    try {
        return authManager.updateProfile(userData);
    } catch (error) {
        console.error('Profile update error:', error);
        throw error;
    }
}

function updatePreferences(preferences) {
    try {
        return authManager.updatePreferences(preferences);
    } catch (error) {
        console.error('Preferences update error:', error);
        throw error;
    }
}

function getUserStats() {
    return authManager.getUserStats();
}

function changePassword(currentPassword, newPassword) {
    try {
        return authManager.changePassword(currentPassword, newPassword);
    } catch (error) {
        console.error('Password change error:', error);
        throw error;
    }
}

function deleteAccount() {
    try {
        return authManager.deleteAccount();
    } catch (error) {
        console.error('Account deletion error:', error);
        throw error;
    }
}

// Authentication check for protected pages
function checkAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Form handling for login page
document.addEventListener('DOMContentLoaded', function() {
    // Login form handling
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');

            // Clear previous messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';

            try {
                const user = login(email, password);
                successMessage.textContent = 'Login successful! Redirecting...';
                successMessage.style.display = 'block';
                
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            } catch (error) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
        });
    }

    // Signup form handling
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');

            // Clear previous messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';

            try {
                const user = register({ name, email, password });
                successMessage.textContent = 'Account created successfully! Redirecting...';
                successMessage.style.display = 'block';
                
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            } catch (error) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
        });
    }

    // Form switching (login/signup)
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    const loginFormElement = document.querySelector('#loginForm');
    const loginContainer = loginFormElement ? loginFormElement.closest('.auth-form-container') : null;
    const signupContainer = document.getElementById('signupContainer');

    if (switchToSignup) {
        switchToSignup.addEventListener('click', function() {
            loginContainer.style.display = 'none';
            signupContainer.style.display = 'block';
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', function() {
            signupContainer.style.display = 'none';
            loginContainer.style.display = 'block';
        });
    }

    // Auto-redirect if already logged in
    if (window.location.pathname.includes('login.html') && isAuthenticated()) {
        window.location.href = 'home.html';
    }
});

// Session management
function refreshSession() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        // Update last activity timestamp
        const updatedUser = { ...currentUser, lastActivity: Date.now() };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
}

// Refresh session every 5 minutes
setInterval(refreshSession, 5 * 60 * 1000);

// Check for session timeout (24 hours)
function checkSessionTimeout() {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.lastActivity) {
        const now = Date.now();
        const lastActivity = currentUser.lastActivity;
        const timeout = 24 * 60 * 60 * 1000; // 24 hours

        if (now - lastActivity > timeout) {
            logout();
        }
    }
}

// Check session timeout on page load and every hour
document.addEventListener('DOMContentLoaded', checkSessionTimeout);
setInterval(checkSessionTimeout, 60 * 60 * 1000);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        register,
        login,
        logout,
        getCurrentUser,
        isAuthenticated,
        updateProfile,
        updatePreferences,
        getUserStats,
        changePassword,
        deleteAccount,
        checkAuth
    };
}
