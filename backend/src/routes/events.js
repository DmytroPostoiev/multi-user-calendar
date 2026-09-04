const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get events for a date range
router.get('/', authenticate, async (req, res) => {
  try {
    const { start, end } = req.query;
    const pool = req.pool;
    const userId = req.userId;

    let query = `
      SELECT 
        e.*,
        u.name as user_name
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE (
        e.user_id = $1 
        OR e.visibility = 'public'
        OR (e.visibility = 'shared' AND EXISTS (
          SELECT 1 FROM shared_events s 
          WHERE s.event_id = e.id AND s.user_id = $1
        ))
      )
    `;

    const params = [userId];
    let paramIndex = 2;

    if (start && end) {
      query += ` AND e.start_time >= $${paramIndex} AND e.end_time <= $${paramIndex + 1}`;
      params.push(start, end);
      paramIndex += 2;
    }

    query += ' ORDER BY e.start_time ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ✅ CREATE EVENT - KORRIGIERT (ohne reminder)
// ============================================
router.post('/', authenticate, [
  body('title').notEmpty().trim(),
  body('start').isISO8601(),
  body('end').isISO8601(),
  body('visibility').optional().isIn(['private', 'shared', 'public'])
], async (req, res) => {
  try {
    // Debug-Logs
    console.log('📝 Event erstellen:', req.body);
    console.log('👤 User ID:', req.userId);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, description, start, end, color, visibility } = req.body;
    const pool = req.pool;
    const userId = req.userId;

    // Validierung
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Titel ist erforderlich' });
    }
    if (!start) {
      return res.status(400).json({ error: 'Startzeit ist erforderlich' });
    }
    if (!end) {
      return res.status(400).json({ error: 'Endzeit ist erforderlich' });
    }

    // INSERT OHNE reminder und reminder_minutes
    const result = await pool.query(
      `INSERT INTO events 
       (user_id, title, description, start_time, end_time, color, visibility) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [userId, title, description, start, end, color || '#4a90e2', visibility || 'private']
    );

    console.log('✅ Event erstellt:', result.rows[0]);
    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('❌ Create event error:', error);
    console.error('❌ Error details:', error.stack);
    res.status(500).json({ 
      error: 'Fehler beim Erstellen des Events',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update event
router.put('/:id', authenticate, [
  body('title').notEmpty().trim(),
  body('start').isISO8601(),
  body('end').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { id } = req.params;
    const { title, description, start, end, color, visibility } = req.body;
    const pool = req.pool;
    const userId = req.userId;

    // Check ownership
    const check = await pool.query(
      'SELECT user_id FROM events WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (check.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // UPDATE OHNE reminder und reminder_minutes
    const result = await pool.query(
      `UPDATE events 
       SET title = $1, description = $2, start_time = $3, end_time = $4, 
           color = $5, visibility = $6,
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [title, description, start, end, color, visibility, id, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete event
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = req.pool;
    const userId = req.userId;

    // Check ownership
    const check = await pool.query(
      'SELECT user_id FROM events WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (check.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await pool.query(
      'DELETE FROM events WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share event with user
router.post('/:id/share', authenticate, [
  body('userId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { id } = req.params;
    const { userId: targetUserId } = req.body;
    const pool = req.pool;
    const userId = req.userId;

    // Check event ownership
    const check = await pool.query(
      'SELECT user_id FROM events WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (check.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [targetUserId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await pool.query(
      `INSERT INTO shared_events (event_id, user_id) 
       VALUES ($1, $2) 
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [id, targetUserId]
    );

    res.json({ message: 'Event shared successfully' });
  } catch (error) {
    console.error('Share event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;