const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const PgSessionStore = require('connect-pg-simple')(session);
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const configurePassport = require('./config/passport');
const db = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const taskRoutes = require('./routes/taskRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const DEV_SESSION_SECRET = 'dev_insecure_session_secret_change_me';

/**
 * Sessions live in PostgreSQL whenever a real database is connected, and fall back
 * to the in-process MemoryStore for local development / tests (in-memory pg-mem DB).
 */
function createSessionStore() {
  const activePool = db.getActivePool();
  const useMemoryStore =
    process.env.USE_MEMORY_STORE === 'true' || db.isUsingFallback() || !activePool;

  if (useMemoryStore) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Using MemoryStore for sessions in production. Sessions will not survive restarts.');
    } else {
      console.log('ℹ️ Using MemoryStore for sessions (development/fallback mode).');
    }
    return new session.MemoryStore();
  }

  console.log(' Using PostgreSQL-backed session store.');
  return new PgSessionStore({
    pool: activePool,
    tableName: 'session',
    createTableIfMissing: true,
  });
}

/**
 * Allows the configured CLIENT_URL(s) plus same-origin requests (the production
 * build is served by this same Express app, so the browser's Origin equals our host).
 */
function corsOptionsDelegate(req, callback) {
  const origin = req.header('Origin');
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;

  const isAllowed =
    !origin || sameOrigin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production';

  callback(null, {
    origin: isAllowed,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
}

function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable must be set in production.');
  }

  // Trust proxy for secure cookies behind reverse proxies (Google Cloud Run / Load Balancers)
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  // 1. Security HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // The SPA loads Google Fonts; keep CSP off to avoid breaking it
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS
  app.use(cors(corsOptionsDelegate));

  // 3. Body parsers with size limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // 4. Express Session (HTTP-only cookie, PostgreSQL store with memory fallback)
  app.use(
    session({
      store: createSessionStore(),
      secret: process.env.SESSION_SECRET || DEV_SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        httpOnly: true,
        secure: isProduction,
        // 'lax' is correct for the same-origin deployment and blocks cross-site POSTs (CSRF).
        // Set COOKIE_SAME_SITE=none only if the frontend is hosted on a different domain.
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        maxAge: parseInt(process.env.SESSION_MAX_AGE_MS || '86400000', 10), // 24 hours
      },
    })
  );

  // 5. Passport
  const passport = configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // 6. Health check (public, used by Cloud Run / uptime checks)
  const healthHandler = (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: db.isUsingFallback() ? 'in-memory-fallback' : 'postgresql',
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // 7. API routes (everything except /api/auth/register and /api/auth/login requires a session)
  app.use('/api/auth', authRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/tasks', taskRoutes);

  // 8. Frontend serving
  const clientDist = path.join(__dirname, '../../client/dist');

  if (fs.existsSync(clientDist)) {
    // Production: serve the built React app and let React Router handle client-side routes
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    // Development: send browsers to the Vite dev server
    const frontendUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
    app.get(/^(?!\/api).*/, (req, res) => {
      res.redirect(frontendUrl);
    });
  }

  // 9. 404 for unmatched /api/* routes & centralized error handler
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
