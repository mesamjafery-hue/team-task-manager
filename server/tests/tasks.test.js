const request = require('supertest');
const createApp = require('../src/app');
const { getPool, initFallbackDb } = require('../src/config/database');

let app;
let user1Agent;
let user2Agent;
let outsiderAgent;

let team1Id;
let team2Id;
let user1Id;
let user2Id;
let outsiderId;
let createdTaskId;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test_secret_key_123';
  initFallbackDb();
  await getPool();
  app = createApp();

  user1Agent = request.agent(app);
  user2Agent = request.agent(app);
  outsiderAgent = request.agent(app);

  const u1Res = await user1Agent.post('/api/auth/register').send({
    name: 'Task User One',
    email: 'taskuser1@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  user1Id = u1Res.body.user.id;

  const u2Res = await user2Agent.post('/api/auth/register').send({
    name: 'Task User Two',
    email: 'taskuser2@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  user2Id = u2Res.body.user.id;

  const outRes = await outsiderAgent.post('/api/auth/register').send({
    name: 'Task Outsider',
    email: 'taskoutsider@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  outsiderId = outRes.body.user.id;

  // Create Team 1 (Owner: User 1) and add User 2
  const t1Res = await user1Agent.post('/api/teams').send({ name: 'Development Squad' });
  team1Id = t1Res.body.team.id;
  await user1Agent.post(`/api/teams/${team1Id}/members`).send({ email: 'taskuser2@example.com', role: 'member' });

  // Create Team 2 (Owner: Outsider) - User 1 and User 2 do not belong
  const t2Res = await outsiderAgent.post('/api/teams').send({ name: 'Outsider Secret Team' });
  team2Id = t2Res.body.team.id;
});

describe('Task Management & Filtering Endpoints', () => {
  test('1. Rejects task creation with invalid data (empty title or invalid priority)', async () => {
    const res = await user1Agent
      .post('/api/tasks')
      .send({
        title: '',
        teamId: team1Id,
        priority: 'UltraHigh',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('2. Rejects task creation for non-team member or assigning non-member', async () => {
    // User 1 trying to create task in Team 2 (they don't belong)
    const unauthorizedTeamRes = await user1Agent
      .post('/api/tasks')
      .send({
        title: 'Unauthorized Task',
        teamId: team2Id,
      });
    expect(unauthorizedTeamRes.status).toBe(403);

    // User 1 trying to assign task to outsider (who is not in Team 1)
    const invalidAssigneeRes = await user1Agent
      .post('/api/tasks')
      .send({
        title: 'Task for Outsider',
        teamId: team1Id,
        assignedTo: outsiderId,
      });
    expect(invalidAssigneeRes.status).toBe(400);
    expect(invalidAssigneeRes.body.message).toMatch(/does not belong to the selected team/i);
  });

  test('3. Successfully creates a task with valid assignee, status, priority, and due date', async () => {
    const res = await user1Agent
      .post('/api/tasks')
      .send({
        title: 'Build Authentication Module',
        description: 'Implement Passport.js with session cookie handling.',
        teamId: team1Id,
        assignedTo: user2Id,
        status: 'In Progress',
        priority: 'High',
        dueDate: '2026-11-15',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.task.title).toBe('Build Authentication Module');
    expect(res.body.task.team_id).toBe(team1Id);
    expect(res.body.task.assigned_to).toBe(user2Id);
    expect(res.body.task.assignee_name).toBe('Task User Two');
    expect(res.body.task.status).toBe('In Progress');
    expect(res.body.task.priority).toBe('High');
    createdTaskId = res.body.task.id;
  });

  test('4. Prevents cross-team task access and queries', async () => {
    // Outsider cannot view the created task
    const res = await outsiderAgent.get(`/api/tasks/${createdTaskId}`);
    expect(res.status).toBe(404);

    // Outsider cannot filter tasks by Team 1
    const filterRes = await outsiderAgent.get(`/api/tasks?teamId=${team1Id}`);
    expect(filterRes.status).toBe(403);
  });

  test('5. Multi-parameter search and filtering works seamlessly', async () => {
    // Create an extra task to test filtering
    await user1Agent.post('/api/tasks').send({
      title: 'Design UI Mockups in Figma',
      description: 'Create wireframes and user flow diagram.',
      teamId: team1Id,
      assignedTo: user1Id,
      status: 'To Do',
      priority: 'Low',
    });

    // Filter by team
    const teamTasksRes = await user1Agent.get(`/api/tasks?teamId=${team1Id}`);
    expect(teamTasksRes.status).toBe(200);
    expect(teamTasksRes.body.tasks.length).toBe(2);

    // Filter by status 'In Progress'
    const statusRes = await user1Agent.get(`/api/tasks?teamId=${team1Id}&status=In%20Progress`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.tasks.length).toBe(1);
    expect(statusRes.body.tasks[0].id).toBe(createdTaskId);

    // Search by title keyword
    const searchRes = await user1Agent.get(`/api/tasks?search=authentication`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.tasks.length).toBe(1);
    expect(searchRes.body.tasks[0].title).toBe('Build Authentication Module');

    // Filter by assignee
    const assigneeRes = await user1Agent.get(`/api/tasks?assigneeId=${user2Id}`);
    expect(assigneeRes.status).toBe(200);
    expect(assigneeRes.body.tasks.length).toBe(1);
  });

  test('6. Updates task status, priority, and fields', async () => {
    const res = await user2Agent
      .patch(`/api/tasks/${createdTaskId}`)
      .send({
        status: 'Completed',
        priority: 'Medium',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.task.status).toBe('Completed');
    expect(res.body.task.priority).toBe('Medium');
  });

  test('7. Calculates real dashboard stats from database', async () => {
    const res = await user1Agent.get('/api/tasks/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.totalTeams).toBeGreaterThanOrEqual(1);
    expect(res.body.stats.totalTasks).toBeGreaterThanOrEqual(2);
    expect(res.body.stats.completedTasks).toBeGreaterThanOrEqual(1);
  });

  test('8. Allows authorized deletion of a task', async () => {
    const deleteRes = await user1Agent.delete(`/api/tasks/${createdTaskId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const getRes = await user1Agent.get(`/api/tasks/${createdTaskId}`);
    expect(getRes.status).toBe(404);
  });
});
