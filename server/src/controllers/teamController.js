const teamModel = require('../models/teamModel');
const memberModel = require('../models/memberModel');

const teamController = {
  // GET /api/teams - List all teams current user belongs to
  async listTeams(req, res, next) {
    try {
      const teams = await teamModel.findUserTeams(req.user.id);
      return res.status(200).json({
        success: true,
        count: teams.length,
        teams,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/teams - Create a new team
  async createTeam(req, res, next) {
    try {
      const { name, description } = req.body;
      const team = await teamModel.create({
        name,
        description,
        ownerId: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message: 'Team created successfully.',
        team: {
          ...team,
          user_role: 'owner',
          owner_name: req.user.name,
          member_count: 1,
          task_count: 0,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/teams/:id - Get single team details
  async getTeamDetails(req, res, next) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const team = await teamModel.findById(teamId);

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found.',
        });
      }

      // Check if user is a member
      const userRole = await teamModel.getUserRole(teamId, req.user.id);
      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not belong to this team.',
        });
      }

      return res.status(200).json({
        success: true,
        team: {
          ...team,
          user_role: userRole,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/teams/:id - Update team details (Owner only)
  async updateTeam(req, res, next) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const { name, description } = req.body;

      // Verify owner
      const role = await teamModel.getUserRole(teamId, req.user.id);
      if (role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only the team owner can edit team settings.',
        });
      }

      const updatedTeam = await teamModel.update(teamId, { name, description });
      if (!updatedTeam) {
        return res.status(404).json({
          success: false,
          message: 'Team not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Team updated successfully.',
        team: updatedTeam,
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/teams/:id - Delete a team (Owner only)
  async deleteTeam(req, res, next) {
    try {
      const teamId = parseInt(req.params.id, 10);

      // Verify owner
      const role = await teamModel.getUserRole(teamId, req.user.id);
      if (role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only the team owner can delete this team.',
        });
      }

      await teamModel.delete(teamId);
      return res.status(200).json({
        success: true,
        message: 'Team deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = teamController;
