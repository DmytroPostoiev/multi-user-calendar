const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

class WebSocketService {
  constructor() {
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });
  }

  initialize(server) {
    const wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    wss.on('connection', async (ws, req) => {
      try {
        // Extract token from query string
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        
        if (!token) {
          ws.close(1008, 'No token provided');
          return;
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Store connection
        if (!this.clients.has(userId)) {
          this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(ws);

        // Send initial data
        this.sendInitialData(userId, ws);

        // Handle messages
        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message.toString());
            await this.handleMessage(userId, data, ws);
          } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Invalid message format'
            }));
          }
        });

        // Handle disconnection
        ws.on('close', () => {
          const userClients = this.clients.get(userId);
          if (userClients) {
            userClients.delete(ws);
            if (userClients.size === 0) {
              this.clients.delete(userId);
            }
          }
        });

        // Handle errors
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1008, 'Authentication failed');
      }
    });

    console.log('WebSocket server initialized');
    return wss;
  }

  async sendInitialData(userId, ws) {
    try {
      // Get today's events
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const events = await this.pool.query(
        `SELECT 
          e.*,
          u.name as user_name
         FROM events e
         JOIN users u ON e.user_id = u.id
         WHERE (e.user_id = $1 OR e.visibility = 'public')
           AND e.start_time >= $2
           AND e.start_time < $3
         ORDER BY e.start_time ASC`,
        [userId, startOfDay, endOfDay]
      );

      ws.send(JSON.stringify({
        type: 'initial',
        events: events.rows,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Initial data error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to load initial data'
      }));
    }
  }

  async handleMessage(userId, data, ws) {
    switch (data.type) {
      case 'event_created':
        await this.broadcastEventCreated(userId, data.event);
        break;
      
      case 'event_updated':
        await this.broadcastEventUpdated(userId, data.event);
        break;
      
      case 'event_deleted':
        await this.broadcastEventDeleted(userId, data.eventId);
        break;
      
      case 'get_events':
        await this.sendEventsForDateRange(userId, data.start, data.end, ws);
        break;
      
      default:
        ws.send(JSON.stringify({
          type: 'error',
          error: `Unknown message type: ${data.type}`
        }));
    }
  }

  async broadcastEventCreated(userId, event) {
    // Get all users who should see this event
    const recipients = await this.getEventRecipients(userId, event);
    
    const message = JSON.stringify({
      type: 'event_created',
      event,
      userId
    });

    for (const recipientId of recipients) {
      this.sendToUser(recipientId, message);
    }
  }

  async broadcastEventUpdated(userId, event) {
    const recipients = await this.getEventRecipients(userId, event);
    
    const message = JSON.stringify({
      type: 'event_updated',
      event,
      userId
    });

    for (const recipientId of recipients) {
      this.sendToUser(recipientId, message);
    }
  }

  async broadcastEventDeleted(userId, eventId) {
    // Get event details to know who should be notified
    const event = await this.pool.query(
      'SELECT * FROM events WHERE id = $1',
      [eventId]
    );

    if (event.rows.length === 0) return;

    const recipients = await this.getEventRecipients(userId, event.rows[0]);
    
    const message = JSON.stringify({
      type: 'event_deleted',
      eventId,
      userId
    });

    for (const recipientId of recipients) {
      this.sendToUser(recipientId, message);
    }
  }

  async getEventRecipients(userId, event) {
    let recipients = new Set([userId]);

    if (event.visibility === 'public') {
      // All users
      const allUsers = await this.pool.query('SELECT id FROM users');
      allUsers.rows.forEach(row => recipients.add(row.id));
    } else if (event.visibility === 'shared') {
      // Shared with specific users
      const shared = await this.pool.query(
        'SELECT user_id FROM shared_events WHERE event_id = $1',
        [event.id]
      );
      shared.rows.forEach(row => recipients.add(row.user_id));
    }

    return Array.from(recipients);
  }

  async sendEventsForDateRange(userId, start, end, ws) {
    try {
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
        [userId, start, end]
      );

      ws.send(JSON.stringify({
        type: 'events',
        events: events.rows,
        start,
        end
      }));

    } catch (error) {
      console.error('Send events error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to load events'
      }));
    }
  }

  sendToUser(userId, message) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      for (const ws of userClients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }

  broadcastToAll(message) {
    for (const [userId, clients] of this.clients) {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }
}

module.exports = new WebSocketService();