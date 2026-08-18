import path from 'path';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

config({ path: path.resolve(__dirname, '../../../.env') });

async function initFunctions(): Promise<void> {
  console.log('🔧 Initializing MySQL encryptId/decryptId stored functions...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await connection.query('DROP FUNCTION IF EXISTS `decryptId`');
    await connection.query('DROP FUNCTION IF EXISTS `encryptId`');

    const createDecryptIdSql = `
      CREATE FUNCTION \`decryptId\`(_in VARCHAR(32)) RETURNS varchar(32) CHARSET utf8mb3
      DETERMINISTIC
      NO SQL
      BEGIN
        IF IFNULL(@zc_id_encrypt_decrypt_key,'')='' THEN
          RETURN aes_decrypt(UNHEX(_in), '9A48BCDA1014786E');
        ELSE
          RETURN aes_decrypt(UNHEX(_in), @ende_key);
        END IF;
      END
    `;
    await connection.query(createDecryptIdSql);
    console.log('  ✅ Function decryptId created');

    const createEncryptIdSql = `
      CREATE FUNCTION \`encryptId\`(_in VARCHAR(32)) RETURNS varchar(32) CHARSET utf8mb3
      DETERMINISTIC
      NO SQL
      BEGIN
        IF IFNULL(@zc_id_encrypt_decrypt_key,'')='' THEN
          RETURN HEX(aes_encrypt(_in, '9A48BCDA1014786E'));
        ELSE
          RETURN HEX(aes_encrypt(_in, @ende_key));
        END IF;
      END
    `;
    await connection.query(createEncryptIdSql);
    console.log('  ✅ Function encryptId created');

    console.log('🎉 Stored functions initialized successfully!');
  } catch (error) {
    console.error('⚠️ Note on Stored Functions initialization:', error instanceof Error ? error.message : error);
    console.log('ℹ️ If you encounter permission errors, ensure binary logging permissions are enabled:');
    console.log('   SET GLOBAL log_bin_trust_function_creators = 1;');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  initFunctions();
}

export default initFunctions;
