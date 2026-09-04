const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class FileService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });

    // Configure storage
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

    // File filter
    this.fileFilter = (req, file, cb) => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv'
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
    };

    this.upload = multer({
      storage: this.storage,
      fileFilter: this.fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    });
  }

  getMulterMiddleware() {
    return this.upload;
  }

  async saveFileMetadata(userId, eventId, file) {
    const result = await this.pool.query(
      `INSERT INTO attachments 
       (event_id, user_id, filename, original_name, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventId, userId, file.filename, file.originalname, file.path, file.size, file.mimetype]
    );

    return result.rows[0];
  }

  async getEventFiles(eventId, userId) {
    const result = await this.pool.query(
      `SELECT * FROM attachments 
       WHERE event_id = $1 AND (user_id = $2 OR visibility = 'public')
       ORDER BY uploaded_at DESC`,
      [eventId, userId]
    );

    return result.rows;
  }

  async deleteFile(fileId, userId) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get file info
      const fileResult = await client.query(
        'SELECT file_path FROM attachments WHERE id = $1 AND user_id = $2',
        [fileId, userId]
      );

      if (fileResult.rows.length === 0) {
        throw new Error('File not found or unauthorized');
      }

      // Delete from database
      await client.query(
        'DELETE FROM attachments WHERE id = $1 AND user_id = $2',
        [fileId, userId]
      );

      // Delete from filesystem
      const filePath = fileResult.rows[0].file_path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await client.query('COMMIT');
      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Delete file error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getFileStream(fileId, userId) {
    const result = await this.pool.query(
      `SELECT * FROM attachments 
       WHERE id = $1 AND (user_id = $2 OR visibility = 'public')`,
      [fileId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('File not found or unauthorized');
    }

    const file = result.rows[0];
    const stream = fs.createReadStream(file.file_path);
    
    return {
      stream,
      metadata: file
    };
  }
}

module.exports = new FileService();