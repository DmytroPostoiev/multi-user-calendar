const nodemailer = require('nodemailer');
const { Pool } = require('pg');

class EmailService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(to, subject, html, text = '') {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'calendar@yourdomain.com',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  }

  async sendEventReminderEmail(user, event) {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h2 style="color: #4a90e2;">📅 Event Reminder</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${event.title}</h3>
          
          <p><strong>Start:</strong> ${startTime.toLocaleString()}</p>
          <p><strong>End:</strong> ${endTime.toLocaleString()}</p>
          
          ${event.description ? `<p><strong>Description:</strong></p><p>${event.description}</p>` : ''}
          
          <p style="margin-top: 20px; color: #6c757d; font-size: 14px;">
            This event is starting soon. Click the link below to view it in your calendar:
          </p>
          
          <a href="${process.env.FRONTEND_URL}/" 
             style="display: inline-block; padding: 10px 20px; background: #4a90e2; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            View Calendar
          </a>
        </div>
        
        <p style="color: #6c757d; font-size: 12px; text-align: center; margin-top: 20px;">
          You're receiving this because you set a reminder for this event.
          <br>
          To manage your reminders, visit your <a href="${process.env.FRONTEND_URL}/settings">settings</a>.
        </p>
      </div>
    `;

    return this.sendEmail(
      user.email,
      `🔔 Reminder: ${event.title}`,
      html
    );
  }

  async sendDailyDigest(user, events) {
    if (events.length === 0) return;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h2 style="color: #4a90e2;">📅 Your Daily Calendar Digest</h2>
        <p style="color: #6c757d;">Here's what's happening today, ${user.name}!</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${events.map(event => `
            <div style="border-left: 4px solid ${event.color || '#4a90e2'}; padding: 12px; margin-bottom: 12px; background: #f8f9fa; border-radius: 4px;">
              <h4 style="margin: 0 0 8px 0;">${event.title}</h4>
              <p style="margin: 4px 0; font-size: 14px; color: #6c757d;">
                ${new Date(event.start_time).toLocaleTimeString()} - ${new Date(event.end_time).toLocaleTimeString()}
              </p>
              ${event.description ? `<p style="margin: 8px 0 0 0; font-size: 14px;">${event.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
        
        <p style="color: #6c757d; font-size: 12px; text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/" style="color: #4a90e2;">View full calendar</a>
        </p>
      </div>
    `;

    return this.sendEmail(
      user.email,
      '📅 Your Daily Calendar Digest',
      html
    );
  }

  async processEmailReminders() {
    console.log('Processing email reminders...');
    
    try {
      // Get events with reminders in the next hour
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const events = await this.pool.query(
        `SELECT 
          e.*,
          u.id as user_id,
          u.email,
          u.name
         FROM events e
         JOIN users u ON e.user_id = u.id
         WHERE e.reminder = true
           AND e.start_time > NOW()
           AND e.start_time <= $1
           AND e.id NOT IN (
             SELECT event_id FROM email_logs 
             WHERE sent_at > NOW() - INTERVAL '1 hour'
           )`,
        [oneHourFromNow]
      );

      for (const event of events.rows) {
        const user = {
          id: event.user_id,
          email: event.email,
          name: event.name
        };

        await this.sendEventReminderEmail(user, event);
        
        // Log email
        await this.pool.query(
          `INSERT INTO email_logs (event_id, user_id, sent_at)
           VALUES ($1, $2, NOW())`,
          [event.id, event.user_id]
        );
      }

      console.log(`Processed ${events.rows.length} email reminders`);
    } catch (error) {
      console.error('Email reminder processing failed:', error);
    }
  }

  async processDailyDigests() {
    console.log('Processing daily digests...');
    
    try {
      // Get all users with daily digest enabled
      const users = await this.pool.query(
        `SELECT u.id, u.email, u.name 
         FROM users u
         JOIN user_settings s ON u.id = s.user_id
         WHERE s.daily_digest = true`
      );

      for (const user of users.rows) {
        // Get today's events
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const events = await this.pool.query(
          `SELECT e.* 
           FROM events e
           WHERE e.user_id = $1
             AND e.start_time >= $2
             AND e.start_time < $3
           ORDER BY e.start_time ASC`,
          [user.id, startOfDay, endOfDay]
        );

        if (events.rows.length > 0) {
          await this.sendDailyDigest(user, events.rows);
        }
      }

      console.log(`Processed daily digests for ${users.rows.length} users`);
    } catch (error) {
      console.error('Daily digest processing failed:', error);
    }
  }
}

module.exports = new EmailService();