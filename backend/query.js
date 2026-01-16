import db from './src/config/database.js';

const tasks = db.prepare('SELECT id, title, assigned_to, created_by FROM tasks WHERE created_by > 0 ORDER BY created_at DESC LIMIT 10').all();
console.log(tasks);