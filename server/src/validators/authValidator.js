const { body, query } = require('express-validator');
const { stripHtml, emailBody } = require('./common');

const registerValidator = [
  body('name')
    .trim()
    .customSanitizer(stripHtml)
    .notEmpty()
    .withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters long.'),
  emailBody('email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 6, max: 72 }) // bcrypt only uses the first 72 bytes
    .withMessage('Password must be between 6 and 72 characters long.'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
];

const loginValidator = [
  emailBody('email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required.'),
];

const searchUsersValidator = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters.'),
  query('teamId')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer.')
    .toInt(),
];

module.exports = {
  registerValidator,
  loginValidator,
  searchUsersValidator,
};
