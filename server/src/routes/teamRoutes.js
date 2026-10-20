const express = require('express');
const teamController = require('../controllers/teamController');
const memberController = require('../controllers/memberController');
const { ensureAuthenticated } = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  createTeamValidator,
  updateTeamValidator,
  addMemberValidator,
} = require('../validators/teamValidator');

const router = express.Router();

// All team routes require authentication
router.use(ensureAuthenticated);

// Team CRUD endpoints
router.get('/', teamController.listTeams);
router.post('/', validate(createTeamValidator), teamController.createTeam);
router.get('/:id', teamController.getTeamDetails);
router.patch('/:id', validate(updateTeamValidator), teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

// Member management endpoints
router.get('/:id/members', memberController.listMembers);
router.post('/:id/members', validate(addMemberValidator), memberController.addMember);
router.delete('/:id/members/:userId', memberController.removeMember);

// Bonus: Simulated Email Invite
router.post('/:id/invite', memberController.inviteMember);

module.exports = router;
