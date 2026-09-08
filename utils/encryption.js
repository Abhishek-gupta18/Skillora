const crypto = require('crypto');

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_HEX) {
  throw new Error('ENCRYPTION_KEY environment variable is not set. Server cannot start without a valid encryption key.');
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Server cannot start with an invalid key.');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX = 'v1:';

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * @param {string} plaintext - The string to encrypt.
 * @returns {string} Encrypted payload in format "v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>".
 * @throws {Error} If plaintext is not a non-empty string.
 */
function encrypt(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('plaintext must be a non-empty string');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const ivBase64 = iv.toString('base64');
  const authTagBase64 = authTag.toString('base64');
  const ciphertextBase64 = ciphertext.toString('base64');

  return `${VERSION_PREFIX}${ivBase64}:${authTagBase64}:${ciphertextBase64}`;
}

/**
 * Decrypts a payload string encrypted by encrypt().
 * @param {string} payload - The encrypted payload in format "v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>".
 * @returns {string} The decrypted plaintext.
 * @throws {Error} If payload format is invalid, version is unrecognized, or decryption/auth verification fails.
 */
function decrypt(payload) {
  if (typeof payload !== 'string' || payload.length === 0) {
    throw new Error('payload must be a non-empty string');
  }

  if (!payload.startsWith(VERSION_PREFIX)) {
    throw new Error(`Unsupported encryption version. Expected prefix "${VERSION_PREFIX}".`);
  }

  const parts = payload.slice(VERSION_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid payload format. Expected "v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>".');
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = parts;

  let iv, authTag, ciphertext;
  try {
    iv = Buffer.from(ivBase64, 'base64');
    authTag = Buffer.from(authTagBase64, 'base64');
    ciphertext = Buffer.from(ciphertextBase64, 'base64');
  } catch (e) {
    throw new Error('Invalid base64 encoding in payload.');
  }

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length. Expected ${IV_LENGTH} bytes.`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length. Expected ${AUTH_TAG_LENGTH} bytes.`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

module.exports = { encrypt, decrypt };
