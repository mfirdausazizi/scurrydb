/**
 * Client-Side Encryption Utilities for Guest Mode
 * 
 * Uses Web Crypto API to encrypt sensitive data (like passwords)
 * before storing in localStorage. This provides a layer of protection
 * against casual inspection of browser storage.
 * 
 * Note: This is NOT a replacement for server-side security.
 * The encryption key is derived from browser-specific data,
 * so the same data won't be decryptable on a different browser.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Generate a unique browser fingerprint for key derivation
 * This ensures encrypted data is tied to this specific browser
 */
async function getBrowserFingerprint(): Promise<string> {
  // Note: deviceMemory is not available in all browsers and requires type assertion
  const nav = navigator as Navigator & { deviceMemory?: number };
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    // Add more entropy
    navigator.hardwareConcurrency?.toString() || '',
    nav.deviceMemory?.toString() || '',
  ];
  
  const fingerprint = components.join('|');
  
  // Hash the fingerprint for consistency
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive an encryption key from the browser fingerprint
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const fingerprint = await getBrowserFingerprint();
  const encoder = new TextEncoder();
  
  // Import the fingerprint as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive the actual encryption key
  // Copy the salt to a new ArrayBuffer to satisfy TypeScript's strict ArrayBuffer typing
  const saltBuffer = new ArrayBuffer(salt.length);
  new Uint8Array(saltBuffer).set(salt);
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value for localStorage storage
 * Returns a base64-encoded string containing salt + iv + ciphertext
 */
export async function encryptForStorage(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  
  try {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(salt);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoder.encode(plaintext)
    );
    
    // Combine salt + iv + ciphertext
    const combined = new Uint8Array(
      salt.length + iv.length + new Uint8Array(encrypted).length
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a value from localStorage
 * Expects a base64-encoded string containing salt + iv + ciphertext
 */
export async function decryptFromStorage(encrypted: string): Promise<string> {
  if (!encrypted) return '';
  
  try {
    // Decode from base64
    const combined = new Uint8Array(
      atob(encrypted).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract salt, iv, and ciphertext
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);
    
    const key = await deriveKey(salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Return empty string if decryption fails (e.g., different browser)
    return '';
  }
}

/**
 * Check if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues === 'function';
}

/**
 * Generate a unique guest ID
 */
export async function generateGuestId(): Promise<string> {
  const fingerprint = await getBrowserFingerprint();
  return `guest-${fingerprint.slice(0, 16)}`;
}
