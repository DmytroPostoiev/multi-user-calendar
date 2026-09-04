const cron = require('node-cron');
const emailService = require('./emailService');
const notificationService = require('./notificationService');

class CronService {
  start() {
    console.log('Starting cron jobs...');

    // Run every minute for push notifications
    cron.schedule('* * * * *', async () => {
      try {
        await notificationService.sendEventReminders();
      } catch (error) {
        console.error('Push reminder cron error:', error);
      }
    });

    // Run every 5 minutes for email reminders
    cron.schedule('*/5 * * * *', async () => {
      try {
        await emailService.processEmailReminders();
      } catch (error) {
        console.error('Email reminder cron error:', error);
      }
    });

    // Run daily at 7:00 AM for daily digests
    cron.schedule('0 7 * * *', async () => {
      try {
        await emailService.processDailyDigests();
      } catch (error) {
        console.error('Daily digest cron error:', error);
      }
    });

    // Cleanup old logs weekly
    cron.schedule('0 0 * * 0', async () => {
      try {
        await this.cleanupOldLogs();
      } catch (error) {
        console.error('Cleanup cron error:', error);
      }
    });

    console.log('Cron jobs started');
  }

  async cleanupOldLogs() {
    const pool = this.pool;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      'DELETE FROM notification_logs WHERE sent_at < $1',
      [thirtyDaysAgo]
    );

    await pool.query(
      'DELETE FROM email_logs WHERE sent_at < $1',
      [thirtyDaysAgo]
    );

    await pool.query(
      'DELETE FROM audit_logs WHERE created_at < $1',
      [thirtyDaysAgo]
    );

    console.log('Old logs cleaned up');
  }
}

module.exports = new CronService();