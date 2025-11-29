import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required.\n' +
      'Generate a secure key with: openssl rand -hex 16\n' +
      'The key must be at least 16 characters long.'
    );
  }
  if (key.length < 16) {
    throw new Error(
      'ENCRYPTION_KEY must be at least 16 characters long.\n' +
      'Generate a secure key with: openssl rand -hex 16'
    );
  }
  return key;
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

export function encrypt(text: string): string {
  if (!text) return '';
  
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(getEncryptionKey(), salt);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Format: salt:iv:tag:encrypted (all base64)
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  
  const parts = encryptedText.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted format');
  }
  
  const [saltB64, ivB64, tagB64, encryptedB64] = parts;
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  
  const key = deriveKey(getEncryptionKey(), salt);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  return decipher.update(encrypted) + decipher.final('utf8');
}
