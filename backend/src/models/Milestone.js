import db from '../config/database.js';

class Milestone {
  static create({ name, description, project_id, due_date }) {
    const stmt = db.prepare(`
      INSERT INTO milestones (name, description, project_id, due_date)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(name, description || null, project_id, due_date || null);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM milestones WHERE id = ?');
    return stmt.get(id);
  }

  static getByProject(project_id) {
    const stmt = db.prepare(`
      SELECT
        m.*,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_count,
        SUM(t.time_spent) as total_time
      FROM milestones m
      LEFT JOIN tasks t ON m.id = t.milestone_id
      WHERE m.project_id = ?
      GROUP BY m.id
      ORDER BY
        CASE m.status
          WHEN 'active' THEN 1
          WHEN 'completed' THEN 2
          WHEN 'cancelled' THEN 3
        END,
        m.due_date ASC,
        m.created_at ASC
    `);
    return stmt.all(project_id);
  }

  static update(id, data) {
    const updates = [];
    const values = [];

    const allowedFields = ['name', 'description', 'due_date', 'status', 'completed_at'];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    });

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE milestones SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM milestones WHERE id = ?');
    return stmt.run(id);
  }

  static complete(id) {
    const stmt = db.prepare(`
      UPDATE milestones
      SET status = 'completed', completed_at = datetime('now', '+1 hour')
      WHERE id = ?
    `);
    stmt.run(id);
    return this.findById(id);
  }
}

export default Milestone;
