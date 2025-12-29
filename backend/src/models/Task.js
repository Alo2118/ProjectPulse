import db from '../config/database.js';

class Task {
  static create({ title, description, status, project_id, milestone_id, assigned_to, created_by, priority, deadline }) {
    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, status, project_id, milestone_id, assigned_to, created_by, priority, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      title,
      description || null,
      status || 'todo',
      project_id || null,
      milestone_id || null,
      assigned_to,
      created_by,
      priority || 'medium',
      deadline || null
    );
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name,
        m.name as milestone_name,
        u1.name as assigned_to_name,
        u2.name as created_by_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN milestones m ON t.milestone_id = m.id
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.id = ?
    `);
    return stmt.get(id);
  }

  static getAll(filters = {}) {
    let query = `
      SELECT
        t.*,
        p.name as project_name,
        m.name as milestone_name,
        u1.name as assigned_to_name,
        u2.name as created_by_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN milestones m ON t.milestone_id = m.id
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE 1=1
    `;
    const values = [];

    if (filters.assigned_to) {
      query += ' AND t.assigned_to = ?';
      values.push(filters.assigned_to);
    }
    if (filters.status) {
      query += ' AND t.status = ?';
      values.push(filters.status);
    }
    if (filters.project_id) {
      query += ' AND t.project_id = ?';
      values.push(filters.project_id);
    }
    if (filters.milestone_id) {
      query += ' AND t.milestone_id = ?';
      values.push(filters.milestone_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const stmt = db.prepare(query);
    return stmt.all(...values);
  }

  static update(id, data) {
    const updates = [];
    const values = [];

    const allowedFields = [
      'title', 'description', 'status', 'project_id', 'milestone_id', 'priority',
      'time_spent', 'blocked_reason', 'clarification_needed', 'deadline', 'completed_at'
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    return stmt.run(id);
  }

  static getDailyReport(userId, date) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.assigned_to = ?
        AND DATE(t.created_at) = DATE(?)
      ORDER BY t.created_at DESC
    `);
    return stmt.all(userId, date);
  }

  static getByStatus(userId, status) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.assigned_to = ? AND t.status = ?
      ORDER BY t.priority DESC, t.created_at DESC
    `);
    return stmt.all(userId, status);
  }
}

export default Task;
