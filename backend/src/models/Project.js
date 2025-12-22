import db from '../config/database.js';

class Project {
  static create({ name, description, created_by }) {
    const stmt = db.prepare(
      'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)'
    );
    const result = stmt.run(name, description, created_by);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT p.*, u.name as creator_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `);
    return stmt.get(id);
  }

  static getAll(includeArchived = false) {
    const query = includeArchived
      ? 'SELECT p.*, u.name as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id ORDER BY p.created_at DESC'
      : 'SELECT p.*, u.name as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id WHERE p.archived = 0 ORDER BY p.created_at DESC';
    const stmt = db.prepare(query);
    return stmt.all();
  }

  static update(id, { name, description, archived }) {
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (archived !== undefined) {
      updates.push('archived = ?');
      values.push(archived ? 1 : 0);
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    return stmt.run(id);
  }

  static getWithTaskCount() {
    const stmt = db.prepare(`
      SELECT
        p.*,
        u.name as creator_name,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.archived = 0
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    return stmt.all();
  }
}

export default Project;
