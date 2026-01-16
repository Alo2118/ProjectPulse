import db from '../config/database.js';

export const getWeeklyReport = async (req, res) => {
  try {
    const { from, to, user_id, project_id } = req.query;
    console.log('Report requested with params:', { from, to, user_id, project_id });
    
    // Default to current week if no dates provided
    const now = new Date();
    const defaultFrom = from || new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
    const defaultTo = to || new Date().toISOString().split('T')[0];
    console.log('Date range:', { defaultFrom, defaultTo });

    // PROJECT-CENTRIC QUERIES
    
    // 1. Progetti con dettagli completi (attività, tempo, milestone)
    let projectsQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        COUNT(DISTINCT t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo_tasks,
        SUM(CASE WHEN t.status != 'completed' AND t.deadline < date('now') THEN 1 ELSE 0 END) as overdue_tasks,
        ROUND(SUM(CASE WHEN t.status = 'completed' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(t.id), 0), 1) as completion_percentage,
        COUNT(DISTINCT m.id) as total_milestones,
        SUM(CASE WHEN m.status = 'completed' THEN 1 ELSE 0 END) as completed_milestones
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN milestones m ON p.id = m.project_id
      WHERE p.archived = 0
    `;
    const projectParams = [];
    
    if (project_id) {
      projectsQuery += ' AND p.id = ?';
      projectParams.push(project_id);
    }
    
    projectsQuery += ' GROUP BY p.id ORDER BY p.created_at DESC';
    const projects = db.prepare(projectsQuery).all(...projectParams);

    // 2. Ore lavorate per progetto (nel periodo)
    let hoursByProjectQuery = `
      SELECT 
        COALESCE(p.id, 0) as project_id,
        COALESCE(p.name, 'Senza progetto') as project_name,
        SUM(te.duration) as total_seconds,
        COUNT(DISTINCT te.user_id) as team_size,
        COUNT(te.id) as entries_count
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE DATE(te.started_at) BETWEEN ? AND ?
      AND te.ended_at IS NOT NULL
    `;
    const hoursByProjectParams = [defaultFrom, defaultTo];
    
    if (user_id) {
      hoursByProjectQuery += ' AND te.user_id = ?';
      hoursByProjectParams.push(user_id);
    }
    if (project_id) {
      hoursByProjectQuery += ' AND t.project_id = ?';
      hoursByProjectParams.push(project_id);
    }
    
    hoursByProjectQuery += ' GROUP BY COALESCE(p.id, 0) ORDER BY total_seconds DESC';
    const hoursByProject = db.prepare(hoursByProjectQuery).all(...hoursByProjectParams);

    // 3. Attività completate nel periodo (per progetto)
    let completedActivitiesQuery = `
      SELECT 
        COALESCE(p.id, 0) as project_id,
        COALESCE(p.name, 'Senza progetto') as project_name,
        t.id as task_id,
        t.title as task_title,
        t.completed_at,
        t.time_spent,
        u.first_name || ' ' || u.last_name as completed_by
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.status = 'completed'
      AND DATE(t.completed_at) BETWEEN ? AND ?
    `;
    const completedParams = [defaultFrom, defaultTo];
    
    if (user_id) {
      completedActivitiesQuery += ' AND t.assigned_to = ?';
      completedParams.push(user_id);
    }
    if (project_id) {
      completedActivitiesQuery += ' AND t.project_id = ?';
      completedParams.push(project_id);
    }
    
    completedActivitiesQuery += ' ORDER BY project_name, t.completed_at DESC';
    const completedActivities = db.prepare(completedActivitiesQuery).all(...completedParams);

    // 4. Attività in corso (per progetto)
    let ongoingActivitiesQuery = `
      SELECT 
        COALESCE(p.id, 0) as project_id,
        COALESCE(p.name, 'Senza progetto') as project_name,
        t.id as task_id,
        t.title as task_title,
        t.status,
        t.deadline,
        t.priority,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        CASE WHEN t.deadline < date('now') THEN 1 ELSE 0 END as is_overdue
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.status IN ('todo', 'in_progress')
    `;
    const ongoingParams = [];
    
    if (user_id) {
      ongoingActivitiesQuery += ' AND t.assigned_to = ?';
      ongoingParams.push(user_id);
    }
    if (project_id) {
      ongoingActivitiesQuery += ' AND t.project_id = ?';
      ongoingParams.push(project_id);
    }
    
    ongoingActivitiesQuery += ' ORDER BY project_name, is_overdue DESC, t.priority DESC, t.deadline ASC';
    const ongoingActivities = db.prepare(ongoingActivitiesQuery).all(...ongoingParams);

    // 5. Albero attività (progetto -> task -> subtask)
    let taskTreeQuery = `
      SELECT
        t.id,
        t.title,
        t.status,
        t.parent_task_id,
        t.project_id,
        COALESCE(p.name, 'Senza progetto') as project_name,
        t.deadline,
        t.priority,
        t.assigned_to,
        u.first_name || ' ' || u.last_name as assigned_to_name,
        SUM(
          CASE
            WHEN te.ended_at IS NOT NULL
              AND DATE(te.started_at) BETWEEN ? AND ?
            THEN te.duration
            ELSE 0
          END
        ) as period_seconds
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN time_entries te ON te.task_id = t.id
      WHERE 1=1
    `;
    const taskTreeParams = [defaultFrom, defaultTo];

    if (user_id) {
      taskTreeQuery += ' AND t.assigned_to = ?';
      taskTreeParams.push(user_id);
    }
    if (project_id) {
      taskTreeQuery += ' AND t.project_id = ?';
      taskTreeParams.push(project_id);
    }

    taskTreeQuery += ' GROUP BY t.id ORDER BY project_name, COALESCE(t.parent_task_id, t.id), t.order_index, t.created_at';
    const taskTree = db.prepare(taskTreeQuery).all(...taskTreeParams);

    // 6. Milestone raggiunte nel periodo
    let milestonesQuery = `
      SELECT 
        p.id as project_id,
        p.name as project_name,
        m.id as milestone_id,
        m.name as milestone_name,
        m.status,
        m.due_date,
        m.completed_at
      FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE 1=1
    `;
    const milestoneParams = [];
    
    if (project_id) {
      milestonesQuery += ' AND m.project_id = ?';
      milestoneParams.push(project_id);
    }
    
    milestonesQuery += ' ORDER BY p.name, m.due_date ASC';
    const milestones = db.prepare(milestonesQuery).all(...milestoneParams);

    // Summary totals
    const totalSeconds = hoursByProject.reduce((sum, p) => sum + (p.total_seconds || 0), 0);
    const totalCompleted = completedActivities.length;
    const totalOngoing = ongoingActivities.filter(a => a.status === 'in_progress').length;
    const totalTodo = ongoingActivities.filter(a => a.status === 'todo').length;
    const totalOverdue = ongoingActivities.filter(a => a.is_overdue).length;

    res.json({
      period: {
        from: defaultFrom,
        to: defaultTo
      },
      summary: {
        totalProjects: projects.length,
        totalSeconds,
        completedTasks: totalCompleted,
        inProgressTasks: totalOngoing,
        todoTasks: totalTodo,
        overdueTasks: totalOverdue
      },
      projects,
      hoursByProject,
      completedActivities,
      ongoingActivities,
      milestones,
      taskTree
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};
