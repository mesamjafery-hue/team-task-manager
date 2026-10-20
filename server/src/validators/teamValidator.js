const { body, param } = require('express-validator');

const createTeamValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters long.'),
  body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters.'),
];

const updateTeamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID parameter.'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Team name cannot be empty.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters.'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters.'),
];

const addMemberValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid team ID parameter.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('User email is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['owner', 'member'])
    .withMessage('Role must be either "owner" or "member".'),
];

module.exports = {
  createTeamValidator,
  updateTeamValidator,
  addMemberValidator,
};
