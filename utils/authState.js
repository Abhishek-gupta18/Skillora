function evaluateAuthState(user, claims) {
  if (!user) {
    return { ok: false, status: 401, message: 'Invalid or expired token' };
  }
  if (user.status !== 'ACTIVE') {
    return { ok: false, status: 403, message: 'Account suspended' };
  }
  if (user.tokenVersion !== claims.tv) {
    return { ok: false, status: 401, message: 'Token revoked' };
  }
  return { ok: true, user: { id: user.id, email: user.email, role: user.role, status: user.status } };
}

module.exports = { evaluateAuthState };