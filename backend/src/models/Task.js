import db from '../config/database.js';

class Task {
  static create({ title, description, status, project_id, milestone_id, assigned_to, created_by, priority, deadline, parent_task_id, order_index, depends_on_task_id }) {
    // Auto-calculate order_index for subtasks
    let finalOrderIndex = order_index !== undefined ? order_index : 0;
    if (parent_task_id && order_index === undefined) {
      const siblings = this.getSubtasks(parent_task_id);
      finalOrderIndex = siblings.length;
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, status, project_id, milestone_id, assigned_to, created_by, priority, deadline, parent_task_id, order_index, depends_on_task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      deadline || null,
      parent_task_id || null,
      finalOrderIndex,
      depends_on_task_id || null
    );
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name,
        m.name as milestone_name,
        (u1.first_name || ' ' || u1.last_name) as assigned_to_name,
        (u2.first_name || ' ' || u2.last_name) as created_by_name
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
        (u1.first_name || ' ' || u1.last_name) as assigned_to_name,
        (u2.first_name || ' ' || u2.last_name) as created_by_name
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

    // Add pagination
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    query += ' LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...values);
  }

  static getCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM tasks t WHERE 1=1';
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

    const stmt = db.prepare(query);
    return stmt.get(...values).count;
  }

  static update(id, data) {
    const updates = [];
    const values = [];

    const allowedFields = [
      'title', 'description', 'status', 'project_id', 'milestone_id', 'priority',
      'time_spent', 'blocked_reason', 'clarification_needed', 'deadline', 'completed_at',
      'order_index', 'depends_on_task_id', 'parent_task_id'
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

  // Subtask methods
  static getSubtasks(parentTaskId) {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name,
        m.name as milestone_name,
        (u1.first_name || ' ' || u1.last_name) as assigned_to_name,
        (u2.first_name || ' ' || u2.last_name) as created_by_name,
        dep.title as depends_on_task_title,
        dep.status as depends_on_task_status
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN milestones m ON t.milestone_id = m.id
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN tasks dep ON t.depends_on_task_id = dep.id
      WHERE t.parent_task_id = ?
      ORDER BY t.order_index ASC, t.created_at ASC
    `);
    return stmt.all(parentTaskId);
  }

  static getParentTask(taskId) {
    const task = this.findById(taskId);
    if (!task || !task.parent_task_id) return null;
    return this.findById(task.parent_task_id);
  }

  static getTaskTree(taskId) {
    const task = this.findById(taskId);
    if (!task) return null;

    const subtasks = this.getSubtasks(taskId);
    const subtasksWithChildren = subtasks.map(subtask => this.getTaskTree(subtask.id));

    return {
      ...task,
      subtasks: subtasksWithChildren
    };
  }

  static getSubtasksStats(parentTaskId) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(time_spent) as total_time_spent
      FROM tasks
      WHERE parent_task_id = ?
    `);
    return stmt.get(parentTaskId);
  }

  // Advanced subtask methods

  // Reorder subtasks (for drag & drop)
  static reorderSubtasks(parentTaskId, subtaskIds) {
    const updateStmt = db.prepare('UPDATE tasks SET order_index = ? WHERE id = ?');

    subtaskIds.forEach((subtaskId, index) => {
      updateStmt.run(index, subtaskId);
    });

    return this.getSubtasks(parentTaskId);
  }

  // Set dependency between subtasks
  static setDependency(subtaskId, dependsOnTaskId) {
    // Validate that both tasks belong to the same parent
    const subtask = this.findById(subtaskId);
    const dependsOnTask = dependsOnTaskId ? this.findById(dependsOnTaskId) : null;

    if (dependsOnTask && subtask.parent_task_id !== dependsOnTask.parent_task_id) {
      throw new Error('Dipendenze possono essere impostate solo tra subtask dello stesso parent');
    }

    // Check for circular dependencies
    if (dependsOnTaskId && this.hasCircularDependency(subtaskId, dependsOnTaskId)) {
      throw new Error('Dipendenza circolare rilevata');
    }

    return this.update(subtaskId, { depends_on_task_id: dependsOnTaskId });
  }

  // Check for circular dependencies
  static hasCircularDependency(subtaskId, dependsOnTaskId) {
    if (subtaskId === dependsOnTaskId) return true;

    const dependsOnTask = this.findById(dependsOnTaskId);
    if (!dependsOnTask || !dependsOnTask.depends_on_task_id) return false;

    return this.hasCircularDependency(subtaskId, dependsOnTask.depends_on_task_id);
  }

  // Convert existing task to subtask of another task
  static convertToSubtask(taskId, parentTaskId) {
    const task = this.findById(taskId);
    const parentTask = this.findById(parentTaskId);

    if (!task || !parentTask) {
      throw new Error('Task o parent task non trovato');
    }

    // Prevent converting a parent task to its own subtask (circular reference)
    if (taskId === parentTaskId) {
      throw new Error('Un task non può essere subtask di se stesso');
    }

    // Check if parentTask is a subtask of task (would create circular reference)
    const parentOfParent = this.getParentTask(parentTaskId);
    if (parentOfParent && parentOfParent.id === taskId) {
      throw new Error('Conversione creerebbe una referenza circolare');
    }

    // Calculate order_index
    const siblings = this.getSubtasks(parentTaskId);
    const orderIndex = siblings.length;

    return this.update(taskId, {
      parent_task_id: parentTaskId,
      order_index: orderIndex,
      project_id: parentTask.project_id || task.project_id
    });
  }

  // Promote subtask to independent task
  static promoteToTask(subtaskId) {
    const subtask = this.findById(subtaskId);
    if (!subtask) {
      throw new Error('Subtask non trovato');
    }

    if (!subtask.parent_task_id) {
      throw new Error('Il task è già indipendente');
    }

    return this.update(subtaskId, {
      parent_task_id: null,
      order_index: 0,
      depends_on_task_id: null // Remove dependencies when promoting
    });
  }

  // Quick toggle subtask completion
  static toggleComplete(taskId) {
    const task = this.findById(taskId);
    if (!task) {
      throw new Error('Task non trovato');
    }

    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    return this.update(taskId, {
      status: newStatus,
      completed_at: completedAt
    });
  }

  // Bulk complete all subtasks
  static bulkCompleteSubtasks(parentTaskId) {
    const subtasks = this.getSubtasks(parentTaskId);
    const updateStmt = db.prepare(`
      UPDATE tasks
      SET status = 'completed', completed_at = datetime('now', '+1 hour')
      WHERE id = ? AND status != 'completed'
    `);

    subtasks.forEach(subtask => {
      updateStmt.run(subtask.id);
    });

    return this.getSubtasks(parentTaskId);
  }

  // Bulk delete subtasks
  static bulkDeleteSubtasks(parentTaskId, subtaskIds) {
    const deleteStmt = db.prepare('DELETE FROM tasks WHERE id = ? AND parent_task_id = ?');

    subtaskIds.forEach(subtaskId => {
      deleteStmt.run(subtaskId, parentTaskId);
    });

    return this.getSubtasks(parentTaskId);
  }

  // Management Dashboard methods

  // Get all blocked tasks with details
  static getBlockedTasks() {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name,
        (u1.first_name || ' ' || u1.last_name) as assigned_to_name,
        CAST((julianday('now', '+1 hour') - julianday(t.created_at)) AS INTEGER) as days_blocked
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      WHERE t.status = 'blocked'
      ORDER BY days_blocked DESC
    `);
    return stmt.all();
  }

  // Get tasks waiting for clarification
  static getWaitingClarification() {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name,
        (u1.first_name || ' ' || u1.last_name) as assigned_to_name,
        CAST((julianday('now', '+1 hour') - julianday(t.created_at)) AS INTEGER) as days_waiting
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      WHERE t.status = 'waiting_clarification'
      ORDER BY days_waiting DESC
    `);
    return stmt.all();
  }

  // Get overdue tasks
  static getOverdueTasks() {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name,
        (u1.first_name || ' ' || u1.last_name) as assigned_to_name,
        CAST((julianday('now', '+1 hour') - julianday(t.deadline)) AS INTEGER) as days_overdue
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      WHERE t.deadline IS NOT NULL
        AND date(t.deadline) < date('now', '+1 hour')
        AND t.status != 'completed'
      ORDER BY days_overdue DESC
    `);
    return stmt.all();
  }

  // Get tasks approaching deadline (within 3 days)
  static getApproachingDeadline() {
    const stmt = db.prepare(`
      SELECT
        t.*,
        p.name as project_name,
        (u1.first_name || ' ' || u1.last_name) as assigned_to_name,
        CAST((julianday(t.deadline) - julianday('now', '+1 hour')) AS INTEGER) as days_until_deadline
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      WHERE t.deadline IS NOT NULL
        AND date(t.deadline) BETWEEN date('now', '+1 hour') AND date('now', '+4 days')
        AND t.status != 'completed'
      ORDER BY days_until_deadline ASC
    `);
    return stmt.all();
  }

  // Get comprehensive alerts for management dashboard
  static getManagementAlerts() {
    const blocked = this.getBlockedTasks();
    const waiting = this.getWaitingClarification();
    const overdue = this.getOverdueTasks();
    const approaching = this.getApproachingDeadline();

    return {
      blocked: blocked.slice(0, 10), // Top 10
      waiting_clarification: waiting.slice(0, 10),
      overdue: overdue.slice(0, 10),
      approaching_deadline: approaching.slice(0, 10),
      summary: {
        total_alerts: blocked.length + waiting.length + overdue.length,
        blocked_count: blocked.length,
        waiting_count: waiting.length,
        overdue_count: overdue.length,
        approaching_count: approaching.length
      }
    };
  }

  // Get velocity metrics (tasks completed per week)
  static getVelocityMetrics(weeks = 4) {
    const stmt = db.prepare(`
      SELECT
        strftime('%Y-W%W', completed_at) as week,
        COUNT(*) as completed_count,
        SUM(time_spent) as total_time_spent
      FROM tasks
      WHERE completed_at IS NOT NULL
        AND completed_at >= date('now', '-${weeks * 7} days')
      GROUP BY week
      ORDER BY week DESC
    `);
    return stmt.all();
  }
}

export default Task;
