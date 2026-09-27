"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptId = encryptId;
exports.decryptId = decryptId;
exports.decryptIdToNumber = decryptIdToNumber;
const crypto_1 = __importDefault(require("crypto"));
// Default 16-byte key (128-bit) matching MySQL AES encryption
const DEFAULT_KEY = '9A48BCDA1014786E';
const ENCRYPTION_KEY = Buffer.from(process.env.ZC_ID_ENCRYPT_DECRYPT_KEY || DEFAULT_KEY, 'utf8');
/**
 * Encrypt an integer ID or string to uppercase HEX using AES-128-ECB
 * (100% bit-for-bit compatible with MySQL HEX(aes_encrypt(id, '9A48BCDA1014786E')))
 */
function encryptId(id) {
    if (id === null || id === undefined || id === '')
        return null;
    try {
        const cipher = crypto_1.default.createCipheriv('aes-128-ecb', ENCRYPTION_KEY, null);
        let encrypted = cipher.update(String(id), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted.toUpperCase();
    }
    catch (error) {
        console.error('Error in encryptId:', error instanceof Error ? error.message : error);
        return null;
    }
}
/**
 * Decrypt an encrypted hex string back to an integer ID or original string
 * (100% bit-for-bit compatible with MySQL aes_decrypt(UNHEX(hex), '9A48BCDA1014786E'))
 */
function decryptId(encryptedHex) {
    if (!encryptedHex)
        return null;
    // If already a number or numeric string without hex formatting, return parsed int
    if (typeof encryptedHex === 'number')
        return encryptedHex;
    if (/^\d+$/.test(encryptedHex) && encryptedHex.length < 10)
        return parseInt(encryptedHex, 10);
    try {
        const decipher = crypto_1.default.createDecipheriv('aes-128-ecb', ENCRYPTION_KEY, null);
        let decrypted = decipher.update(String(encryptedHex), 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const num = parseInt(decrypted, 10);
        return isNaN(num) ? decrypted : num;
    }
    catch {
        // If decryption fails (e.g. invalid hex), return null
        return null;
    }
}
/** Decrypt an ID and coerce it to a number, or null if invalid. */
function decryptIdToNumber(encryptedHex) {
    const decrypted = decryptId(encryptedHex);
    const num = Number(decrypted);
    return decrypted !== null && !Number.isNaN(num) ? num : null;
}
//# sourceMappingURL=dbEncryption.js.map