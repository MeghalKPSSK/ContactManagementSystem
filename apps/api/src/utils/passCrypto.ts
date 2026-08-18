// 16-bit key (2 characters = 2 bytes)
const key = Buffer.from('A3');

// Simple XOR encryption
export function encrypt16Bit(plainText: string): string {
  const plainBytes = Buffer.from(plainText, 'utf8');
  const encryptedBytes = Buffer.alloc(plainBytes.length);

  for (let i = 0; i < plainBytes.length; i++) {
    encryptedBytes[i] = plainBytes[i] ^ key[i % key.length];
  }

  // Convert to base64 and ensure it's 16 characters
  const base64 = encryptedBytes.toString('base64');
  return (base64 + '==============').substring(0, 16);
}

// Decrypt back
export function decrypt16Bit(encryptedText: string): string {
  const padded = encryptedText.padEnd(24, '=');
  const encryptedBytes = Buffer.from(padded, 'base64');
  const decryptedBytes = Buffer.alloc(encryptedBytes.length);

  for (let i = 0; i < encryptedBytes.length; i++) {
    decryptedBytes[i] = encryptedBytes[i] ^ key[i % key.length];
  }

  return decryptedBytes.toString('utf8');
}
