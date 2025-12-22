import db from '../config/database.js';

class TimeEntry {
  static start({ task_id, user_id }) {
    // Check if there's already an active timer for this user
    const activeTimer = this.getActiveTimer(user_id);
    if (activeTimer) {
      throw new Error('There is already an active timer. Stop it before starting a new one.');
    }

    const stmt = db.prepare(`
      INSERT INTO time_entries (task_id, user_id, started_at)
      VALUES (?, ?, datetime('now'))
    `);
    const result = stmt.run(task_id, user_id);
    return this.findById(result.lastInsertRowid);
  }

  static stop(id) {
    const entry = this.findById(id);
    if (!entry) {
      throw new Error('Time entry not found');
    }
    if (entry.ended_at) {
      throw new Error('Timer already stopped');
    }

    const stmt = db.prepare(`
      UPDATE time_entries
      SET ended_at = datetime('now'),
          duration = (julianday(datetime('now')) - julianday(started_at)) * 86400
      WHERE id = ?
    `);
    stmt.run(id);

    // Update task's total time_spent
    const updatedEntry = this.findById(id);
    const taskStmt = db.prepare(`
      UPDATE tasks
      SET time_spent = time_spent + ?
      WHERE id = ?
    `);
    taskStmt.run(Math.round(updatedEntry.duration), updatedEntry.task_id);

    return this.findById(id);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM time_entries WHERE id = ?');
    return stmt.get(id);
  }

  static getActiveTimer(user_id) {
    const stmt = db.prepare(`
      SELECT te.*, t.title as task_title, t.status as task_status
      FROM time_entries te
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.user_id = ? AND te.ended_at IS NULL
      ORDER BY te.started_at DESC
      LIMIT 1
    `);
    return stmt.get(user_id);
  }

  static getByTask(task_id) {
    const stmt = db.prepare(`
      SELECT te.*, u.name as user_name
      FROM time_entries te
      LEFT JOIN users u ON te.user_id = u.id
      WHERE te.task_id = ?
      ORDER BY te.started_at DESC
    `);
    return stmt.all(task_id);
  }

  static getByUser(user_id, from_date = null, to_date = null) {
    let query = `
      SELECT te.*, t.title as task_title, p.name as project_name
      FROM time_entries te
      LEFT JOIN tasks t ON te.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE te.user_id = ?
    `;
    const values = [user_id];

    if (from_date) {
      query += ' AND DATE(te.started_at) >= DATE(?)';
      values.push(from_date);
    }
    if (to_date) {
      query += ' AND DATE(te.started_at) <= DATE(?)';
      values.push(to_date);
    }

    query += ' ORDER BY te.started_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...values);
  }
}

export default TimeEntry;
