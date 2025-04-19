// 16-bit key (2 characters = 2 bytes)
const key = Buffer.from('A3'); // You can change this

// Simple XOR encryption
function encrypt16Bit(plainText) {
    const plainBytes = Buffer.from(plainText, 'utf8');
    const encryptedBytes = Buffer.alloc(plainBytes.length);

    for (let i = 0; i < plainBytes.length; i++) {
        encryptedBytes[i] = plainBytes[i] ^ key[i % key.length];
    }

    // Convert to base64 and ensure it's 16 characters
    const base64 = encryptedBytes.toString('base64');
    return (base64 + "==============").substring(0, 16); // Pad to 16 chars
}

// Decrypt back
function decrypt16Bit(encryptedText) {
    // Make sure base64 is valid length
    const padded = encryptedText.padEnd(24, "=");
    const encryptedBytes = Buffer.from(padded, 'base64');
    const decryptedBytes = Buffer.alloc(encryptedBytes.length);

    for (let i = 0; i < encryptedBytes.length; i++) {
        decryptedBytes[i] = encryptedBytes[i] ^ key[i % key.length];
    }

    return decryptedBytes.toString('utf8');
}

// Export the functions
module.exports = {
    encrypt16Bit,
    decrypt16Bit
};

// Test section (can be commented out in production)
if (require.main === module) {
    // const password = "a@der3Se3edTuiu"; // Example password
    const encrypted = encrypt16Bit('');
    const decrypted = decrypt16Bit('===============');

    // console.log("Original:  ", password);
    console.log("Encrypted: ", encrypted); // always 16 chars
    console.log("Decrypted: ", decrypted);
}
