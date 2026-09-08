const crypto = require('crypto');

/**
 * Computes the SHA-256 hash of a buffer and returns it as a hex string.
 * Used for file integrity verification (e.g., Resume.fileHash).
 * This is NOT for password/secret hashing — do not use bcrypt here.
 * @param {Buffer} buffer - The file content buffer to hash.
 * @returns {string} SHA-256 hash as a 64-character hex string.
 * @throws {Error} If buffer is not a valid Buffer.
 */
function hashFileBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('buffer must be a Buffer instance');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { hashFileBuffer };
