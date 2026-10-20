const db = require('../config/database');

const teamModel = {
  // Get all teams the user belongs to with member count and task count
  async findUserTeams(userId) {
    const sql = `
      SELECT 
        t.id,
        t.name,
        t.description,
        t.owner_id,
        t.created_at,
        t.updated_at,
        tm.role AS user_role,
        u.name AS owner_name,
        u.email AS owner_email,
        COALESCE(mc.cnt, 0)::int AS member_count,
        COALESCE(tc.cnt, 0)::int AS task_count
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id AND tm.user_id = $1
      INNER JOIN users u ON t.owner_id = u.id
      LEFT JOIN (SELECT team_id, COUNT(*) AS cnt FROM team_members GROUP BY team_id) mc ON mc.team_id = t.id
      LEFT JOIN (SELECT team_id, COUNT(*) AS cnt FROM tasks GROUP BY team_id) tc ON tc.team_id = t.id
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
  },

  // Get a single team by ID
  async findById(teamId) {
    const sql = `
      SELECT 
        t.id,
        t.name,
        t.description,
        t.owner_id,
        t.created_at,
        t.updated_at,
        u.name AS owner_name,
        u.email AS owner_email,
        COALESCE(mc.cnt, 0)::int AS member_count,
        COALESCE(tc.cnt, 0)::int AS task_count
      FROM teams t
      INNER JOIN users u ON t.owner_id = u.id
      LEFT JOIN (SELECT team_id, COUNT(*) AS cnt FROM team_members GROUP BY team_id) mc ON mc.team_id = t.id
      LEFT JOIN (SELECT team_id, COUNT(*) AS cnt FROM tasks GROUP BY team_id) tc ON tc.team_id = t.id
      WHERE t.id = $1
    `;
    const result = await db.query(sql, [teamId]);
    return result.rows[0] || null;
  },

  // Create team inside transaction and add owner as member
  async create({ name, description, ownerId }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const teamResult = await client.query(
        `INSERT INTO teams (name, description, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, owner_id, created_at, updated_at`,
        [name.trim(), description ? description.trim() : null, ownerId]
      );
      const team = teamResult.rows[0];

      // Add owner to team_members
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [team.id, ownerId]
      );

      await client.query('COMMIT');
      return team;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Update team
  async update(teamId, { name, description }) {
    const sql = `
      UPDATE teams
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, description, owner_id, created_at, updated_at
    `;
    const result = await db.query(sql, [
      name ? name.trim() : null,
      description !== undefined ? (description ? description.trim() : null) : null,
      teamId,
    ]);
    return result.rows[0] || null;
  },

  // Delete team (cascades to members and tasks via foreign key)
  async delete(teamId) {
    const result = await db.query(`DELETE FROM teams WHERE id = $1 RETURNING id`, [teamId]);
    return result.rows[0] || null;
  },

  // Check user role in a team
  async getUserRole(teamId, userId) {
    const result = await db.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );
    return result.rows[0] ? result.rows[0].role : null;
  },
};

module.exports = teamModel;
