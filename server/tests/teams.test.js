const request = require('supertest');
const createApp = require('../src/app');
const { getPool, initFallbackDb } = require('../src/config/database');

let app;
let ownerAgent;
let memberAgent;
let outsiderAgent;

let createdTeamId;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test_secret_key_123';
  initFallbackDb();
  await getPool();
  app = createApp();

  // Create 3 separate authenticated agents
  ownerAgent = request.agent(app);
  memberAgent = request.agent(app);
  outsiderAgent = request.agent(app);

  await ownerAgent.post('/api/auth/register').send({
    name: 'Team Owner',
    email: 'teamowner@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  await memberAgent.post('/api/auth/register').send({
    name: 'Team Member',
    email: 'teammember@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  await outsiderAgent.post('/api/auth/register').send({
    name: 'Outsider User',
    email: 'outsider@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
});

describe('Team Management & Membership Permissions', () => {
  test('1. Creates a team with owner role automatically assigned', async () => {
    const res = await ownerAgent
      .post('/api/teams')
      .send({
        name: 'Alpha Engineering Team',
        description: 'Core product development team.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.team.name).toBe('Alpha Engineering Team');
    expect(res.body.team.user_role).toBe('owner');
    createdTeamId = res.body.team.id;
  });

  test('2. Lists teams the current user belongs to', async () => {
    const res = await ownerAgent.get('/api/teams');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.teams.length).toBeGreaterThanOrEqual(1);
    expect(res.body.teams.some((t) => t.id === createdTeamId)).toBe(true);
  });

  test('3. Prevents unauthorized users from accessing team details (403)', async () => {
    const res = await outsiderAgent.get(`/api/teams/${createdTeamId}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('4. Allows owner to add a registered member by email', async () => {
    const res = await ownerAgent
      .post(`/api/teams/${createdTeamId}/members`)
      .send({
        email: 'teammember@example.com',
        role: 'member',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.member.email).toBe('teammember@example.com');
  });

  test('5. Prevents duplicate member registration to the same team (409)', async () => {
    const res = await ownerAgent
      .post(`/api/teams/${createdTeamId}/members`)
      .send({
        email: 'teammember@example.com',
        role: 'member',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('6. Prevents non-owners from adding members to the team (403)', async () => {
    const res = await memberAgent
      .post(`/api/teams/${createdTeamId}/members`)
      .send({
        email: 'outsider@example.com',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('7. Allows member to view team details and member list', async () => {
    const res = await memberAgent.get(`/api/teams/${createdTeamId}`);
    expect(res.status).toBe(200);
    expect(res.body.team.id).toBe(createdTeamId);
    expect(res.body.team.user_role).toBe('member');

    const membersRes = await memberAgent.get(`/api/teams/${createdTeamId}/members`);
    expect(membersRes.status).toBe(200);
    expect(membersRes.body.members.length).toBe(2);
  });

  test('8. Allows owner to update team, forbids member from updating team', async () => {
    const forbiddenRes = await memberAgent
      .patch(`/api/teams/${createdTeamId}`)
      .send({ name: 'Hacked Team Name' });
    expect(forbiddenRes.status).toBe(403);

    const updateRes = await ownerAgent
      .patch(`/api/teams/${createdTeamId}`)
      .send({ name: 'Alpha Engineering Team V2' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.team.name).toBe('Alpha Engineering Team V2');
  });

  test('9. Forbids non-owner from deleting team; allows owner to delete', async () => {
    const forbiddenDelete = await memberAgent.delete(`/api/teams/${createdTeamId}`);
    expect(forbiddenDelete.status).toBe(403);

    // Create a temporary team to delete
    const tempTeamRes = await ownerAgent
      .post('/api/teams')
      .send({ name: 'Temp Delete Team' });
    const tempId = tempTeamRes.body.team.id;

    const deleteRes = await ownerAgent.delete(`/api/teams/${tempId}`);
    expect(deleteRes.status).toBe(200);

    const checkRes = await ownerAgent.get(`/api/teams/${tempId}`);
    expect(checkRes.status).toBe(404);
  });
});
