const request = require('supertest');
const createApp = require('../src/app');
const { getPool, initFallbackDb } = require('../src/config/database');

let app;
let creatorAgent;
let coOwnerAgent;
let memberAgent;

let creatorId;
let coOwnerId;
let teamId;

const dateFromToday = (days) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

const register = (agent, name, email) =>
  agent.post('/api/auth/register').send({
    name,
    email,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test_secret_key_123';
  initFallbackDb();
  await getPool();
  app = createApp();

  creatorAgent = request.agent(app);
  coOwnerAgent = request.agent(app);
  memberAgent = request.agent(app);

  creatorId = (await register(creatorAgent, 'Team Creator', 'creator@example.com')).body.user.id;
  coOwnerId = (await register(coOwnerAgent, 'Co Owner', 'coowner@example.com')).body.user.id;
  await register(memberAgent, 'Plain Member', 'plain.member@gmail.com');

  const teamRes = await creatorAgent.post('/api/teams').send({ name: 'Security Team' });
  teamId = teamRes.body.team.id;
  await creatorAgent.post(`/api/teams/${teamId}/members`).send({ email: 'coowner@example.com', role: 'owner' });
  await creatorAgent.post(`/api/teams/${teamId}/members`).send({ email: 'plain.member@gmail.com', role: 'member' });
});

describe('Validation, sanitization, RBAC and reminders', () => {
  test('1. Keeps dots in Gmail addresses (no destructive email normalization)', async () => {
    const res = await memberAgent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('plain.member@gmail.com');
  });

  test('2. Rejects non-numeric route IDs with 400 instead of a server error', async () => {
    const teamRes = await creatorAgent.get('/api/teams/not-a-number');
    expect(teamRes.status).toBe(400);

    const taskRes = await creatorAgent.delete('/api/tasks/abc');
    expect(taskRes.status).toBe(400);

    const memberRes = await creatorAgent.delete(`/api/teams/${teamId}/members/xyz`);
    expect(memberRes.status).toBe(400);
  });

  test('3. Validates the invite email address', async () => {
    const missing = await creatorAgent.post(`/api/teams/${teamId}/invite`).send({});
    expect(missing.status).toBe(400);

    const invalid = await creatorAgent.post(`/api/teams/${teamId}/invite`).send({ email: 'nope' });
    expect(invalid.status).toBe(400);

    const ok = await creatorAgent.post(`/api/teams/${teamId}/invite`).send({ email: 'newperson@example.com' });
    expect(ok.status).toBe(200);
    expect(ok.body.simulated).toBe(true);
  });

  test('4. Strips HTML tags from text input but keeps ordinary comparison text', async () => {
    const res = await creatorAgent.post('/api/tasks').send({
      title: '<script>alert(1)</script>Fix login bug',
      description: 'Happens when x < 5 and y > 3 <img src=x onerror=alert(1)>',
      teamId,
    });
    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('alert(1)Fix login bug');
    expect(res.body.task.description).toBe('Happens when x < 5 and y > 3');
  });

  test('5. Only the team creator can delete a team, even if others hold the owner role', async () => {
    const coOwnerDelete = await coOwnerAgent.delete(`/api/teams/${teamId}`);
    expect(coOwnerDelete.status).toBe(403);

    const memberDelete = await memberAgent.delete(`/api/teams/${teamId}`);
    expect(memberDelete.status).toBe(403);
  });

  test('6. Lists collaborators across all of the user\'s teams for the assignee filter', async () => {
    const res = await creatorAgent.get('/api/teams/members');
    expect(res.status).toBe(200);
    const emails = res.body.members.map((m) => m.email).sort();
    expect(emails).toEqual(['coowner@example.com', 'creator@example.com', 'plain.member@gmail.com']);
  });

  test('7. Returns due-date reminders for the user\'s own unfinished tasks only', async () => {
    const make = (title, dueDate, extra = {}) =>
      creatorAgent.post('/api/tasks').send({ title, teamId, assignedTo: creatorId, dueDate, ...extra });

    await make('Overdue task', dateFromToday(-2));
    await make('Due tomorrow', dateFromToday(1));
    await make('Due next month', dateFromToday(30));
    await make('Finished but overdue', dateFromToday(-1), { status: 'Completed' });
    await creatorAgent.post('/api/tasks').send({
      title: 'Someone else\'s task',
      teamId,
      assignedTo: coOwnerId,
      dueDate: dateFromToday(1),
    });

    const res = await creatorAgent.get('/api/tasks/reminders');
    expect(res.status).toBe(200);
    expect(res.body.reminders.map((t) => t.title)).toEqual(['Overdue task', 'Due tomorrow']);
    expect(res.body.overdueCount).toBe(1);

    const overdueRes = await creatorAgent.get('/api/tasks').query({ isOverdue: 'true' });
    expect(overdueRes.status).toBe(200);
    expect(overdueRes.body.tasks.map((t) => t.title)).toEqual(['Overdue task']);
  });

  test('8. Rejects unauthenticated access to every non-auth route', async () => {
    const anon = request(app);
    const routes = [
      ['get', '/api/teams'],
      ['get', '/api/teams/members'],
      ['get', `/api/teams/${teamId}`],
      ['get', '/api/tasks'],
      ['get', '/api/tasks/reminders'],
      ['get', '/api/tasks/dashboard/stats'],
      ['post', '/api/tasks'],
      ['get', '/api/auth/me'],
    ];
    for (const [method, url] of routes) {
      const res = await anon[method](url);
      expect(res.status).toBe(401);
    }
  });

  test('9. Session cookie is HTTP-only', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'creator@example.com', password: 'Password123!' });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });
});
