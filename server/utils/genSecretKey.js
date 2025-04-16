const crypto = require('crypto');

// Generate a 256-bit (32-byte) key and convert it to a 64-character hexadecimal string
const generateSecretKey = () => {
    const secretKey = crypto.randomBytes(32).toString('hex');
    console.log(`Generated Secret Key: ${secretKey}`);
    return secretKey;
};

// Call the function to generate the key
generateSecretKey();

