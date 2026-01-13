import db from '../config/database.js';

class Template {
  static create({ name, description, type, icon, data, created_by, is_public = false }) {
    const stmt = db.prepare(`
      INSERT INTO templates (name, description, type, icon, data, created_by, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const dataJson = typeof data === 'string' ? data : JSON.stringify(data);

    const result = stmt.run(
      name,
      description || null,
      type,
      icon || '📋',
      dataJson,
      created_by,
      is_public ? 1 : 0
    );

    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        (u.first_name || ' ' || u.last_name) as created_by_name
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `);

    const template = stmt.get(id);
    if (template && template.data) {
      template.data = JSON.parse(template.data);
    }
    return template;
  }

  static getAll(filters = {}) {
    let query = `
      SELECT
        t.*,
        (u.first_name || ' ' || u.last_name) as created_by_name
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const values = [];

    if (filters.type) {
      query += ' AND t.type = ?';
      values.push(filters.type);
    }

    if (filters.created_by) {
      query += ' AND t.created_by = ?';
      values.push(filters.created_by);
    }

    if (filters.is_public !== undefined) {
      query += ' AND t.is_public = ?';
      values.push(filters.is_public ? 1 : 0);
    }

    // Get public templates or user's own templates
    if (filters.user_id && !filters.all) {
      query += ' AND (t.is_public = 1 OR t.created_by = ?)';
      values.push(filters.user_id);
    }

    query += ' ORDER BY t.is_public DESC, t.created_at DESC';

    const stmt = db.prepare(query);
    const templates = stmt.all(...values);

    // Parse JSON data for each template
    return templates.map(t => ({
      ...t,
      data: t.data ? JSON.parse(t.data) : null
    }));
  }

  static update(id, updates) {
    const allowedFields = ['name', 'description', 'icon', 'data', 'is_public'];
    const fields = [];
    const values = [];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        if (field === 'data') {
          values.push(typeof updates[field] === 'string' ? updates[field] : JSON.stringify(updates[field]));
        } else if (field === 'is_public') {
          values.push(updates[field] ? 1 : 0);
        } else {
          values.push(updates[field]);
        }
      }
    });

    if (fields.length === 0) return this.findById(id);

    // Always update updated_at
    fields.push("updated_at = datetime('now', '+1 hour')");
    values.push(id);

    const stmt = db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM templates WHERE id = ?');
    return stmt.run(id);
  }

  static deleteByUser(id, userId) {
    // Only allow deletion if user is the creator
    const stmt = db.prepare('DELETE FROM templates WHERE id = ? AND created_by = ?');
    return stmt.run(id, userId);
  }
}

export default Template;
