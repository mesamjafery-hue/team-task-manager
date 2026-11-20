const express = require('express');
const taskController = require('../controllers/taskController');
const { ensureAuthenticated } = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  taskIdParam,
  createTaskValidator,
  updateTaskValidator,
  queryTasksValidator,
  remindersValidator,
} = require('../validators/taskValidator');

const router = express.Router();

// All task routes require authentication
router.use(ensureAuthenticated);

// Static paths must be declared before /:id
router.get('/dashboard/stats', taskController.getDashboardStats);
router.get('/reminders', validate(remindersValidator), taskController.getReminders);

// Task CRUD and filtering
router.get('/', validate(queryTasksValidator), taskController.listTasks);
router.post('/', validate(createTaskValidator), taskController.createTask);
router.get('/:id', validate(taskIdParam), taskController.getTask);
router.patch('/:id', validate(updateTaskValidator), taskController.updateTask);
router.delete('/:id', validate(taskIdParam), taskController.deleteTask);

module.exports = router;
