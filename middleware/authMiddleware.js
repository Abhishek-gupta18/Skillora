const { prisma } = require('../config/prisma');
const { verifyToken } = require('../utils/jwt');
const { evaluateAuthState } = require('../utils/authState');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  let claims;
  try {
    claims = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  if (!claims.id || typeof claims.tv !== 'number') {
    return res.status(401).json({ success: false, message: 'Invalid token payload' });
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { id: true, email: true, role: true, status: true, tokenVersion: true },
  });

  const result = evaluateAuthState(user, claims);
  if (!result.ok) {
    return res.status(result.status).json({ success: false, message: result.message });
  }

  req.user = result.user;
  next();
}

module.exports = { authenticate };