// In-memory user activity tracker
let activeUsers = {};

// Configuration
const ADMIN_USERNAME = 'bhargavkuta';
const CORRECT_PASSWORD = 'mysecretpassword'; // Must match the one in auth.js

export default async function handler(req, res) {
    if (req.method === 'POST' && req.url.endsWith('/login')) {
        // Handle login
        const { username, password } = req.body;
        
        if (password === CORRECT_PASSWORD) {
            // Generate a simple token
            const token = btoa(JSON.stringify({
                username,
                password: CORRECT_PASSWORD,
                exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 1 week expiration
            }));
            
            return res.status(200).json({ token });
        } else {
            return res.status(401).json({ error: 'Invalid password' });
        }
    } else if (req.method === 'GET' && req.url.endsWith('/verify')) {
        // Verify token
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        try {
            const data = JSON.parse(atob(token));
            if (data.password === CORRECT_PASSWORD && data.exp > Date.now()) {
                return res.status(200).json({ valid: true });
            } else {
                return res.status(401).json({ error: 'Invalid token' });
            }
        } catch {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } else if (req.method === 'POST' && req.url.endsWith('/activity')) {
        // Update user activity
        const { username } = req.body;
        activeUsers[username] = Date.now();
        return res.status(200).json({ success: true });
    } else if (req.method === 'GET' && req.url.endsWith('/users')) {
        // Get active users
        const now = Date.now();
        // Remove inactive users (no activity for 30 seconds)
        Object.keys(activeUsers).forEach(username => {
            if (now - activeUsers[username] > 30000) {
                delete activeUsers[username];
            }
        });
        
        const users = Object.keys(activeUsers).map(username => ({
            username,
            isAdmin: username === ADMIN_USERNAME
        }));
        
        return res.status(200).json(users);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}