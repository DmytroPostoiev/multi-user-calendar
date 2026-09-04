// api/index.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors({
  origin: ['https://multi-user-calendar.vercel.app', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email bereits registriert' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hash, name]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || '171120', { expiresIn: '7d' });
    
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    
    const result = await pool.query('SELECT id, email, password_hash, name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }
    
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || '171120', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Events
app.get('/api/events', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Nicht autorisiert' });
    
    const jwt = require('jsonwebtoken');
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '171120');
    
    const result = await pool.query(
      `SELECT e.*, u.name as user_name FROM events e JOIN users u ON e.user_id = u.id WHERE e.user_id = $1 OR e.visibility = 'public' ORDER BY e.start_time ASC`,
      [decoded.userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Event
app.post('/api/events', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Nicht autorisiert' });
    
    const jwt = require('jsonwebtoken');
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '171120');
    
    const { title, description, start, end, color, visibility } = req.body;
    const result = await pool.query(
      `INSERT INTO events (user_id, title, description, start_time, end_time, color, visibility) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [decoded.userId, title, description, start, end, color || '#4a90e2', visibility || 'private']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Nicht autorisiert' });
    
    const jwt = require('jsonwebtoken');
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '171120');
    const { id } = req.params;
    
    const check = await pool.query('SELECT user_id FROM events WHERE id = $1', [id]);
    if (check.rows[0]?.user_id !== decoded.userId) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.json({ message: 'Termin gelöscht' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EXPORT
// ============================================
module.exports = app;