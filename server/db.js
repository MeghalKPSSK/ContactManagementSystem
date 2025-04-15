require('dotenv').config();
const mysql = require('mysql2/promise');

// Function to initialize the database connection and create the DB if it doesn't exist
const initDB = async () => {
  // Step 1: Create a pool without specifying the database
  const basePool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    connectionLimit: 10,
  });

  const connection = await basePool.getConnection();

  // Step 2: Create the database if it doesn't exist
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
  connection.release();

  // Step 3: Create a pool with the database
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    connectionLimit: 10,
  });

  return pool;
};

module.exports = initDB;
