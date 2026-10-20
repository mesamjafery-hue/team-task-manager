const bcrypt = require('bcryptjs');
const { getClient } = require('../src/config/database');

async function seedData() {
  console.log('🌱 Seeding initial development data...');
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Check if users already exist
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count, 10) > 0) {
      console.log('ℹ️ Users already exist, skipping seeding.');
      await client.query('COMMIT');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // 2. Insert Users
    const u1 = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, name, email`,
      ['Alice Morgan', 'alice@example.com', passwordHash]
    );

    const u2 = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, name, email`,
      ['Bob Chen', 'bob@example.com', passwordHash]
    );

    const u3 = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, name, email`,
      ['Charlie Davis', 'charlie@example.com', passwordHash]
    );

    const aliceId = u1.rows[0].id;
    const bobId = u2.rows[0].id;
    const charlieId = u3.rows[0].id;

    // 3. Insert Teams
    const t1 = await client.query(
      `INSERT INTO teams (name, description, owner_id)
       VALUES ($1, $2, $3) RETURNING id`,
      ['Frontend Core Team', 'Responsible for design system, client application, and web performance.', aliceId]
    );

    const t2 = await client.query(
      `INSERT INTO teams (name, description, owner_id)
       VALUES ($1, $2, $3) RETURNING id`,
      ['Cloud Infrastructure', 'Manages Google Cloud Platform deployments, databases, and CI/CD pipelines.', bobId]
    );

    const team1Id = t1.rows[0].id;
    const team2Id = t2.rows[0].id;

    // 4. Insert Team Members
    // Team 1 members
    await client.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'owner'), ($1, $3, 'member'), ($1, $4, 'member')`,
      [team1Id, aliceId, bobId, charlieId]
    );

    // Team 2 members
    await client.query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'owner'), ($1, $3, 'member')`,
      [team2Id, bobId, aliceId]
    );

    // 5. Insert Tasks
    const today = new Date();
    const overdueDate = new Date(today);
    overdueDate.setDate(today.getDate() - 3);

    const upcomingDate = new Date(today);
    upcomingDate.setDate(today.getDate() + 2);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 14);

    const formatDate = (d) => d.toISOString().split('T')[0];

    // Tasks for Team 1
    const tasksTeam1 = [
      ['Implement Responsive Navigation Bar', 'Build desktop sidebar and collapsible mobile drawer with active link highlighting.', team1Id, aliceId, aliceId, 'In Progress', 'High', formatDate(upcomingDate)],
      ['Design Dark Mode Palette', 'Select accessible Tailwind color tokens for secondary theme support.', team1Id, aliceId, charlieId, 'To Do', 'Medium', formatDate(futureDate)],
      ['Audit Accessibility on Login Form', 'Ensure WCAG AA compliance for inputs and keyboard navigation.', team1Id, aliceId, aliceId, 'Completed', 'Low', formatDate(overdueDate)],
      ['Fix Session Cookie SameSite Policy', 'Resolve session expiration and cookie isolation between frontend and backend.', team1Id, aliceId, bobId, 'To Do', 'High', formatDate(overdueDate)],
    ];

    for (const t of tasksTeam1) {
      await client.query(
        `INSERT INTO tasks (title, description, team_id, created_by, assigned_to, status, priority, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        t
      );
    }

    // Tasks for Team 2
    const tasksTeam2 = [
      ['Set up Cloud SQL PostgreSQL Instance', 'Configure high availability, automated backups, and private IP.', team2Id, bobId, bobId, 'In Progress', 'High', formatDate(upcomingDate)],
      ['Automate Cloud Run Service Deployment', 'Write Cloud Build YAML config and configure artifact registry.', team2Id, bobId, aliceId, 'To Do', 'Medium', formatDate(futureDate)],
    ];

    for (const t of tasksTeam2) {
      await client.query(
        `INSERT INTO tasks (title, description, team_id, created_by, assigned_to, status, priority, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        t
      );
    }

    await client.query('COMMIT');
    console.log(' Demo seed data created successfully.');
    console.log('👉 Demo Credentials:');
    console.log('   Email: alice@example.com | Password: Password123!');
    console.log('   Email: bob@example.com   | Password: Password123!');
    console.log('   Email: charlie@example.com | Password: Password123!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to seed database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedData;
