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

  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }
}

export default User;
