// src/routes/tasks.js
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/my', ctrl.getMyTasks);
router.get('/dashboard', ctrl.getDashboard);
router.get('/notifications', ctrl.getNotifications);
router.post('/notifications/read', ctrl.markNotificationRead);

router.get('/:taskId', ctrl.getById);
router.patch('/:taskId', ctrl.update);
router.delete('/:taskId', ctrl.delete);
router.patch('/:taskId/status',
  [body('status').isIn(['todo', 'in_progress', 'review', 'done'])],
  validate, ctrl.updateStatus
);

router.post('/:taskId/comments',
  [body('content').trim().isLength({ min: 1 }).withMessage('Comment required')],
  validate, ctrl.addComment
);

module.exports = router;
