import app from './app';
import { prisma } from './lib/prisma';

const port = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to database');

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log('🎯 Database initialization endpoints available:');
      console.log('   GET /api/database/initialize - Initialize database');
      console.log('   GET /api/database/verify     - Verify database schema');
      console.log('   GET /api/database/status     - Get database status');
      console.log('✅ Server ready for requests');
    });
  } catch (error) {
    console.error(`Error connecting to database via Prisma: ${error instanceof Error ? error.message : error}`);
    // Still listen so healthcheck / initial setup can be called
    app.listen(port, () => {
      console.log(`Server listening on port ${port} (waiting for DB config)`);
    });
  }
};

startServer();
