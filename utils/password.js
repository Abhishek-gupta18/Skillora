const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hashes a plain password using bcrypt with salt rounds = 12.
 * @param {string} plainPassword - The password to hash.
 * @returns {Promise<string>} The bcrypt hash.
 * @throws {Error} If plainPassword is not a non-empty string.
 */
async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new Error('plainPassword must be a non-empty string');
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compares a plain password against a bcrypt hash.
 * @param {string} plainPassword - The plain password to verify.
 * @param {string} hash - The bcrypt hash to compare against.
 * @returns {Promise<boolean>} True if the password matches the hash, false otherwise.
 * Returns false (does not throw) if either argument is missing or invalid.
 */
async function comparePassword(plainPassword, hash) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    return false;
  }
  if (typeof hash !== 'string' || hash.length === 0) {
    return false;
  }
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { hashPassword, comparePassword };
