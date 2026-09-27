"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
const promise_1 = __importDefault(require("mysql2/promise"));
(0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, '../../../.env') });
const databaseName = process.env.DB_NAME;
if (!databaseName || !/^[A-Za-z0-9_$-]+$/.test(databaseName)) {
    throw new Error('DB_NAME must contain only letters, numbers, underscores, dollar signs, or hyphens');
}
const main = async () => {
    const connection = await promise_1.default.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
        console.log(`Database '${databaseName}' is ready.`);
    }
    finally {
        await connection.end();
    }
};
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
//# sourceMappingURL=ensure-database.js.map