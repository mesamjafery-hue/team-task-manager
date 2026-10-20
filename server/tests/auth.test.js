const request = require('supertest');
const createApp = require('../src/app');
const { getPool, initFallbackDb } = require('../src/config/database');
const userModel = require('../src/models/userModel');
const bcrypt = require('bcryptjs');

let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test_secret_key_123';
  initFallbackDb();
  await getPool();
  app = createApp();
});

describe('Authentication & User Management Endpoints', () => {
  const testUser = {
    name: 'Auth Test User',
    email: 'authtest@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  test('1. Rejects registration with missing or invalid fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'A',
        email: 'invalid-email',
        password: '123',
        confirmPassword: '456',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('2. Successfully registers a new user and returns user profile without password hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe(testUser.name);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('3. Hashes password securely with bcrypt in the database', async () => {
    const dbUser = await userModel.findByEmailWithPassword(testUser.email);
    expect(dbUser).toBeDefined();
    expect(dbUser.password_hash).toBeDefined();
    expect(dbUser.password_hash).not.toBe(testUser.password);
    const isBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(dbUser.password_hash);
    expect(isBcryptHash).toBe(true);
  });

  test('4. Prevents duplicate email registration (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('5. Rejects login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('6. Successfully logs in with valid credentials and sets session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('7. Protected routes reject unauthenticated requests with 401 Unauthorized', async () => {
    const meRes = await request(app).get('/api/auth/me');
    expect(meRes.status).toBe(401);
    expect(meRes.body.success).toBe(false);

    const teamsRes = await request(app).get('/api/teams');
    expect(teamsRes.status).toBe(401);

    const tasksRes = await request(app).get('/api/tasks');
    expect(tasksRes.status).toBe(401);
  });

  test('8. Allows authenticated user to retrieve /api/auth/me and logout', async () => {
    const agent = request.agent(app);

    // Login
    const loginRes = await agent
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });
    expect(loginRes.status).toBe(200);

    // Check me
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testUser.email.toLowerCase());

    // Logout
    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    // After logout, accessing /me should fail
    const meAfterLogout = await agent.get('/api/auth/me');
    expect(meAfterLogout.status).toBe(401);
  });
});
