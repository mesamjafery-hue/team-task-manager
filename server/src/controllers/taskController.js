const taskModel = require('../models/taskModel');
const teamModel = require('../models/teamModel');
const memberModel = require('../models/memberModel');

const taskController = {
  // GET /api/tasks - List authorized tasks with filters
  async listTasks(req, res, next) {
    try {
      const {
        teamId,
        assigneeId,
        status,
        priority,
        isOverdue,
        search,
        myTasks,
      } = req.query;

      // If teamId is specified, verify current user is a member of that team
      if (teamId) {
        const isMember = await memberModel.isMember(parseInt(teamId, 10), req.user.id);
        if (!isMember) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not belong to this team.',
          });
        }
      }

      const tasks = await taskModel.findFiltered({
        userId: req.user.id,
        teamId,
        assigneeId,
        status,
        priority,
        isOverdue,
        search,
        myTasksOnly: myTasks === 'true',
      });

      return res.status(200).json({
        success: true,
        count: tasks.length,
        tasks,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tasks/:id - Get single task
  async getTask(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const task = await taskModel.findById(taskId, req.user.id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or you are not authorized to view it.',
        });
      }

      return res.status(200).json({
        success: true,
        task,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/tasks - Create task
  async createTask(req, res, next) {
    try {
      const {
        title,
        description,
        teamId,
        assignedTo,
        status = 'To Do',
        priority = 'Medium',
        dueDate,
      } = req.body;

      // 1. Verify team exists and current user belongs to it
      const callerRole = await teamModel.getUserRole(teamId, req.user.id);
      if (!callerRole) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You are not a member of the selected team.',
        });
      }

      // 2. If assignedTo is provided, verify assignee belongs to the team
      if (assignedTo) {
        const isAssigneeInTeam = await memberModel.isMember(teamId, parseInt(assignedTo, 10));
        if (!isAssigneeInTeam) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user does not belong to the selected team.',
          });
        }
      }

      const created = await taskModel.create({
        title,
        description,
        teamId,
        createdBy: req.user.id,
        assignedTo: assignedTo ? parseInt(assignedTo, 10) : null,
        status,
        priority,
        dueDate: dueDate || null,
      });

      // Fetch enriched representation
      const fullTask = await taskModel.findById(created.id, req.user.id);

      return res.status(201).json({
        success: true,
        message: 'Task created successfully.',
        task: fullTask || created,
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/tasks/:id - Update task
  async updateTask(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const existingTask = await taskModel.findById(taskId, req.user.id);

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or access denied.',
        });
      }

      const {
        title,
        description,
        assignedTo,
        status,
        priority,
        dueDate,
      } = req.body;

      // If assignedTo is being updated, verify that user belongs to the team
      if (assignedTo !== undefined && assignedTo !== null && assignedTo !== '') {
        const isAssigneeInTeam = await memberModel.isMember(existingTask.team_id, parseInt(assignedTo, 10));
        if (!isAssigneeInTeam) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user does not belong to this team.',
          });
        }
      }

      const updated = await taskModel.update(taskId, {
        title,
        description,
        assignedTo: assignedTo === '' || assignedTo === null ? null : assignedTo,
        status,
        priority,
        dueDate: dueDate === '' || dueDate === null ? null : dueDate,
      });

      const fullTask = await taskModel.findById(taskId, req.user.id);

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully.',
        task: fullTask || updated,
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/tasks/:id - Delete task
  async deleteTask(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      const existingTask = await taskModel.findById(taskId, req.user.id);

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or access denied.',
        });
      }

      // Allow deletion if caller is team owner, task creator, or task assignee
      const callerRole = await teamModel.getUserRole(existingTask.team_id, req.user.id);
      const isCreator = existingTask.created_by === req.user.id;
      const isOwner = callerRole === 'owner';

      if (!isOwner && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only the team owner or task creator can delete this task.',
        });
      }

      await taskModel.delete(taskId);

      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tasks/dashboard/stats - Real database calculated dashboard statistics
  async getDashboardStats(req, res, next) {
    try {
      const stats = await taskModel.getUserDashboardStats(req.user.id);
      return res.status(200).json({
        success: true,
        stats,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = taskController;
