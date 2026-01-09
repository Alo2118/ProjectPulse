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
      SELECT p.*, (u.first_name || ' ' || u.last_name) as creator_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `);
    return stmt.get(id);
  }

  static getAll(includeArchived = false) {
    const query = includeArchived
      ? 'SELECT p.*, (u.first_name || \' \' || u.last_name) as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id ORDER BY p.created_at DESC'
      : 'SELECT p.*, (u.first_name || \' \' || u.last_name) as creator_name FROM projects p LEFT JOIN users u ON p.created_by = u.id WHERE p.archived = 0 ORDER BY p.created_at DESC';
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
        (u.first_name || ' ' || u.last_name) as creator_name,
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

  // Management Dashboard methods

  // Get detailed project statistics
  static getProjectStats(projectId) {
    const stmt = db.prepare(`
      SELECT
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'blocked' THEN t.id END) as blocked_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'waiting_clarification' THEN t.id END) as waiting_tasks,
        COUNT(DISTINCT CASE WHEN t.deadline < date('now', '+1 hour') AND t.status != 'completed' THEN t.id END) as overdue_tasks,
        SUM(t.time_spent) as total_time_spent,
        MIN(t.deadline) as earliest_deadline,
        MAX(t.deadline) as latest_deadline
      FROM tasks t
      WHERE t.project_id = ?
    `);
    return stmt.get(projectId);
  }

  // Calculate project health score (0-100)
  static calculateHealthScore(projectId) {
    const stats = this.getProjectStats(projectId);

    if (!stats || stats.total_tasks === 0) {
      return { score: 100, status: 'healthy', message: 'Nessun task assegnato' };
    }

    let score = 100;
    const reasons = [];

    // Completion rate impact (max -30 points)
    const completionRate = stats.completed_tasks / stats.total_tasks;
    if (completionRate < 0.3) {
      score -= 30;
      reasons.push('Basso tasso di completamento');
    } else if (completionRate < 0.5) {
      score -= 20;
      reasons.push('Completamento sotto il 50%');
    } else if (completionRate < 0.7) {
      score -= 10;
      reasons.push('Completamento sotto il 70%');
    }

    // Blocked tasks impact (max -20 points)
    const blockedRate = stats.blocked_tasks / stats.total_tasks;
    if (blockedRate > 0.2) {
      score -= 20;
      reasons.push(`${stats.blocked_tasks} task bloccati (>${ Math.round(blockedRate * 100)}%)`);
    } else if (blockedRate > 0.1) {
      score -= 10;
      reasons.push(`${stats.blocked_tasks} task bloccati`);
    } else if (stats.blocked_tasks > 0) {
      score -= 5;
      reasons.push(`${stats.blocked_tasks} task bloccati`);
    }

    // Overdue tasks impact (max -30 points)
    const overdueRate = stats.overdue_tasks / stats.total_tasks;
    if (overdueRate > 0.2) {
      score -= 30;
      reasons.push(`${stats.overdue_tasks} task scaduti (>${Math.round(overdueRate * 100)}%)`);
    } else if (overdueRate > 0.1) {
      score -= 20;
      reasons.push(`${stats.overdue_tasks} task scaduti`);
    } else if (stats.overdue_tasks > 0) {
      score -= 10;
      reasons.push(`${stats.overdue_tasks} task scaduti`);
    }

    // Waiting clarification impact (max -10 points)
    const waitingRate = stats.waiting_tasks / stats.total_tasks;
    if (waitingRate > 0.15) {
      score -= 10;
      reasons.push(`${stats.waiting_tasks} task in attesa chiarimenti`);
    } else if (stats.waiting_tasks > 0) {
      score -= 5;
      reasons.push(`${stats.waiting_tasks} task in attesa`);
    }

    // Bonus for high completion
    if (completionRate > 0.9) {
      score = Math.min(100, score + 10);
      reasons.push('Ottimo tasso di completamento!');
    }

    // Ensure score is in range 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine status
    let status, color;
    if (score >= 80) {
      status = 'healthy';
      color = 'green';
    } else if (score >= 50) {
      status = 'at_risk';
      color = 'yellow';
    } else {
      status = 'critical';
      color = 'red';
    }

    return {
      score: Math.round(score),
      status,
      color,
      reasons,
      stats
    };
  }

  // Get all projects with health scores
  static getAllWithHealthScores() {
    const projects = this.getAll(false);

    return projects.map(project => {
      const health = this.calculateHealthScore(project.id);
      return {
        ...project,
        health_score: health.score,
        health_status: health.status,
        health_color: health.color,
        health_reasons: health.reasons,
        stats: health.stats
      };
    }).sort((a, b) => {
      // Sort by health score (critical first)
      if (a.health_score !== b.health_score) {
        return a.health_score - b.health_score;
      }
      return 0;
    });
  }

  // Get velocity for a project (tasks completed per week)
  static getProjectVelocity(projectId, weeks = 4) {
    const stmt = db.prepare(`
      SELECT
        strftime('%Y-W%W', t.completed_at) as week,
        COUNT(*) as completed_count,
        SUM(t.time_spent) as total_time_spent
      FROM tasks t
      WHERE t.project_id = ?
        AND t.completed_at IS NOT NULL
        AND t.completed_at >= date('now', '-${weeks * 7} days')
      GROUP BY week
      ORDER BY week DESC
    `);
    return stmt.all(projectId);
  }

  // Get timeline data for roadmap view
  static getTimeline() {
    const stmt = db.prepare(`
      SELECT
        p.id,
        p.name,
        p.description,
        MIN(t.created_at) as start_date,
        MAX(t.deadline) as end_date,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.archived = 0
      GROUP BY p.id
      HAVING start_date IS NOT NULL
      ORDER BY start_date ASC
    `);
    return stmt.all();
  }
}

export default Project;
