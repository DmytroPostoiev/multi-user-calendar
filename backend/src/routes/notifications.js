const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const notificationService = require('../services/notificationService');

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

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    await notificationService.saveSubscription(req.userId, {
      endpoint,
      auth: keys.auth,
      p256dh: keys.p256dh
    });
    res.json({ message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await notificationService.removeSubscription(req.userId, endpoint);
    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send test notification
router.post('/test', authenticate, async (req, res) => {
  try {
    await notificationService.sendNotification(req.userId, {
      title: '🔔 Test Notification',
      body: 'This is a test notification from your calendar!',
      url: '/'
    });
    res.json({ message: 'Test notification sent' });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;