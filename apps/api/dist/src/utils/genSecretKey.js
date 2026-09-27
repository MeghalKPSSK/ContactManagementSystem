"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
// Generate a 256-bit (32-byte) key and convert it to a 64-character hexadecimal string
const generateSecretKey = () => {
    const secretKey = crypto_1.default.randomBytes(32).toString('hex');
    console.log(`Generated Secret Key: ${secretKey}`);
    return secretKey;
};
generateSecretKey();
//# sourceMappingURL=genSecretKey.js.map