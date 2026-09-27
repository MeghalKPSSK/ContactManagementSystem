"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
const promise_1 = __importDefault(require("mysql2/promise"));
(0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, '../../../.env') });
async function initFunctions() {
    console.log('🔧 Initializing MySQL encryptId/decryptId stored functions...');
    const connection = await promise_1.default.createConnection({
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
    }
    catch (error) {
        console.error('⚠️ Note on Stored Functions initialization:', error instanceof Error ? error.message : error);
        console.log('ℹ️ If you encounter permission errors, ensure binary logging permissions are enabled:');
        console.log('   SET GLOBAL log_bin_trust_function_creators = 1;');
    }
    finally {
        await connection.end();
    }
}
if (require.main === module) {
    initFunctions();
}
exports.default = initFunctions;
//# sourceMappingURL=init-functions.js.map