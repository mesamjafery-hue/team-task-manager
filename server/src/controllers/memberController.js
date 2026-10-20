const teamModel = require('../models/teamModel');
const memberModel = require('../models/memberModel');
const userModel = require('../models/userModel');

const memberController = {
  // GET /api/teams/:id/members - List team members
  async listMembers(req, res, next) {
    try {
      const teamId = parseInt(req.params.id, 10);

      // Verify caller is a member
      const userRole = await teamModel.getUserRole(teamId, req.user.id);
      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not belong to this team.',
        });
      }

      const members = await memberModel.getTeamMembers(teamId);
      return res.status(200).json({
        success: true,
        count: members.length,
        members,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/teams/:id/members - Add a registered user by email to team
  async addMember(req, res, next) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const { email, role = 'member' } = req.body;

      // Verify caller is owner
      const callerRole = await teamModel.getUserRole(teamId, req.user.id);
      if (callerRole !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only the team owner can add new members.',
        });
      }

      // Find user by email
      const targetUser = await userModel.findByEmailWithPassword(email);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'No registered user found with this email address.',
        });
      }

      // Check if already a member
      const alreadyMember = await memberModel.isMember(teamId, targetUser.id);
      if (alreadyMember) {
        return res.status(409).json({
          success: false,
          message: `${targetUser.name} (${targetUser.email}) is already a member of this team.`,
        });
      }

      const membership = await memberModel.addMember(teamId, targetUser.id, role);

      return res.status(201).json({
        success: true,
        message: `${targetUser.name} added to the team successfully.`,
        member: {
          membership_id: membership.id,
          team_id: teamId,
          user_id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: membership.role,
          joined_at: membership.joined_at,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/teams/:id/members/:userId - Remove member
  async removeMember(req, res, next) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const targetUserId = parseInt(req.params.userId, 10);

      const callerRole = await teamModel.getUserRole(teamId, req.user.id);
      if (!callerRole) {
        return res.status(403).json({
          success: false,
          message: 'Access denied.',
        });
      }

      // Check if caller is owner or removing themselves
      const isOwner = callerRole === 'owner';
      const isSelf = req.user.id === targetUserId;

      if (!isOwner && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. Only team owners can remove other members.',
        });
      }

      // Prevent removing the team owner
      const targetUserRole = await teamModel.getUserRole(teamId, targetUserId);
      if (targetUserRole === 'owner') {
        return res.status(400).json({
          success: false,
          message: 'The team owner cannot be removed from the team.',
        });
      }

      const removed = await memberModel.removeMember(teamId, targetUserId);
      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'User is not a member of this team.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Member removed from team successfully.',
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/teams/:id/invite - Bonus Feature: Simulated Email Invitation
  async inviteMember(req, res, next) {
    try {
      const teamId = parseInt(req.params.id, 10);
      const { email } = req.body;

      const callerRole = await teamModel.getUserRole(teamId, req.user.id);
      if (callerRole !== 'owner') {
        return res.status(403).json({
          success: false,
          message: 'Only team owners can send invitations.',
        });
      }

      // Check if already in system
      const existingUser = await userModel.findByEmailWithPassword(email);
      if (existingUser) {
        const alreadyMember = await memberModel.isMember(teamId, existingUser.id);
        if (alreadyMember) {
          return res.status(409).json({
            success: false,
            message: 'User is already a member of this team.',
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `[Simulated Invitation]: An invitation link has been dispatched to ${email}.`,
        simulated: true,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = memberController;
