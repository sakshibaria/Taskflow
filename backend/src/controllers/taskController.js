// src/controllers/taskController.js
const { query } = require('../config/database');

const TASK_SELECT = `
  SELECT t.*,
    u_assignee.name as assignee_name, u_assignee.email as assignee_email, u_assignee.avatar_color as assignee_color,
    u_reporter.name as reporter_name, u_reporter.avatar_color as reporter_color,
    p.name as project_name, p.color as project_color,
    COUNT(DISTINCT tc.id) as comment_count
  FROM tasks t
  LEFT JOIN users u_assignee ON u_assignee.id = t.assignee_id
  JOIN users u_reporter ON u_reporter.id = t.reporter_id
  JOIN projects p ON p.id = t.project_id
  LEFT JOIN task_comments tc ON tc.task_id = t.id
`;

exports.listByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignee_id, search } = req.query;

    let conditions = ['t.project_id = $1'];
    let params = [projectId];
    let paramIdx = 2;

    if (status) { conditions.push(`t.status = $${paramIdx++}`); params.push(status); }
    if (priority) { conditions.push(`t.priority = $${paramIdx++}`); params.push(priority); }
    if (assignee_id) { conditions.push(`t.assignee_id = $${paramIdx++}`); params.push(assignee_id); }
    if (search) { conditions.push(`t.title ILIKE $${paramIdx++}`); params.push(`%${search}%`); }

    const result = await query(
      `${TASK_SELECT}
       WHERE ${conditions.join(' AND ')}
       GROUP BY t.id, u_assignee.name, u_assignee.email, u_assignee.avatar_color,
         u_reporter.name, u_reporter.avatar_color, p.name, p.color
       ORDER BY t.order_index, t.created_at DESC`,
      params
    );

    res.json({ tasks: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const { status } = req.query;
    let conditions = ['t.assignee_id = $1'];
    let params = [req.user.id];

    if (status) { conditions.push(`t.status = $2`); params.push(status); }

    const result = await query(
      `${TASK_SELECT}
       WHERE ${conditions.join(' AND ')}
       GROUP BY t.id, u_assignee.name, u_assignee.email, u_assignee.avatar_color,
         u_reporter.name, u_reporter.avatar_color, p.name, p.color
       ORDER BY
         CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         t.due_date ASC NULLS LAST`,
      params
    );

    res.json({ tasks: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Summary stats
    const statsRes = await query(
      `SELECT
        COUNT(*) FILTER (WHERE pm.user_id = $1) as total_projects,
        COUNT(DISTINCT t.id) FILTER (WHERE t.assignee_id = $1) as my_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.assignee_id = $1 AND t.status = 'done') as completed_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.assignee_id = $1 AND t.due_date < NOW() AND t.status != 'done') as overdue_tasks
       FROM project_members pm
       LEFT JOIN tasks t ON t.project_id = pm.project_id
       WHERE pm.user_id = $1`,
      [userId]
    );

    // Recent tasks
    const recentTasksRes = await query(
      `${TASK_SELECT}
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
       WHERE t.assignee_id = $1 AND t.status != 'done'
       GROUP BY t.id, u_assignee.name, u_assignee.email, u_assignee.avatar_color,
         u_reporter.name, u_reporter.avatar_color, p.name, p.color
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
       LIMIT 8`,
      [userId]
    );

    // Overdue tasks
    const overdueRes = await query(
      `${TASK_SELECT}
       WHERE t.assignee_id = $1 AND t.due_date < NOW() AND t.status != 'done'
       GROUP BY t.id, u_assignee.name, u_assignee.email, u_assignee.avatar_color,
         u_reporter.name, u_reporter.avatar_color, p.name, p.color
       ORDER BY t.due_date ASC`,
      [userId]
    );

    // Task status distribution
    const distributionRes = await query(
      `SELECT t.status, COUNT(*) as count
       FROM tasks t
       JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
       WHERE t.assignee_id = $1
       GROUP BY t.status`,
      [userId]
    );

    res.json({
      stats: statsRes.rows[0],
      recentTasks: recentTasksRes.rows,
      overdueTasks: overdueRes.rows,
      distribution: distributionRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, assignee_id, due_date, tags } = req.body;

    // Get max order
    const orderRes = await query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 as next_order FROM tasks WHERE project_id = $1',
      [projectId]
    );

    const result = await query(
      `INSERT INTO tasks (title, description, priority, project_id, assignee_id, reporter_id, due_date, tags, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, priority || 'medium', projectId, assignee_id || null,
       req.user.id, due_date || null, tags || [], orderRes.rows[0].next_order]
    );

    const task = result.rows[0];

    // Fetch full task with joins
    const fullTask = await query(
      `${TASK_SELECT}
       WHERE t.id = $1
       GROUP BY t.id, u_assignee.name, u_assignee.email, u_assignee.avatar_color,
         u_reporter.name, u_reporter.avatar_color, p.name, p.color`,
      [task.id]
    );

    if (assignee_id && assignee_id !== req.user.id) {
      await createNotification(assignee_id, 'task_assigned', 'New Task Assigned', `You were assigned: ${title}`);
    }

    res.status(201).json({ task: fullTask.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const taskRes = await query(
      `${TASK_SELECT}
       WHERE t.id = $1
       GROUP BY t.id, u_assignee.name, u_assignee.email, u_assignee.avatar_color,
         u_reporter.name, u_reporter.avatar_color, p.name, p.color`,
      [taskId]
    );

    if (!taskRes.rows.length) return res.status(404).json({ error: 'Task not found' });

    const commentsRes = await query(
      `SELECT tc.*, u.name as user_name, u.avatar_color
       FROM task_comments tc
       JOIN users u ON u.id = tc.user_id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at ASC`,
      [taskId]
    );

    res.json({ task: taskRes.rows[0], comments: commentsRes.rows });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, assignee_id, due_date, tags } = req.body;

    // Get old task for notification
    const oldTask = await query('SELECT * FROM tasks WHERE id = $1', [taskId]);

    const result = await query(
      `UPDATE tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assignee_id = CASE WHEN $5::uuid IS NOT NULL THEN $5::uuid ELSE assignee_id END,
        due_date = COALESCE($6, due_date),
        tags = COALESCE($7, tags),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, status, priority, assignee_id || null, due_date, tags, taskId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });

    const task = result.rows[0];

    // Notify on reassign
    if (assignee_id && assignee_id !== oldTask.rows[0]?.assignee_id && assignee_id !== req.user.id) {
      await createNotification(assignee_id, 'task_assigned', 'Task Assigned to You', `You were assigned: ${task.title}`);
    }

    const fullTask = await query(
      `${TASK_SELECT}
       WHERE t.id = $1
       GROUP BY t.id, u_assignee.name, u_assignee.email, u_assignee.avatar_color,
         u_reporter.name, u_reporter.avatar_color, p.name, p.color`,
      [taskId]
    );

    res.json({ task: fullTask.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const result = await query(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING project_id, title`,
      [status, taskId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Status updated', status });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    await query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    const result = await query(
      `INSERT INTO task_comments (task_id, user_id, content) VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, req.user.id, content]
    );

    const comment = result.rows[0];
    const full = await query(
      `SELECT tc.*, u.name as user_name, u.avatar_color
       FROM task_comments tc JOIN users u ON u.id = tc.user_id WHERE tc.id = $1`,
      [comment.id]
    );

    res.status(201).json({ comment: full.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
};

async function createNotification(userId, type, title, message) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)`,
      [userId, type, title, message]
    );
  } catch (e) { /* non-critical */ }
}
