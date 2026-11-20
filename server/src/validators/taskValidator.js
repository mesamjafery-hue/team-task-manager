const { body, query } = require('express-validator');
const { stripHtml, idParam } = require('./common');

const TASK_STATUSES = ['To Do', 'In Progress', 'Completed'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High'];

const isEmpty = (val) => val === null || val === '' || val === undefined;

const taskIdParam = [idParam('id', 'task ID')];

const createTaskValidator = [
  body('title')
    .trim()
    .customSanitizer(stripHtml)
    .notEmpty()
    .withMessage('Task title is required.')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters.'),
  body('teamId')
    .notEmpty()
    .withMessage('Team selection is required.')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID.')
    .toInt(),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer(stripHtml)
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters.'),
  body('assignedTo')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Invalid assigned user ID.')
    .toInt(),
  body('status')
    .optional()
    .isIn(TASK_STATUSES)
    .withMessage('Status must be "To Do", "In Progress", or "Completed".'),
  body('priority')
    .optional()
    .isIn(TASK_PRIORITIES)
    .withMessage('Priority must be "Low", "Medium", or "High".'),
  body('dueDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Due date must be a valid date format (YYYY-MM-DD).'),
];

const updateTaskValidator = [
  idParam('id', 'task ID'),
  body('title')
    .optional()
    .trim()
    .customSanitizer(stripHtml)
    .notEmpty()
    .withMessage('Task title cannot be empty.')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters.'),
  body('description')
    .optional({ values: 'null' })
    .trim()
    .customSanitizer(stripHtml)
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters.'),
  body('assignedTo')
    .optional({ values: 'null' })
    .custom((val) => {
      if (isEmpty(val)) return true;
      if (!Number.isInteger(Number(val)) || Number(val) < 1) {
        throw new Error('Assigned user ID must be a positive integer.');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(TASK_STATUSES)
    .withMessage('Status must be "To Do", "In Progress", or "Completed".'),
  body('priority')
    .optional()
    .isIn(TASK_PRIORITIES)
    .withMessage('Priority must be "Low", "Medium", or "High".'),
  body('dueDate')
    .optional({ values: 'null' })
    .custom((val) => {
      if (isEmpty(val)) return true;
      if (isNaN(Date.parse(val))) {
        throw new Error('Due date must be a valid date.');
      }
      return true;
    }),
];

const queryTasksValidator = [
  query('teamId')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer.'),
  query('assigneeId')
    .optional({ values: 'falsy' })
    .custom((val) => {
      if (val === 'unassigned') return true;
      if (!Number.isInteger(Number(val)) || Number(val) < 1) {
        throw new Error('Assignee ID must be a positive integer or "unassigned".');
      }
      return true;
    }),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(TASK_STATUSES)
    .withMessage('Invalid status filter.'),
  query('priority')
    .optional({ values: 'falsy' })
    .isIn(TASK_PRIORITIES)
    .withMessage('Invalid priority filter.'),
  query('isOverdue')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isOverdue must be boolean.'),
  query('myTasks')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('myTasks must be boolean.'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search text cannot exceed 200 characters.'),
];

const remindersValidator = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('days must be between 1 and 30.')
    .toInt(),
];

module.exports = {
  taskIdParam,
  createTaskValidator,
  updateTaskValidator,
  queryTasksValidator,
  remindersValidator,
};
