
const OAuthConfig = {
    google: {
        clientId: '842844782694-s42hm8s16le3tvnkpptla6bhjdnqn4f8.apps.googleusercontent.com',
        scope: 'profile email',
        redirectUri: window.location.origin + '/dashboard.html'
    }
};


const StorageManager = {
    // In-memory storage
    memoryStorage: {},

    setUser: function(userData) {
        try {
            this.memoryStorage.parkingUser = userData;
            // Also try localStorage as fallback (won't work in artifacts but useful in regular deployment)
            try {
                localStorage.setItem('parkingUser', JSON.stringify(userData));
            } catch (e) {
                // localStorage not available, continue with memory storage
            }
            console.log('User data stored:', userData);
            return true;
        } catch (error) {
            console.error('Error storing user data:', error);
            return false;
        }
    },

    getUser: function() {
        // Try memory storage first
        if (this.memoryStorage.parkingUser) {
            return this.memoryStorage.parkingUser;
        }
        
        // Try localStorage as fallback
        try {
            const stored = localStorage.getItem('parkingUser');
            if (stored) {
                const userData = JSON.parse(stored);
                this.memoryStorage.parkingUser = userData;
                return userData;
            }
        } catch (e) {
            
        }
        
        return null;
    },

    clearUser: function() {
        delete this.memoryStorage.parkingUser;
        try {
            localStorage.removeItem('parkingUser');
        } catch (e) {
           
        }
    },

    isAuthenticated: function() {
        return this.getUser() !== null;
    }
};

/**
 * Google OAuth Handler
 */
const GoogleOAuth = {
    isInitialized: false,

    /**
     * Initialize Google Sign-In
     */
    init: function() {
        if (typeof google === 'undefined' || !google.accounts) {
            console.error('Google API not loaded');
            return false;
        }

        try {
            google.accounts.id.initialize({
                client_id: OAuthConfig.google.clientId,
                callback: this.handleCallback.bind(this),
                auto_select: false,
                cancel_on_tap_outside: true,
                ux_mode: 'popup'
            });

            this.isInitialized = true;
            console.log('Google OAuth initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Google OAuth:', error);
            return false;
        }
    },

    /**
     * Render Google Sign-In Button
     * @param {string} elementId - ID of the container element
     * @param {Object} options - Button customization options
     */
    renderButton: function(elementId, options = {}) {
        if (!this.isInitialized) {
            console.error('Google OAuth not initialized');
            return false;
        }

        const defaultOptions = {
            theme: 'outline',
            size: 'large',
            width: 350,
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left'
        };

        const buttonOptions = { ...defaultOptions, ...options };

        try {
            const element = document.getElementById(elementId);
            if (element) {
                google.accounts.id.renderButton(element, buttonOptions);
                return true;
            } else {
                console.error('Element not found:', elementId);
                return false;
            }
        } catch (error) {
            console.error('Error rendering Google button:', error);
            return false;
        }
    },

    /**
     * Trigger Google Sign-In Popup
     */
    signIn: function() {
        if (!this.isInitialized) {
            console.error('Google OAuth not initialized');
            return;
        }
        google.accounts.id.prompt();
    },

    /**
     * Enable One Tap Sign-In
     */
    enableOneTap: function() {
        if (!this.isInitialized) {
            console.error('Google OAuth not initialized');
            return;
        }
        google.accounts.id.prompt();
    },

    /**
     * Handle OAuth Callback
     * @param {Object} response - Google OAuth response
     */
    handleCallback: function(response) {
        try {
            const userInfo = this.parseJWT(response.credential);
            
            if (!userInfo) {
                throw new Error('Failed to parse user information');
            }

            const userData = {
                id: userInfo.sub,
                name: userInfo.name || userInfo.given_name,
                email: userInfo.email,
                picture: userInfo.picture,
                provider: 'google',
                loginTime: new Date().toISOString(),
                emailVerified: userInfo.email_verified
            };

            // Store user data
            StorageManager.setUser(userData);

            // Trigger custom event
            this.triggerAuthEvent('google-login-success', userData);

            // Redirect to dashboard
            this.redirectToDashboard();

        } catch (error) {
            console.error('Google Sign-In Error:', error);
            this.triggerAuthEvent('google-login-error', { error: error.message });
        }
    },

    /**
     * Parse JWT Token
     * @param {string} token - JWT token
     * @returns {Object|null} Parsed token data
     */
    parseJWT: function(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing JWT:', error);
            return null;
        }
    },

    /**
     * Trigger custom authentication event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    triggerAuthEvent: function(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    },

    /**
     * Redirect to dashboard
     */
    redirectToDashboard: function() {
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
    },

    /**
     * Sign out from Google
     */
    signOut: function() {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.disableAutoSelect();
        }
        StorageManager.clearUser();
        this.triggerAuthEvent('google-logout-success', {});
    }
};

/**
 * Regular Email/Password Authentication
 */
const EmailAuth = {
    /**
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User data
     */
    signIn: async function(email, password) {
        try {

            // Mock authentication for demo
            if (email && password) {
                const userData = {
                    id: Date.now().toString(),
                    name: email.split('@')[0],
                    email: email,
                    provider: 'email',
                    loginTime: new Date().toISOString()
                };

                StorageManager.setUser(userData);
                return { success: true, user: userData };
            }

            throw new Error('Invalid credentials');
        } catch (error) {
            console.error('Email sign-in error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Sign up with email and password
     * @param {string} name - User name
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} User data
     */
    signUp: async function(name, email, password) {
        try {
            
            const userData = {
                id: Date.now().toString(),
                name: name,
                email: email,
                provider: 'email',
                loginTime: new Date().toISOString()
            };

            StorageManager.setUser(userData);
            return { success: true, user: userData };
        } catch (error) {
            console.error('Email sign-up error:', error);
            return { success: false, error: error.message };
        }
    }
};

/**
 * Main Authentication Manager
 */
const AuthManager = {
    /**
     * Initialize all OAuth providers
     */
    init: function() {
        // Initialize Google OAuth
        if (typeof google !== 'undefined') {
            GoogleOAuth.init();
        } else {
            // Wait for Google API to load
            window.addEventListener('load', () => {
                setTimeout(() => {
                    if (typeof google !== 'undefined') {
                        GoogleOAuth.init();
                    }
                }, 1000);
            });
        }
    },

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated: function() {
        return StorageManager.isAuthenticated();
    },

    /**
     * Get current user
     * @returns {Object|null}
     */
    getCurrentUser: function() {
        return StorageManager.getUser();
    },

    /**
     * Sign out from all providers
     */
    signOut: function() {
        GoogleOAuth.signOut();
        StorageManager.clearUser();
        window.location.href = 'index.html';
    },

    /**
     * Protect route (redirect to login if not authenticated)
     */
    protectRoute: function() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AuthManager,
        GoogleOAuth,
        EmailAuth,
        StorageManager,
        OAuthConfig
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});

// Make available globally
window.AuthManager = AuthManager;
window.GoogleOAuth = GoogleOAuth;
window.EmailAuth = EmailAuth;
window.StorageManager = StorageManager;