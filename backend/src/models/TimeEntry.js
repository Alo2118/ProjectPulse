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
      VALUES (?, ?, datetime('now', '+1 hour'))
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
      SET ended_at = datetime('now', '+1 hour'),
          duration = (julianday(datetime('now', '+1 hour')) - julianday(started_at)) * 86400
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
      SELECT te.*, (u.first_name || ' ' || u.last_name) as user_name
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

  static getAll(filters = {}) {
    let query = `
      SELECT te.*, t.title as task_title, p.name as project_name, (u.first_name || ' ' || u.last_name) as user_name
      FROM time_entries te
      LEFT JOIN tasks t ON te.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON te.user_id = u.id
      WHERE 1=1
    `;
    const values = [];

    if (filters.user_id) {
      query += ' AND te.user_id = ?';
      values.push(filters.user_id);
    }
    if (filters.project_id) {
      query += ' AND t.project_id = ?';
      values.push(filters.project_id);
    }
    if (filters.from_date) {
      query += ' AND DATE(te.started_at) >= DATE(?)';
      values.push(filters.from_date);
    }
    if (filters.to_date) {
      query += ' AND DATE(te.started_at) <= DATE(?)';
      values.push(filters.to_date);
    }

    query += ' ORDER BY te.started_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...values);
  }

  static createManual({ task_id, user_id, started_at, ended_at, notes = '' }) {
    // Calculate duration
    const start = new Date(started_at);
    const end = new Date(ended_at);
    const duration = Math.floor((end - start) / 1000);

    if (duration <= 0) {
      throw new Error('End time must be after start time');
    }

    const stmt = db.prepare(`
      INSERT INTO time_entries (task_id, user_id, started_at, ended_at, duration, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(task_id, user_id, started_at, ended_at, duration, notes);

    // Update task's total time_spent
    const taskStmt = db.prepare(`
      UPDATE tasks
      SET time_spent = time_spent + ?
      WHERE id = ?
    `);
    taskStmt.run(duration, task_id);

    return this.findById(result.lastInsertRowid);
  }

  static update(id, { started_at, ended_at, notes }) {
    const entry = this.findById(id);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    // If changing times, recalculate duration
    const newStarted = started_at || entry.started_at;
    const newEnded = ended_at || entry.ended_at;

    if (!newEnded) {
      throw new Error('Cannot update an active timer this way. Use stop endpoint.');
    }

    const start = new Date(newStarted);
    const end = new Date(newEnded);
    const newDuration = Math.floor((end - start) / 1000);

    if (newDuration <= 0) {
      throw new Error('End time must be after start time');
    }

    // Update task's time_spent (subtract old duration, add new duration)
    const durationDiff = newDuration - (entry.duration || 0);
    const taskStmt = db.prepare(`
      UPDATE tasks
      SET time_spent = time_spent + ?
      WHERE id = ?
    `);
    taskStmt.run(durationDiff, entry.task_id);

    // Update time entry
    const stmt = db.prepare(`
      UPDATE time_entries
      SET started_at = ?,
          ended_at = ?,
          duration = ?,
          notes = ?
      WHERE id = ?
    `);
    stmt.run(newStarted, newEnded, newDuration, notes !== undefined ? notes : entry.notes, id);

    return this.findById(id);
  }

  static delete(id) {
    const entry = this.findById(id);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    // Subtract duration from task's time_spent if entry was completed
    if (entry.duration) {
      const taskStmt = db.prepare(`
        UPDATE tasks
        SET time_spent = time_spent - ?
        WHERE id = ?
      `);
      taskStmt.run(entry.duration, entry.task_id);
    }

    const stmt = db.prepare('DELETE FROM time_entries WHERE id = ?');
    stmt.run(id);

    return true;
  }

  static getStatistics(filters = {}) {
    let query = `
      SELECT
        COUNT(*) as total_entries,
        COALESCE(SUM(duration), 0) as total_seconds,
        COALESCE(AVG(duration), 0) as avg_seconds,
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT task_id) as total_tasks
      FROM time_entries te
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.ended_at IS NOT NULL
    `;
    const values = [];

    if (filters.user_id) {
      query += ' AND te.user_id = ?';
      values.push(filters.user_id);
    }
    if (filters.project_id) {
      query += ' AND t.project_id = ?';
      values.push(filters.project_id);
    }
    if (filters.from_date) {
      query += ' AND DATE(te.started_at) >= DATE(?)';
      values.push(filters.from_date);
    }
    if (filters.to_date) {
      query += ' AND DATE(te.started_at) <= DATE(?)';
      values.push(filters.to_date);
    }

    const stmt = db.prepare(query);
    return stmt.get(...values);
  }

  static getTimeByProject(filters = {}) {
    let query = `
      SELECT
        p.id as project_id,
        p.name as project_name,
        COUNT(*) as entry_count,
        COALESCE(SUM(te.duration), 0) as total_seconds
      FROM time_entries te
      LEFT JOIN tasks t ON te.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE te.ended_at IS NOT NULL AND p.id IS NOT NULL
    `;
    const values = [];

    if (filters.user_id) {
      query += ' AND te.user_id = ?';
      values.push(filters.user_id);
    }
    if (filters.from_date) {
      query += ' AND DATE(te.started_at) >= DATE(?)';
      values.push(filters.from_date);
    }
    if (filters.to_date) {
      query += ' AND DATE(te.started_at) <= DATE(?)';
      values.push(filters.to_date);
    }

    query += ' GROUP BY p.id, p.name ORDER BY total_seconds DESC';

    const stmt = db.prepare(query);
    return stmt.all(...values);
  }

  static getTimeByUser(filters = {}) {
    let query = `
      SELECT
        u.id as user_id,
        (u.first_name || ' ' || u.last_name) as user_name,
        COUNT(*) as entry_count,
        COALESCE(SUM(te.duration), 0) as total_seconds
      FROM time_entries te
      LEFT JOIN users u ON te.user_id = u.id
      WHERE te.ended_at IS NOT NULL
    `;
    const values = [];

    if (filters.project_id) {
      query += ' AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = te.task_id AND t.project_id = ?)';
      values.push(filters.project_id);
    }
    if (filters.from_date) {
      query += ' AND DATE(te.started_at) >= DATE(?)';
      values.push(filters.from_date);
    }
    if (filters.to_date) {
      query += ' AND DATE(te.started_at) <= DATE(?)';
      values.push(filters.to_date);
    }

    query += ' GROUP BY u.id, u.name ORDER BY total_seconds DESC';

    const stmt = db.prepare(query);
    return stmt.all(...values);
  }
}

export default TimeEntry;
