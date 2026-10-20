const express = require('express');
const taskController = require('../controllers/taskController');
const { ensureAuthenticated } = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  createTaskValidator,
  updateTaskValidator,
  queryTasksValidator,
} = require('../validators/taskValidator');

const router = express.Router();

// All task routes require authentication
router.use(ensureAuthenticated);

// Dashboard stats endpoint (must be declared before /:id)
router.get('/dashboard/stats', taskController.getDashboardStats);

// Task CRUD and filter endpoints
router.get('/', validate(queryTasksValidator), taskController.listTasks);
router.post('/', validate(createTaskValidator), taskController.createTask);
router.get('/:id', taskController.getTask);
router.patch('/:id', validate(updateTaskValidator), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
