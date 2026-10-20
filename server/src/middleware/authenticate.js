const teamModel = require('../models/teamModel');

// Middleware to ensure the user is authenticated via Passport session
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in.',
  });
}

// Middleware to ensure user is at least a member of the team
function ensureTeamMember(teamIdExtractor) {
  return async (req, res, next) => {
    try {
      const teamId = teamIdExtractor(req);
      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: 'Team ID is required to verify membership.',
        });
      }

      const role = await teamModel.getUserRole(teamId, req.user.id);
      if (!role) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a member of this team.',
        });
      }

      req.teamRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Middleware to ensure user is the owner of the team
function ensureTeamOwner(teamIdExtractor) {
  return async (req, res, next) => {
    try {
      const teamId = teamIdExtractor(req);
      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: 'Team ID is required to verify permissions.',
        });
      }

      const role = await teamModel.getUserRole(teamId, req.user.id);
      if (role !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only the team owner has permission to perform this action.',
        });
      }

      req.teamRole = 'owner';
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  ensureAuthenticated,
  ensureTeamMember,
  ensureTeamOwner,
};
