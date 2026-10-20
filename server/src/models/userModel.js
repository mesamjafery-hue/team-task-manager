const db = require('../config/database');

const userModel = {
  // Find safe user by ID
  async findById(id) {
    const result = await db.query(
      `SELECT id, name, email, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // Find user with password hash (for authentication check only)
  async findByEmailWithPassword(email) {
    const result = await db.query(
      `SELECT id, name, email, password_hash, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return result.rows[0] || null;
  },

  // Check if email is already taken
  async emailExists(email) {
    const result = await db.query(
      `SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );
    return result.rows.length > 0;
  },

  // Create a new user
  async create({ name, email, passwordHash }) {
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, LOWER($2), $3)
       RETURNING id, name, email, created_at, updated_at`,
      [name.trim(), email.trim(), passwordHash]
    );
    return result.rows[0];
  },

  // Search users by name or email (for adding team members)
  async searchUsers(searchQuery, currentUserId, teamId = null) {
    let sql = `
      SELECT id, name, email
      FROM users
      WHERE (LOWER(name) LIKE $1 OR LOWER(email) LIKE $1)
    `;
    const params = [`%${searchQuery.toLowerCase()}%`];

    if (teamId) {
      params.push(teamId);
      sql += ` AND id NOT IN (SELECT user_id FROM team_members WHERE team_id = $${params.length})`;
    }

    sql += ` ORDER BY name ASC LIMIT 10`;

    const result = await db.query(sql, params);
    return result.rows;
  },
};

module.exports = userModel;
