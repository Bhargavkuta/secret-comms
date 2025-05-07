// Configuration
const POLL_INTERVAL = 2000; // 2 seconds
const USER_INACTIVITY_TIMEOUT = 30000; // 30 seconds
const MAX_MESSAGES = 100;
let lastMessageId = 0;
let lastActivity = Date.now();

// DOM Elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const statusElement = document.getElementById('status');
const usersList = document.getElementById('users-list');

// Get username from localStorage
const username = localStorage.getItem('username');
const authToken = localStorage.getItem('authToken');

// Initialize chat
document.addEventListener('DOMContentLoaded', () => {
    if (!authToken || !username) {
        window.location.href = 'login.html';
        return;
    }
    
    statusElement.textContent = 'Connected';
    
    // Load previous messages
    fetchMessages();
    fetchActiveUsers();
    
    // Set up polling for new messages and users
    setInterval(() => {
        fetchMessages();
        fetchActiveUsers();
    }, POLL_INTERVAL);
    
    // Set up event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Track user activity
    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('keypress', updateActivity);
    
    // Send initial activity ping
    updateActivity();
});

// Update last activity time
function updateActivity() {
    lastActivity = Date.now();
    sendActivityPing();
}

// Send activity ping to server
async function sendActivityPing() {
    try {
        await fetch('/api/auth/activity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ username })
        });
    } catch (error) {
        console.error('Error sending activity ping:', error);
    }
}

// Fetch messages from the server
async function fetchMessages() {
    try {
        const response = await fetch(`/api/messages?since=${lastMessageId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
            }
            throw new Error('Failed to fetch messages');
        }
        
        const newMessages = await response.json();
        
        if (newMessages.length > 0) {
            newMessages.forEach(message => {
                if (message.id > lastMessageId) {
                    addMessageToChat(message);
                    lastMessageId = message.id;
                }
            });
            
            // Keep only the most recent messages
            const allMessages = Array.from(messagesContainer.children);
            if (allMessages.length > MAX_MESSAGES) {
                const toRemove = allMessages.length - MAX_MESSAGES;
                for (let i = 0; i < toRemove; i++) {
                    messagesContainer.removeChild(allMessages[i]);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        statusElement.textContent = 'Connection error - retrying...';
    }
}

// Fetch active users from the server
async function fetchActiveUsers() {
    try {
        const response = await fetch('/api/auth/users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            updateUsersList(users);
        }
    } catch (error) {
        console.error('Error fetching active users:', error);
    }
}

// Update the users list in the UI
function updateUsersList(users) {
    if (!usersList) return;
    
    usersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username + (user.username === ADMIN_USERNAME ? ' (Admin)' : '');
        usersList.appendChild(li);
    });
}

// Send a new message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                username,
                text: text,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = 'login.html';
            }
            throw new Error('Failed to send message');
        }
        
        messageInput.value = '';
        updateActivity();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
}

// Add a message to the chat UI
function addMessageToChat(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (message.username === username) {
        messageElement.classList.add('user-message');
    } else {
        messageElement.classList.add('other-message');
    }
    
    const time = new Date(message.timestamp);
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-header">${escapeHtml(message.username)}</div>
        <div class="message-text">${escapeHtml(message.text)}</div>
        <div class="message-time">${timeString}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Basic HTML escaping for security
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}