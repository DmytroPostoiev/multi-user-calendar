const ical = require('ical-generator');
const { Pool } = require('pg');

class ExportService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });
  }

  async exportToICal(userId, startDate, endDate) {
    try {
      // Get events
      const events = await this.pool.query(
        `SELECT 
          e.*,
          u.name as user_name
         FROM events e
         JOIN users u ON e.user_id = u.id
         WHERE (e.user_id = $1 OR e.visibility = 'public')
           AND e.start_time >= $2
           AND e.end_time <= $3
         ORDER BY e.start_time ASC`,
        [userId, startDate, endDate]
      );

      // Get user info
      const user = await this.pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [userId]
      );

      // Create calendar
      const calendar = ical({
        name: `${user.rows[0].name}'s Calendar`,
        timezone: 'Europe/Berlin',
        prodId: {
          company: 'Multi-User Calendar',
          product: 'Calendar Export'
        }
      });

      // Add events
      for (const event of events.rows) {
        calendar.createEvent({
          start: new Date(event.start_time),
          end: new Date(event.end_time),
          summary: event.title,
          description: event.description || '',
          organizer: {
            name: user.rows[0].name,
            email: user.rows[0].email
          },
          url: `${process.env.FRONTEND_URL}/event/${event.id}`,
          color: event.color || '#4a90e2'
        });
      }

      return calendar.toString();
    } catch (error) {
      console.error('ICal export error:', error);
      throw error;
    }
  }

  generateGoogleCalendarLink(userId, startDate, endDate) {
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      ctz: 'Europe/Berlin'
    });

    // This is a simplified version - in production, you'd need to handle
    // more complex scenarios and possibly use OAuth for Google Calendar API
    return `${baseUrl}?${params.toString()}`;
  }

  generateOutlookCalendarLink(userId, startDate, endDate) {
    const baseUrl = 'https://outlook.live.com/calendar/';
    const params = new URLSearchParams({
      view: 'day'
    });

    return `${baseUrl}?${params.toString()}`;
  }
}

module.exports = new ExportService();