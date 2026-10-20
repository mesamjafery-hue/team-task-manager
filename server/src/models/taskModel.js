const db = require('../config/database');

function formatTask(task) {
  if (!task) return null;
  let formattedDueDate = null;
  if (task.due_date) {
    if (typeof task.due_date === 'string') {
      formattedDueDate = task.due_date.split('T')[0];
    } else if (task.due_date instanceof Date) {
      formattedDueDate = task.due_date.toISOString().split('T')[0];
    } else {
      formattedDueDate = String(task.due_date).split('T')[0];
    }
  }
  return {
    ...task,
    due_date: formattedDueDate,
  };
}

const taskModel = {
  // Find tasks authorized for the user with multi-dimensional filtering
  async findFiltered({ userId, teamId, assigneeId, status, priority, isOverdue, search, myTasksOnly }) {
    let sql = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.team_id,
        t.created_by,
        t.assigned_to,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.updated_at,
        team.name AS team_name,
        creator.name AS creator_name,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email,
        CASE 
          WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status != 'Completed' THEN true 
          ELSE false 
        END AS is_overdue
      FROM tasks t
      INNER JOIN teams team ON t.team_id = team.id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)
    `;

    const params = [userId];

    if (teamId) {
      params.push(parseInt(teamId, 10));
      sql += ` AND t.team_id = $${params.length}`;
    }

    if (assigneeId) {
      if (assigneeId === 'unassigned') {
        sql += ` AND t.assigned_to IS NULL`;
      } else {
        params.push(parseInt(assigneeId, 10));
        sql += ` AND t.assigned_to = $${params.length}`;
      }
    }

    if (myTasksOnly) {
      params.push(userId);
      sql += ` AND t.assigned_to = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      sql += ` AND t.priority = $${params.length}`;
    }

    if (isOverdue === 'true' || isOverdue === true) {
      sql += ` AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status != 'Completed'`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(t.title) LIKE $${params.length} OR LOWER(COALESCE(t.description, '')) LIKE $${params.length})`;
    }

    sql += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;

    const result = await db.query(sql, params);
    return result.rows.map(formatTask);
  },

  // Find task by ID ensuring user has team access
  async findById(taskId, userId) {
    const sql = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.team_id,
        t.created_by,
        t.assigned_to,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.updated_at,
        team.name AS team_name,
        creator.name AS creator_name,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email,
        tm.role AS user_role,
        CASE 
          WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status != 'Completed' THEN true 
          ELSE false 
        END AS is_overdue
      FROM tasks t
      INNER JOIN teams team ON t.team_id = team.id
      INNER JOIN team_members tm ON tm.team_id = t.team_id AND tm.user_id = $2
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      WHERE t.id = $1
    `;
    const result = await db.query(sql, [taskId, userId]);
    return formatTask(result.rows[0] || null);
  },

  // Create new task
  async create({ title, description, teamId, createdBy, assignedTo, status = 'To Do', priority = 'Medium', dueDate = null }) {
    const sql = `
      INSERT INTO tasks (title, description, team_id, created_by, assigned_to, status, priority, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, description, team_id, created_by, assigned_to, status, priority, due_date, created_at, updated_at
    `;
    const result = await db.query(sql, [
      title.trim(),
      description ? description.trim() : null,
      teamId,
      createdBy,
      assignedTo || null,
      status,
      priority,
      dueDate || null,
    ]);
    return formatTask(result.rows[0]);
  },

  // Update existing task
  async update(taskId, updates) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(updates.title.trim());
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(updates.description ? updates.description.trim() : null);
    }
    if (updates.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramIndex++}`);
      params.push(updates.assignedTo || null);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }
    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      params.push(updates.priority);
    }
    if (updates.dueDate !== undefined) {
      fields.push(`due_date = $${paramIndex++}`);
      params.push(updates.dueDate || null);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(taskId);

    const sql = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, title, description, team_id, created_by, assigned_to, status, priority, due_date, created_at, updated_at
    `;

    const result = await db.query(sql, params);
    return formatTask(result.rows[0] || null);
  },

  // Delete task
  async delete(taskId) {
    const result = await db.query(`DELETE FROM tasks WHERE id = $1 RETURNING id`, [taskId]);
    return result.rows[0] || null;
  },

  // Real database metrics calculation for user dashboard
  async getUserDashboardStats(userId) {
    const teamsRes = await db.query(
      `SELECT COUNT(DISTINCT team_id)::int AS total_teams FROM team_members WHERE user_id = $1`,
      [userId]
    );

    const tasksSql = `
      SELECT 
        COUNT(t.id)::int AS total_tasks,
        COUNT(CASE WHEN t.assigned_to = $1 THEN 1 END)::int AS my_tasks,
        COUNT(CASE WHEN t.status = 'In Progress' THEN 1 END)::int AS in_progress_tasks,
        COUNT(CASE WHEN t.status = 'Completed' THEN 1 END)::int AS completed_tasks,
        COUNT(CASE WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status != 'Completed' THEN 1 END)::int AS overdue_tasks,
        COUNT(CASE WHEN t.due_date IS NOT NULL AND t.due_date >= CURRENT_DATE AND t.status != 'Completed' THEN 1 END)::int AS due_soon_tasks
      FROM tasks t
      WHERE t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $1)
    `;
    const tasksRes = await db.query(tasksSql, [userId]);
    const row = tasksRes.rows[0] || {};
    const totalTeams = parseInt(teamsRes.rows[0]?.total_teams || 0, 10);

    return {
      totalTeams,
      totalTasks: parseInt(row.total_tasks || 0, 10),
      myTasks: parseInt(row.my_tasks || 0, 10),
      inProgressTasks: parseInt(row.in_progress_tasks || 0, 10),
      completedTasks: parseInt(row.completed_tasks || 0, 10),
      overdueTasks: parseInt(row.overdue_tasks || 0, 10),
      dueSoonTasks: parseInt(row.due_soon_tasks || 0, 10),
    };
  },
};

module.exports = taskModel;
