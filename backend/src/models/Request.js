import db from '../config/database.js';

class Request {
  static create({
    title,
    description,
    type,
    source,
    source_contact = null,
    priority = 'normal',
    project_id = null,
    assigned_to = null,
    due_date = null,
    tags = null,
    created_by
  }) {
    const stmt = db.prepare(`
      INSERT INTO requests (
        title, description, type, source, source_contact,
        priority, project_id, assigned_to, due_date, tags, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      title, description, type, source, source_contact,
      priority, project_id, assigned_to, due_date,
      tags ? JSON.stringify(tags) : null,
      created_by
    );
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT
        r.*,
        (u_assigned.first_name || ' ' || u_assigned.last_name) as assigned_to_name,
        (u_created.first_name || ' ' || u_created.last_name) as created_by_name,
        (u_reviewed.first_name || ' ' || u_reviewed.last_name) as reviewed_by_name,
        p.name as project_name,
        t.title as converted_task_title,
        proj.name as converted_project_name
      FROM requests r
      LEFT JOIN users u_assigned ON r.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON r.created_by = u_created.id
      LEFT JOIN users u_reviewed ON r.reviewed_by = u_reviewed.id
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN tasks t ON r.converted_to_task_id = t.id
      LEFT JOIN projects proj ON r.converted_to_project_id = proj.id
      WHERE r.id = ?
    `);
    const request = stmt.get(id);
    if (request && request.tags) {
      request.tags = JSON.parse(request.tags);
    }
    return request;
  }

  static getAll(filters = {}) {
    let query = `
      SELECT
        r.*,
        (u_assigned.first_name || ' ' || u_assigned.last_name) as assigned_to_name,
        (u_created.first_name || ' ' || u_created.last_name) as created_by_name,
        p.name as project_name
      FROM requests r
      LEFT JOIN users u_assigned ON r.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON r.created_by = u_created.id
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE 1=1
    `;
    const values = [];

    // Filtri
    if (filters.status) {
      query += ' AND r.status = ?';
      values.push(filters.status);
    }
    if (filters.priority) {
      query += ' AND r.priority = ?';
      values.push(filters.priority);
    }
    if (filters.type) {
      query += ' AND r.type = ?';
      values.push(filters.type);
    }
    if (filters.source) {
      query += ' AND r.source = ?';
      values.push(filters.source);
    }
    if (filters.assigned_to) {
      query += ' AND r.assigned_to = ?';
      values.push(filters.assigned_to);
    }
    if (filters.project_id) {
      query += ' AND r.project_id = ?';
      values.push(filters.project_id);
    }
    if (filters.search) {
      query += ' AND (r.title LIKE ? OR r.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm);
    }

    // Paginazione
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    query += ' ORDER BY r.received_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const stmt = db.prepare(query);
    const requests = stmt.all(...values);

    // Parse tags JSON
    return requests.map(req => ({
      ...req,
      tags: req.tags ? JSON.parse(req.tags) : null
    }));
  }

  static getCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM requests r WHERE 1=1';
    const values = [];

    if (filters.status) {
      query += ' AND r.status = ?';
      values.push(filters.status);
    }
    if (filters.priority) {
      query += ' AND r.priority = ?';
      values.push(filters.priority);
    }
    if (filters.assigned_to) {
      query += ' AND r.assigned_to = ?';
      values.push(filters.assigned_to);
    }

    const stmt = db.prepare(query);
    return stmt.get(...values).count;
  }

  static update(id, updates) {
    const allowedFields = [
      'title', 'description', 'type', 'source', 'source_contact',
      'status', 'priority', 'project_id', 'assigned_to', 'reviewed_by',
      'due_date', 'notes', 'tags', 'converted_to_task_id', 'converted_to_project_id'
    ];

    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key === 'tags' && updates[key]) {
          values.push(JSON.stringify(updates[key]));
        } else {
          values.push(updates[key]);
        }
      }
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE requests SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  static review(id, user_id, status, notes = null) {
    const stmt = db.prepare(`
      UPDATE requests
      SET status = ?, reviewed_by = ?, reviewed_at = datetime('now', '+1 hour'), notes = ?
      WHERE id = ?
    `);
    stmt.run(status, user_id, notes, id);
    return this.findById(id);
  }

  static convertToTask(id, task_id) {
    const stmt = db.prepare(`
      UPDATE requests
      SET status = 'converted_to_task',
          converted_to_task_id = ?,
          resolved_at = datetime('now', '+1 hour')
      WHERE id = ?
    `);
    stmt.run(task_id, id);
    return this.findById(id);
  }

  static convertToProject(id, project_id) {
    const stmt = db.prepare(`
      UPDATE requests
      SET status = 'converted_to_project',
          converted_to_project_id = ?,
          resolved_at = datetime('now', '+1 hour')
      WHERE id = ?
    `);
    stmt.run(project_id, id);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM requests WHERE id = ?');
    return stmt.run(id);
  }

  static getStatsByStatus() {
    const stmt = db.prepare(`
      SELECT
        status,
        COUNT(*) as count,
        AVG(
          CASE
            WHEN resolved_at IS NOT NULL
            THEN (julianday(resolved_at) - julianday(received_at)) * 24
          END
        ) as avg_resolution_hours
      FROM requests
      GROUP BY status
      ORDER BY count DESC
    `);
    return stmt.all();
  }

  static getStatsByType() {
    const stmt = db.prepare(`
      SELECT
        type,
        COUNT(*) as count,
        status
      FROM requests
      GROUP BY type, status
      ORDER BY count DESC
    `);
    return stmt.all();
  }
}

export default Request;
