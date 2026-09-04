const { Pool } = require('pg');

class AuditService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });
  }

  async logAction(userId, action, entityType, entityId, changes, ipAddress, userAgent) {
    try {
      await this.pool.query(
        `INSERT INTO audit_logs 
         (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, action, entityType, entityId, JSON.stringify(changes), ipAddress, userAgent]
      );
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  async getAuditLogs(userId, filters = {}) {
    let query = `
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;

    if (filters.action) {
      query += ` AND a.action = $${paramIndex}`;
      params.push(filters.action);
      paramIndex++;
    }

    if (filters.entityType) {
      query += ` AND a.entity_type = $${paramIndex}`;
      params.push(filters.entityType);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND a.created_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND a.created_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ' ORDER BY a.created_at DESC LIMIT 100';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUserActivitySummary(userId) {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total_actions,
        action,
        COUNT(*) as action_count,
        DATE(created_at) as date
       FROM audit_logs
       WHERE user_id = $1
       GROUP BY action, DATE(created_at)
       ORDER BY date DESC, action_count DESC`,
      [userId]
    );

    return result.rows;
  }
}

module.exports = new AuditService();