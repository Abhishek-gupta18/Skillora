process.env.DATABASE_SSL = 'false';
process.env.ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
process.env.JWT_SECRET = 'test-secret-key-for-smoke-test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../routes');

function getRouteFiles() {
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  return files.map(f => path.join(ROUTES_DIR, f));
}

describe('smoke test: all route files load without errors', () => {
  const routeFiles = getRouteFiles();

  for (const routeFile of routeFiles) {
    const relativePath = path.relative(__dirname, routeFile);
    test(`require(${relativePath}) exports a router`, () => {
      const router = require(routeFile);
      assert.ok(router, `${relativePath} should export something`);
      assert.strictEqual(typeof router, 'function', `${relativePath} should export a function (router)`);
      // Express router has a 'stack' property
      assert.ok(router.stack !== undefined, `${relativePath} should have a stack property (Express router)`);
    });
  }
});