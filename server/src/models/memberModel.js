const db = require('../config/database');

const memberModel = {
  // Get all members of a team
  async getTeamMembers(teamId) {
    const sql = `
      SELECT 
        tm.id AS membership_id,
        tm.team_id,
        tm.role,
        tm.joined_at,
        u.id AS user_id,
        u.name,
        u.email
      FROM team_members tm
      INNER JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY tm.role DESC, u.name ASC
    `;
    const result = await db.query(sql, [teamId]);
    return result.rows;
  },

  // Add member to team
  async addMember(teamId, userId, role = 'member') {
    const sql = `
      INSERT INTO team_members (team_id, user_id, role)
      VALUES ($1, $2, $3)
      RETURNING id, team_id, user_id, role, joined_at
    `;
    const result = await db.query(sql, [teamId, userId, role]);
    return result.rows[0];
  },

  // Remove member from team
  async removeMember(teamId, userId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // Unassign any tasks assigned to this member in this team
      await client.query(
        `UPDATE tasks SET assigned_to = NULL WHERE team_id = $1 AND assigned_to = $2`,
        [teamId, userId]
      );

      const result = await client.query(
        `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING id`,
        [teamId, userId]
      );
      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Check membership
  async isMember(teamId, userId) {
    const result = await db.query(
      `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );
    return result.rows.length > 0;
  },
};

module.exports = memberModel;
