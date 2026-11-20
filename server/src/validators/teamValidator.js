const { body } = require('express-validator');
const { stripHtml, idParam, emailBody } = require('./common');

const teamIdParam = [idParam('id', 'team ID')];

const createTeamValidator = [
  body('name')
    .trim()
    .customSanitizer(stripHtml)
    .notEmpty()
    .withMessage('Team name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters long.'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer(stripHtml)
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters.'),
];

const updateTeamValidator = [
  idParam('id', 'team ID'),
  body('name')
    .optional()
    .trim()
    .customSanitizer(stripHtml)
    .notEmpty()
    .withMessage('Team name cannot be empty.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters.'),
  body('description')
    .optional({ values: 'null' })
    .trim()
    .customSanitizer(stripHtml)
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters.'),
];

const addMemberValidator = [
  idParam('id', 'team ID'),
  emailBody('email'),
  body('role')
    .optional()
    .isIn(['owner', 'member'])
    .withMessage('Role must be either "owner" or "member".'),
];

const removeMemberValidator = [
  idParam('id', 'team ID'),
  idParam('userId', 'user ID'),
];

const inviteMemberValidator = [
  idParam('id', 'team ID'),
  emailBody('email'),
];

module.exports = {
  teamIdParam,
  createTeamValidator,
  updateTeamValidator,
  addMemberValidator,
  removeMemberValidator,
  inviteMemberValidator,
};
