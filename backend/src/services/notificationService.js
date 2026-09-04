const webpush = require('web-push');
const { Pool } = require('pg');

class NotificationService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });

    // Configure VAPID
    webpush.setVapidDetails(
      'mailto:' + process.env.VAPID_EMAIL,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  async getSubscriptions(userId) {
    const result = await this.pool.query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  }

  async saveSubscription(userId, subscription) {
    await this.pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, auth_key, p256dh_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE 
       SET auth_key = $3, p256dh_key = $4, updated_at = NOW()`,
      [userId, subscription.endpoint, subscription.auth, subscription.p256dh]
    );
  }

  async removeSubscription(userId, endpoint) {
    await this.pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    );
  }

  async sendNotification(userId, payload) {
    const subscriptions = await this.getSubscriptions(userId);
    
    const results = [];
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key,
            p256dh: sub.p256dh_key
          }
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        results.push({ success: true, endpoint: sub.endpoint });
      } catch (error) {
        console.error('Push notification failed:', error);
        // Remove invalid subscription
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.removeSubscription(userId, sub.endpoint);
        }
        results.push({ success: false, endpoint: sub.endpoint, error: error.message });
      }
    }
    
    return results;
  }

  async sendEventReminders() {
    const now = new Date();
    const reminderWindow = now.getTime() + 15 * 60 * 1000; // 15 minutes

    // Find events with reminders
    const events = await this.pool.query(
      `SELECT 
        e.*,
        u.id as user_id,
        u.name as user_name
       FROM events e
       JOIN users u ON e.user_id = u.id
       WHERE e.reminder = true
         AND e.start_time > NOW()
         AND e.start_time <= $1
         AND e.id NOT IN (
           SELECT event_id FROM notification_logs 
           WHERE sent_at > NOW() - INTERVAL '1 hour'
         )`,
      [new Date(reminderWindow)]
    );

    for (const event of events.rows) {
      const payload = {
        title: '📅 Event Reminder',
        body: `${event.title} starts at ${new Date(event.start_time).toLocaleTimeString()}`,
        eventId: event.id,
        url: '/'
      };

      await this.sendNotification(event.user_id, payload);
      
      // Log notification
      await this.pool.query(
        `INSERT INTO notification_logs (event_id, user_id, sent_at)
         VALUES ($1, $2, NOW())`,
        [event.id, event.user_id]
      );
    }
  }
}

module.exports = new NotificationService();