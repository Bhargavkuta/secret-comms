// Configuration
const ADMIN_USERNAME = 'bhargavkuta';
const CORRECT_PASSWORD = 'mysecretpassword'; // Change this!

// DOM Elements
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const logoutButton = document.getElementById('logout-button');
const currentUsernameElement = document.getElementById('current-username');
const clearChatButton = document.getElementById('clear-chat-button');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        checkAuth();
    }
});

// Login form submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('username', username);
                window.location.href = 'index.html';
            } else {
                const data = await response.json();
                showError(data.error || 'Login failed');
            }
        } catch (error) {
            showError('Network error. Please try again.');
        }
    });
}

// Logout button
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    });
}

// Clear chat button (admin only)
if (clearChatButton) {
    clearChatButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all messages?')) {
            try {
                const authToken = localStorage.getItem('authToken');
                const response = await fetch('/api/messages', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                if (response.ok) {
                    document.getElementById('messages').innerHTML = '';
                } else {
                    alert('Failed to clear messages');
                }
            } catch (error) {
                alert('Error clearing messages');
            }
        }
    });
}

// Check authentication status
async function checkAuth() {
    const authToken = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    
    if (!authToken || !username) {
        redirectToLogin();
        return;
    }
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            redirectToLogin();
        } else {
            // Show current username
            if (currentUsernameElement) {
                currentUsernameElement.textContent = username;
            }
            
            // Show admin controls if admin
            if (username === ADMIN_USERNAME) {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = 'inline-block';
                });
            }
        }
    } catch (error) {
        redirectToLogin();
    }
}

function redirectToLogin() {
    if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
    }
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        setTimeout(() => {
            errorMessage.textContent = '';
        }, 3000);
    }
}

// Generate token
function generateToken(username) {
    return btoa(JSON.stringify({
        username,
        password: CORRECT_PASSWORD,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 1 week expiration
    }));
}

// Verify token
function verifyToken(token) {
    try {
        const data = JSON.parse(atob(token));
        return data.password === CORRECT_PASSWORD && data.exp > Date.now();
    } catch {
        return false;
    }
}