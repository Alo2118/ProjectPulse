import db from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  static create({ email, password, first_name, last_name, role, active = true }) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(
      'INSERT INTO users (email, password, first_name, last_name, role, active) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(email, hashedPassword, first_name, last_name, role, active ? 1 : 0);
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  static getAll() {
    const stmt = db.prepare('SELECT id, email, first_name, last_name, role, active, created_at FROM users');
    return stmt.all();
  }

  static getActive() {
    const stmt = db.prepare('SELECT id, email, first_name, last_name, role, active, created_at FROM users WHERE active = 1');
    return stmt.all();
  }

  static update(id, { email, first_name, last_name, role, password, active }) {
    let query = 'UPDATE users SET ';
    const params = [];
    const updates = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (first_name !== undefined) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }
    if (password !== undefined) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    query += updates.join(', ') + ' WHERE id = ?';
    params.push(id);

    const stmt = db.prepare(query);
    stmt.run(...params);
    return this.findById(id);
  }

  static deactivate(id) {
    const stmt = db.prepare('UPDATE users SET active = 0 WHERE id = ?');
    stmt.run(id);
    return this.findById(id);
  }

  static reactivate(id) {
    const stmt = db.prepare('UPDATE users SET active = 1 WHERE id = ?');
    stmt.run(id);
    return this.findById(id);
  }

  static delete(id) {
    // Soft delete: just deactivate the user instead of deleting
    // This preserves data integrity and historical records
    return this.deactivate(id);
  }

  static hardDelete(id) {
    // Hard delete: only for cases where physical deletion is absolutely necessary
    // Check if user has related data
    const checksQueries = [
      { query: 'SELECT COUNT(*) as count FROM projects WHERE created_by = ?', entity: 'progetti' },
      { query: 'SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? OR created_by = ?', entity: 'task', params: [id, id] },
      { query: 'SELECT COUNT(*) as count FROM time_entries WHERE user_id = ?', entity: 'registrazioni tempo' },
      { query: 'SELECT COUNT(*) as count FROM comments WHERE user_id = ?', entity: 'commenti' }
    ];

    const relatedData = [];

    for (const check of checksQueries) {
      const stmt = db.prepare(check.query);
      const result = check.params ? stmt.get(...check.params) : stmt.get(id);
      if (result.count > 0) {
        relatedData.push(`${result.count} ${check.entity}`);
      }
    }

    if (relatedData.length > 0) {
      throw new Error(
        `Impossibile eliminare definitivamente l'utente. Ha dati collegati: ${relatedData.join(', ')}. ` +
        `Riassegna o elimina prima questi dati.`
      );
    }

    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }
}

export default User;
