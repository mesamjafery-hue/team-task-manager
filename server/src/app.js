const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
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

function createApp() {
  const app = express();

  // Trust proxy for secure cookies behind reverse proxies (Google Cloud Run / Load Balancers)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // 1. Security HTTP Headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible API usage and Vite dev server
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS Configuration
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or same-origin in production)
        if (!origin || origin === allowedOrigin || process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Body parsers with size limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // 4. Session Store Configuration
  let sessionStore;
  const isProduction = process.env.NODE_ENV === 'production';
  const forceMemoryStore = process.env.USE_MEMORY_STORE === 'true';

  if (!forceMemoryStore && !db.isUsingFallback() && (process.env.DATABASE_URL || process.env.PGHOST)) {
    try {
      sessionStore = new pgSession({
        conObject: process.env.DATABASE_URL ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        } : {
          host: process.env.PGHOST || 'localhost',
          port: parseInt(process.env.PGPORT || '5432', 10),
          user: process.env.PGUSER || 'postgres',
          password: process.env.PGPASSWORD || 'postgres',
          database: process.env.PGDATABASE || 'team_task_manager',
        },
        tableName: 'session',
        createTableIfMissing: true,
      });
      console.log(' Using PostgreSQL-backed session store.');
    } catch (sessionErr) {
      console.warn('⚠️ Could not initialize pgSession store, falling back to MemoryStore:', sessionErr.message);
      sessionStore = new session.MemoryStore();
    }
  } else {
    // Local development fallback or test environment
    sessionStore = new session.MemoryStore();
    console.log('ℹ️ Using MemoryStore for sessions (development/fallback mode).');
  }

  // 5. Express Session Setup
  const sessionSecret = process.env.SESSION_SECRET || 'dev_insecure_session_secret_super_random_12345';
  app.use(
    session({
      store: sessionStore,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: parseInt(process.env.SESSION_MAX_AGE_MS || 86400000, 10), // 24 hours
      },
    })
  );

  // 6. Passport Initialization
  const passport = configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // 7. Health Check Route
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: db.isUsingFallback() ? 'in-memory-fallback' : 'postgresql',
    });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: db.isUsingFallback() ? 'in-memory-fallback' : 'postgresql',
    });
  });

  // 8. API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/tasks', taskRoutes);

  // 9. Frontend Serving
  const path = require('path');
  const fs = require('fs');
  const clientDist = path.join(__dirname, '../../client/dist');

  if (fs.existsSync(clientDist)) {
    // Production: serve built React app as static files
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    // Development: root route redirects browser to Vite dev server
    const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    app.get('/', (req, res) => {
      res.redirect(frontendUrl);
    });

    // Catch-all for non-API, non-root paths in dev — redirect to frontend
    app.get(/^(?!\/api).*/, (req, res) => {
      res.redirect(frontendUrl);
    });
  }

  // 10. 404 only for unmatched /api/* routes & Centralized Error Handler
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
