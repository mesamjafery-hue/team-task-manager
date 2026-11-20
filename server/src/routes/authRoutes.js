const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const {
  registerValidator,
  loginValidator,
  searchUsersValidator,
} = require('../validators/authValidator');
const validate = require('../middleware/validate');
const { ensureAuthenticated } = require('../middleware/authenticate');

const router = express.Router();

// Rate limiter for authentication attempts (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 30, // 30 requests per IP
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public endpoints
router.post('/register', authLimiter, validate(registerValidator), authController.register);
router.post('/login', authLimiter, validate(loginValidator), authController.login);

// Session-protected endpoints
router.post('/logout', ensureAuthenticated, authController.logout);
router.get('/me', ensureAuthenticated, authController.getMe);
router.get('/users/search', ensureAuthenticated, validate(searchUsersValidator), authController.searchUsers);

module.exports = router;
