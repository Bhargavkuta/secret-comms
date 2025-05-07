// In-memory user activity tracker
let activeUsers = {};

// Configuration
const ADMIN_USERNAME = 'bhargavkuta';
const CORRECT_PASSWORD = 'mysecretpassword'; // Must match the one in auth.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST' && req.url.endsWith('/login')) {
      // Handle login
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      
      if (password === CORRECT_PASSWORD) {
        // Generate a simple token
        const token = btoa(JSON.stringify({
          username,
          password: CORRECT_PASSWORD,
          exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 1 week expiration
        }));
        
        // Add user to active users
        activeUsers[username] = Date.now();
        
        return res.status(200).json({ 
          success: true,
          token,
          username
        });
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
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
