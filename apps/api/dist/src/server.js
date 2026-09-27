"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const prisma_1 = require("./lib/prisma");
const port = process.env.PORT || 5000;
const startServer = async () => {
    try {
        await prisma_1.prisma.$connect();
        console.log('✅ Prisma connected to database');
        app_1.default.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log('🎯 Database initialization endpoints available:');
            console.log('   GET /api/database/initialize - Initialize database');
            console.log('   GET /api/database/verify     - Verify database schema');
            console.log('   GET /api/database/status     - Get database status');
            console.log('✅ Server ready for requests');
        });
    }
    catch (error) {
        console.error(`Error connecting to database via Prisma: ${error instanceof Error ? error.message : error}`);
        // Still listen so healthcheck / initial setup can be called
        app_1.default.listen(port, () => {
            console.log(`Server listening on port ${port} (waiting for DB config)`);
        });
    }
};
startServer();
//# sourceMappingURL=server.js.map