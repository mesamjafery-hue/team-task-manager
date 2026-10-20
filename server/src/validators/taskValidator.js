const { body, param, query } = require('express-validator');

const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required.')
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters long.'),
  body('teamId')
    .notEmpty()
    .withMessage('Team selection is required.')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID.'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters.'),
  body('assignedTo')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Invalid assigned user ID.'),
  body('status')
    .optional()
    .isIn(['To Do', 'In Progress', 'Completed'])
    .withMessage('Status must be "To Do", "In Progress", or "Completed".'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be "Low", "Medium", or "High".'),
  body('dueDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Due date must be a valid date format (YYYY-MM-DD).'),
];

const updateTaskValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid task ID parameter.'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task title cannot be empty.')
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters.'),
  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters.'),
  body('assignedTo')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === '' || val === undefined) return true;
      if (!Number.isInteger(Number(val)) || Number(val) < 1) {
        throw new Error('Assigned user ID must be a positive integer.');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['To Do', 'In Progress', 'Completed'])
    .withMessage('Status must be "To Do", "In Progress", or "Completed".'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Priority must be "Low", "Medium", or "High".'),
  body('dueDate')
    .optional({ nullable: true })
    .custom((val) => {
      if (val === null || val === '' || val === undefined) return true;
      if (isNaN(Date.parse(val))) {
        throw new Error('Due date must be a valid date.');
      }
      return true;
    }),
];

const queryTasksValidator = [
  query('teamId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer.'),
  query('assigneeId')
    .optional()
    .custom((val) => {
      if (val === 'unassigned') return true;
      if (!Number.isInteger(Number(val)) || Number(val) < 1) {
        throw new Error('Assignee ID must be a positive integer or "unassigned".');
      }
      return true;
    }),
  query('status')
    .optional()
    .isIn(['To Do', 'In Progress', 'Completed'])
    .withMessage('Invalid status filter.'),
  query('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid priority filter.'),
  query('isOverdue')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isOverdue must be boolean.'),
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  queryTasksValidator,
};
