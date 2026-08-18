import path from 'path';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({ path: path.resolve(__dirname, '../../../.env') });

const databaseName = process.env.DB_NAME;

if (!databaseName || !/^[A-Za-z0-9_$-]+$/.test(databaseName)) {
  throw new Error('DB_NAME must contain only letters, numbers, underscores, dollar signs, or hyphens');
}

const main = async (): Promise<void> => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
    console.log(`Database '${databaseName}' is ready.`);
  } finally {
    await connection.end();
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
