const { test, describe } = require('node:test');
const assert = require('node:assert');
const { evaluateAuthState } = require('../utils/authState');

describe('evaluateAuthState', () => {
  test('returns 401 when user is null', () => {
    const result = evaluateAuthState(null, { tv: 0 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 401);
    assert.strictEqual(result.message, 'Invalid or expired token');
  });

  test('returns 403 when user status is SUSPENDED', () => {
    const user = { id: 'u1', role: 'CANDIDATE', status: 'SUSPENDED', tokenVersion: 0 };
    const result = evaluateAuthState(user, { tv: 0 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 403);
    assert.strictEqual(result.message, 'Account suspended');
  });

  test('returns 403 when user status is INACTIVE (non-ACTIVE)', () => {
    const user = { id: 'u1', role: 'CANDIDATE', status: 'INACTIVE', tokenVersion: 0 };
    const result = evaluateAuthState(user, { tv: 0 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 403);
    assert.strictEqual(result.message, 'Account suspended');
  });

  test('returns 401 when tokenVersion mismatch', () => {
    const user = { id: 'u1', role: 'CANDIDATE', status: 'ACTIVE', tokenVersion: 2 };
    const result = evaluateAuthState(user, { tv: 1 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 401);
    assert.strictEqual(result.message, 'Token revoked');
  });

  test('returns ok when user is ACTIVE and tokenVersion matches', () => {
    const user = { id: 'u1', email: 'test@example.com', role: 'CANDIDATE', status: 'ACTIVE', tokenVersion: 5 };
    const result = evaluateAuthState(user, { tv: 5 });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.user, { id: 'u1', email: 'test@example.com', role: 'CANDIDATE', status: 'ACTIVE' });
  });

  test('returns ok for ADMIN role when ACTIVE and tokenVersion matches', () => {
    const user = { id: 'u1', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE', tokenVersion: 0 };
    const result = evaluateAuthState(user, { tv: 0 });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.user, { id: 'u1', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' });
  });
});