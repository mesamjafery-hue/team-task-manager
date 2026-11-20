const express = require('express');
const teamController = require('../controllers/teamController');
const memberController = require('../controllers/memberController');
const { ensureAuthenticated } = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  teamIdParam,
  createTeamValidator,
  updateTeamValidator,
  addMemberValidator,
  removeMemberValidator,
  inviteMemberValidator,
} = require('../validators/teamValidator');

const router = express.Router();

// All team routes require authentication
router.use(ensureAuthenticated);

// Everyone who shares at least one team with the current user (used for the assignee filter).
// Declared before /:id so "members" is not treated as a team ID.
router.get('/members', memberController.listCollaborators);

// Team CRUD
router.get('/', teamController.listTeams);
router.post('/', validate(createTeamValidator), teamController.createTeam);
router.get('/:id', validate(teamIdParam), teamController.getTeamDetails);
router.patch('/:id', validate(updateTeamValidator), teamController.updateTeam);
router.delete('/:id', validate(teamIdParam), teamController.deleteTeam);

// Member management
router.get('/:id/members', validate(teamIdParam), memberController.listMembers);
router.post('/:id/members', validate(addMemberValidator), memberController.addMember);
router.delete('/:id/members/:userId', validate(removeMemberValidator), memberController.removeMember);

// Bonus: simulated email invitation (no SMTP)
router.post('/:id/invite', validate(inviteMemberValidator), memberController.inviteMember);

module.exports = router;
