const bcrypt = require('bcryptjs');
const passport = require('passport');
const userModel = require('../models/userModel');

const authController = {
  // Register a new user
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Check if email already registered
      const exists = await userModel.emailExists(email);
      if (exists) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }

      // Hash password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create new user in database
      const newUser = await userModel.create({
        name,
        email,
        passwordHash,
      });

      // Automatically establish session via Passport
      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.status(201).json({
          success: true,
          message: 'Account created and logged in successfully.',
          user: newUser,
        });
      });
    } catch (err) {
      next(err);
    }
  },

  // Log in user
  async login(req, res, next) {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: info && info.message ? info.message : 'Invalid email or password.',
        });
      }

      // Prevent session fixation by regenerating session
      const prevSession = req.session;
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);

        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          return res.status(200).json({
            success: true,
            message: 'Logged in successfully.',
            user,
          });
        });
      });
    })(req, res, next);
  },

  // Log out user
  async logout(req, res, next) {
    req.logout((logoutErr) => {
      if (logoutErr) return next(logoutErr);

      if (req.session) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) return next(destroyErr);
          res.clearCookie('connect.sid', { path: '/' });
          return res.status(200).json({
            success: true,
            message: 'Logged out successfully.',
          });
        });
      } else {
        return res.status(200).json({
          success: true,
          message: 'Logged out successfully.',
        });
      }
    });
  },

  // Get current authenticated user profile
  async getMe(req, res) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        created_at: req.user.created_at,
        updated_at: req.user.updated_at,
      },
    });
  },

  // Search registered users to add as team members
  async searchUsers(req, res, next) {
    try {
      const q = req.query.q || '';
      const teamId = req.query.teamId ? parseInt(req.query.teamId, 10) : null;
      if (!q.trim()) {
        return res.status(200).json({ success: true, users: [] });
      }

      const users = await userModel.searchUsers(q.trim(), req.user.id, teamId);
      return res.status(200).json({
        success: true,
        users,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
