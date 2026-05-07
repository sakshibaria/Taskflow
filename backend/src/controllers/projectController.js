// src/controllers/projectController.js
const { query } = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, 
        u.name as owner_name,
        pm.role as my_role,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') as done_count,
        COUNT(DISTINCT pm2.user_id) as member_count
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       JOIN users u ON u.id = p.owner_id
       LEFT JOIN tasks t ON t.project_id = p.id
       LEFT JOIN project_members pm2 ON pm2.project_id = p.id
       GROUP BY p.id, u.name, pm.role
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, color, due_date } = req.body;

    const projectRes = await query(
      `INSERT INTO projects (name, description, color, owner_id, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, color || '#6366f1', req.user.id, due_date || null]
    );
    const project = projectRes.rows[0];

    // Add creator as admin member
    await query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [project.id, req.user.id]
    );

    await logActivity(req.user.id, project.id, null, 'created_project', { project_name: name });

    res.status(201).json({ project: { ...project, my_role: 'admin', task_count: 0, done_count: 0, member_count: 1 } });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const projectRes = await query(
      `SELECT p.*, u.name as owner_name, pm.role as my_role
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       JOIN users u ON u.id = p.owner_id
       WHERE p.id = $2`,
      [req.user.id, projectId]
    );

    if (!projectRes.rows.length) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const membersRes = await query(
      `SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.role, u.name`,
      [projectId]
    );

    res.json({ project: projectRes.rows[0], members: membersRes.rows });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, color, status, due_date } = req.body;

    const result = await query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        color = COALESCE($3, color),
        status = COALESCE($4, status),
        due_date = COALESCE($5, due_date),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, description, color, status, due_date, projectId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    await query('DELETE FROM projects WHERE id = $1 AND owner_id = $2', [projectId, req.user.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { email, role = 'member' } = req.body;

    const userRes = await query('SELECT id, name, email, avatar_color FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!userRes.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    await query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3`,
      [projectId, user.id, role]
    );

    await createNotification(user.id, 'project_invite', 'Project Invitation', `You've been added to a project`);
    res.json({ member: { ...user, role } });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    
    // Can't remove the project owner
    const project = await query('SELECT owner_id FROM projects WHERE id = $1', [projectId]);
    if (project.rows[0]?.owner_id === userId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body;

    await query(
      'UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3',
      [role, projectId, userId]
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    next(err);
  }
};

exports.getActivity = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await query(
      `SELECT al.*, u.name as user_name, u.avatar_color
       FROM activity_log al
       JOIN users u ON u.id = al.user_id
       WHERE al.project_id = $1
       ORDER BY al.created_at DESC LIMIT 50`,
      [projectId]
    );
    res.json({ activity: result.rows });
  } catch (err) {
    next(err);
  }
};

// Helpers
async function logActivity(userId, projectId, taskId, action, meta = {}) {
  try {
    await query(
      `INSERT INTO activity_log (user_id, project_id, task_id, action, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, projectId, taskId, action, JSON.stringify(meta)]
    );
  } catch (e) { /* non-critical */ }
}

async function createNotification(userId, type, title, message) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4)`,
      [userId, type, title, message]
    );
  } catch (e) { /* non-critical */ }
}
