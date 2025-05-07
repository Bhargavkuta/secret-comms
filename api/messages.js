// Simple in-memory store for messages (will reset when serverless function spins down)
let messages = [];
let nextId = 1;

// Configuration
const ADMIN_USERNAME = 'bhargavkuta';

export default async function handler(req, res) {
    // Check authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const data = JSON.parse(atob(token));
        if (data.password !== 'mysecretpassword' || data.exp <= Date.now()) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    } catch {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
        // Get messages since a specific ID
        const sinceId = parseInt(req.query.since) || 0;
        const filteredMessages = messages.filter(msg => msg.id > sinceId);
        res.status(200).json(filteredMessages);
    } else if (req.method === 'POST') {
        // Add a new message
        const { username, text, timestamp } = req.body;
        
        if (!username || !text || !timestamp) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const newMessage = {
            id: nextId++,
            username,
            text,
            timestamp
        };
        
        messages.push(newMessage);
        
        // Keep only the last 100 messages to prevent memory issues
        if (messages.length > 100) {
            messages = messages.slice(-100);
            nextId = messages[messages.length - 1].id + 1;
        }
        
        res.status(201).json(newMessage);
    } else if (req.method === 'DELETE') {
        // Clear all messages (admin only)
        const data = JSON.parse(atob(token));
        if (data.username !== ADMIN_USERNAME) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        messages = [];
        nextId = 1;
        res.status(200).json({ success: true });
    } else {
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}