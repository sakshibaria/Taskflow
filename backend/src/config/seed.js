// src/config/seed.js
const bcrypt = require('bcryptjs');
const { pool } = require('./database');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create demo users
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const memberHash = await bcrypt.hash('Member@123', 12);

    const adminRes = await client.query(`
      INSERT INTO users (name, email, password_hash, avatar_color)
      VALUES ('Alex Johnson', 'admin@taskflow.dev', $1, '#6366f1')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [adminHash]);

    const member1Res = await client.query(`
      INSERT INTO users (name, email, password_hash, avatar_color)
      VALUES ('Sam Rivera', 'sam@taskflow.dev', $1, '#10b981')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [memberHash]);

    const member2Res = await client.query(`
      INSERT INTO users (name, email, password_hash, avatar_color)
      VALUES ('Jordan Lee', 'jordan@taskflow.dev', $1, '#f59e0b')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [memberHash]);

    const adminId = adminRes.rows[0].id;
    const member1Id = member1Res.rows[0].id;
    const member2Id = member2Res.rows[0].id;

    // Create sample project
    const projectRes = await client.query(`
      INSERT INTO projects (name, description, color, owner_id, due_date)
      VALUES ('Website Redesign', 'Complete overhaul of the company website with new brand guidelines', '#6366f1', $1, NOW() + INTERVAL '30 days')
      RETURNING id
    `, [adminId]);
    const projectId = projectRes.rows[0].id;

    // Add members to project
    await client.query(`
      INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'admin')
      ON CONFLICT (project_id, user_id) DO NOTHING
    `, [projectId, adminId]);

    await client.query(`
      INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'member')
      ON CONFLICT (project_id, user_id) DO NOTHING
    `, [projectId, member1Id]);

    await client.query(`
      INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'member')
      ON CONFLICT (project_id, user_id) DO NOTHING
    `, [projectId, member2Id]);

    // Create sample tasks
    const tasks = [
      { title: 'Design new homepage mockup', status: 'done', priority: 'high', assignee: member1Id, due: '2024-12-01' },
      { title: 'Set up CI/CD pipeline', status: 'in_progress', priority: 'urgent', assignee: member2Id, due: '2024-11-20' },
      { title: 'Write API documentation', status: 'in_progress', priority: 'medium', assignee: adminId, due: '2024-11-25' },
      { title: 'Implement authentication module', status: 'review', priority: 'high', assignee: member1Id, due: '2024-11-18' },
      { title: 'Database schema optimization', status: 'todo', priority: 'medium', assignee: member2Id, due: '2024-12-05' },
      { title: 'Mobile responsive design', status: 'todo', priority: 'high', assignee: member1Id, due: '2024-11-15' },
    ];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      await client.query(`
        INSERT INTO tasks (title, status, priority, project_id, assignee_id, reporter_id, due_date, order_index)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [t.title, t.status, t.priority, projectId, t.assignee, adminId, t.due, i]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed');
    console.log('📧 Admin: admin@taskflow.dev / Admin@123');
    console.log('📧 Member: sam@taskflow.dev / Member@123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
