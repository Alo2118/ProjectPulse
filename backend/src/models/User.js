import db from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  static create({ email, password, name, role }) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(email, hashedPassword, name, role);
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
    const stmt = db.prepare('SELECT id, email, name, role, created_at FROM users');
    return stmt.all();
  }

  static update(id, { email, name, role, password }) {
    let query = 'UPDATE users SET ';
    const params = [];
    const updates = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
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

  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(id);
  }

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }
}

export default User;
