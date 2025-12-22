import db from '../config/database.js';

class Comment {
  static create({ task_id, user_id, message, is_from_direction }) {
    const stmt = db.prepare(`
      INSERT INTO comments (task_id, user_id, message, is_from_direction)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(task_id, user_id, message, is_from_direction ? 1 : 0);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `);
    return stmt.get(id);
  }

  static getByTask(task_id) {
    const stmt = db.prepare(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `);
    return stmt.all(task_id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM comments WHERE id = ?');
    return stmt.run(id);
  }
}

export default Comment;
