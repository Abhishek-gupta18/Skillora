const jwt = require('jsonwebtoken');

function signToken(payload, options = {}) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn, ...options });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}

function decodeToken(token) {
  return jwt.decode(token, { complete: true });
}

module.exports = { signToken, verifyToken, decodeToken };