const { Pool } = require('pg');
const { RRule, rrulestr } = require('rrule');

class RecurringService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });
  }

  async createRecurringEvent(userId, eventData) {
    const {
      title,
      description,
      start_time,
      end_time,
      color,
      visibility,
      reminder,
      reminder_minutes,
      recurrenceRule,
      recurrenceEndDate
    } = eventData;

    // Start a transaction
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create the main event
      const result = await client.query(
        `INSERT INTO events 
         (user_id, title, description, start_time, end_time, color, 
          visibility, reminder, reminder_minutes, is_recurring)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [userId, title, description, start_time, end_time, color, 
         visibility, reminder, reminder_minutes, true]
      );

      const mainEvent = result.rows[0];

      // Save recurrence rule
      await client.query(
        `INSERT INTO recurring_events 
         (event_id, rrule, recurrence_end)
         VALUES ($1, $2, $3)`,
        [mainEvent.id, recurrenceRule, recurrenceEndDate]
      );

      // Generate and create all occurrences
      const occurrences = this.generateOccurrences(
        new Date(start_time),
        new Date(end_time),
        recurrenceRule,
        recurrenceEndDate
      );

      for (const occ of occurrences) {
        await client.query(
          `INSERT INTO event_occurrences 
           (parent_event_id, start_time, end_time, is_exception)
           VALUES ($1, $2, $3, $4)`,
          [mainEvent.id, occ.start, occ.end, false]
        );
      }

      await client.query('COMMIT');
      return mainEvent;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create recurring event error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  generateOccurrences(start, end, rruleStr, recurrenceEnd) {
    const rule = new RRule(
      rrulestr(rruleStr, {
        dtstart: start,
        until: recurrenceEnd ? new Date(recurrenceEnd) : null
      })
    );

    const occurrences = [];
    const dates = rule.all();

    for (const date of dates) {
      const duration = end.getTime() - start.getTime();
      const occEnd = new Date(date.getTime() + duration);
      occurrences.push({
        start: date,
        end: occEnd
      });
    }

    return occurrences;
  }

  async getRecurringEvents(userId, startDate, endDate) {
    const result = await this.pool.query(
      `SELECT 
        e.*,
        r.rrule,
        r.recurrence_end,
        o.start_time as occurrence_start,
        o.end_time as occurrence_end,
        o.is_exception
       FROM events e
       JOIN recurring_events r ON e.id = r.event_id
       LEFT JOIN event_occurrences o ON e.id = o.parent_event_id
       WHERE e.user_id = $1
         AND e.is_recurring = true
         AND (
           (o.start_time >= $2 AND o.start_time <= $3)
           OR
           (o.start_time IS NULL AND r.recurrence_end >= $2)
         )
       ORDER BY o.start_time ASC`,
      [userId, startDate, endDate]
    );

    return result.rows;
  }

  async updateOccurrence(occurrenceId, eventData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update the occurrence
      const result = await client.query(
        `UPDATE event_occurrences 
         SET start_time = $1, end_time = $2, 
             title = COALESCE($3, title),
             description = COALESCE($4, description),
             color = COALESCE($5, color),
             is_exception = true
         WHERE id = $6
         RETURNING *`,
        [eventData.start_time, eventData.end_time, 
         eventData.title, eventData.description, eventData.color,
         occurrenceId]
      );

      await client.query('COMMIT');
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update occurrence error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteOccurrence(occurrenceId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE event_occurrences 
         SET is_exception = true, deleted_at = NOW()
         WHERE id = $1`,
        [occurrenceId]
      );

      await client.query('COMMIT');
      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete occurrence error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new RecurringService();