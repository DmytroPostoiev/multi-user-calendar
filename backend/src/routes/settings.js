const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

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

// Get user settings
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = req.pool;
    const userId = req.userId;

    const result = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default settings
      const newSettings = await pool.query(
        `INSERT INTO user_settings (user_id, default_view, theme, accent_color) 
         VALUES ($1, 'month', 'light', '#4a90e2') 
         RETURNING *`,
        [userId]
      );
      return res.json(newSettings.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user settings
router.put('/', authenticate, async (req, res) => {
  try {
    const { defaultView, theme, accentColor } = req.body;
    const pool = req.pool;
    const userId = req.userId;

    const result = await pool.query(
      `UPDATE user_settings 
       SET default_view = COALESCE($1, default_view),
           theme = COALESCE($2, theme),
           accent_color = COALESCE($3, accent_color),
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [defaultView, theme, accentColor, userId]
    );

    if (result.rows.length === 0) {
      // Create settings if they don't exist
      const newSettings = await pool.query(
        `INSERT INTO user_settings (user_id, default_view, theme, accent_color) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userId, defaultView || 'month', theme || 'light', accentColor || '#4a90e2']
      );
      return res.json(newSettings.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;