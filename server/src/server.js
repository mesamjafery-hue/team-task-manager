const dotenv = require('dotenv');
dotenv.config();

const createApp = require('./app');
const { getPool, isUsingFallback } = require('./config/database');
const seedData = require('../migrations/seedData');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Verify database pool connectivity
    console.log(' Connecting to database...');
    await getPool();

    // 2. Auto-seed demo data in development if table is empty
    if (process.env.NODE_ENV !== 'production') {
      try {
        await seedData();
      } catch (seedErr) {
        console.warn('⚠️ Note on database seed:', seedErr.message);
      }
    }

    // 3. Create and start Express server
    const app = createApp();
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Team Task Manager Backend Server is RUNNING`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`💾 Database: ${isUsingFallback() ? 'In-Memory PostgreSQL Fallback' : 'Connected to PostgreSQL'}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('\n🛑 Graceful shutdown initiated. Closing HTTP server...');
      server.close(() => {
        console.log(' HTTP server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('❌ Fatal error starting server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;
