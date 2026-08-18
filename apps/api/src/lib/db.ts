import '../config/env';
import mysql, { Pool } from 'mysql2/promise';

// Initializes the raw mysql2 connection pool used by the one-off dbInit schema scripts.
const initDB = async (): Promise<Pool> => {
  const basePool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    connectionLimit: 10,
  });

  const connection = await basePool.getConnection();
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  connection.release();

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    connectionLimit: 10,
  });

  return pool;
};

export default initDB;
