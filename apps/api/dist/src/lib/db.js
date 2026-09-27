"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../config/env");
const promise_1 = __importDefault(require("mysql2/promise"));
// Initializes the raw mysql2 connection pool used by the one-off dbInit schema scripts.
const initDB = async () => {
    const basePool = promise_1.default.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        connectionLimit: 10,
    });
    const connection = await basePool.getConnection();
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    connection.release();
    const pool = promise_1.default.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        connectionLimit: 10,
    });
    return pool;
};
exports.default = initDB;
//# sourceMappingURL=db.js.map