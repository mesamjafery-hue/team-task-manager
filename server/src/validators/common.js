const { body, param } = require('express-validator');

// Removes HTML tags (e.g. <script>, <img onerror=...>) and ASCII control characters
// from free-text input. React also escapes output, so this is defence in depth.
// Only strings that look like real tags (`<` followed by a letter or `/`) are removed,
// so ordinary text such as "x < 5 and y > 3" is preserved.
const HTML_TAG_PATTERN = /<\/?[a-zA-Z][^<>]*>/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function stripHtml(value) {
  if (typeof value !== 'string') return value;
  return value.replace(HTML_TAG_PATTERN, '').replace(CONTROL_CHAR_PATTERN, '');
}

// Positive integer route parameter, e.g. /teams/:id
const idParam = (name = 'id', label = 'ID') =>
  param(name).isInt({ min: 1 }).withMessage(`Invalid ${label} parameter.`).toInt();

// Required, trimmed, lower-cased email in the request body.
// (normalizeEmail() is avoided on purpose: it rewrites Gmail addresses by removing dots.)
const emailBody = (field = 'email') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Email address is required.')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .isLength({ max: 255 })
    .withMessage('Email address is too long.')
    .toLowerCase();

module.exports = {
  stripHtml,
  idParam,
  emailBody,
};
