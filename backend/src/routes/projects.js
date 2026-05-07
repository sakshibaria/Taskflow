// src/routes/projects.js
const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/projectController');
const taskCtrl = require('../controllers/taskController');
const { authenticate, requireProjectRole } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');

router.use(authenticate);

router.get('/', ctrl.list);

router.post('/',
  [
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name required'),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Invalid color'),
  ],
  validate, ctrl.create
);

router.get('/:projectId', ctrl.getById);

router.patch('/:projectId',
  requireProjectRole(['admin']),
  [body('name').optional().trim().isLength({ min: 1, max: 200 })],
  validate, ctrl.update
);

router.delete('/:projectId',
  requireProjectRole(['admin']),
  ctrl.delete
);

router.post('/:projectId/members',
  requireProjectRole(['admin']),
  [body('email').isEmail().withMessage('Valid email required')],
  validate, ctrl.addMember
);

router.delete('/:projectId/members/:userId',
  requireProjectRole(['admin']),
  ctrl.removeMember
);

router.patch('/:projectId/members/:userId/role',
  requireProjectRole(['admin']),
  [body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member')],
  validate, ctrl.updateMemberRole
);

router.get('/:projectId/activity', ctrl.getActivity);

// Tasks under project
router.get('/:projectId/tasks', taskCtrl.listByProject);
router.post('/:projectId/tasks',
  [body('title').trim().isLength({ min: 1, max: 300 }).withMessage('Title required')],
  validate, taskCtrl.create
);

module.exports = router;
