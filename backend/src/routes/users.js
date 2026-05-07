// src/routes/users.js
const router = require('express').Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const result = await query(
      `SELECT id, name, email, avatar_color FROM users
       WHERE (name ILIKE $1 OR email ILIKE $1) AND id != $2
       LIMIT 10`,
      [`%${q}%`, req.user.id]
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
