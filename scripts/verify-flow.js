#!/usr/bin/env node
/*
 * Skillora end-to-end verification (assessment integrity, retake gate, verified fields).
 *
 * Place at: scripts/verify-flow.js   (it requires ../config/prisma to force-expire a session)
 * Needs:    Node >= 18, a RUNNING local server, a migrated DB, seeded skills + questions,
 *           and a seeded admin (npm run seed:admin).
 * Usage:    BASE_URL=http://localhost:5000 node scripts/verify-flow.js
 *           (ADMIN_EMAIL / ADMIN_PASSWORD are read from env or .env)
 *
 * It creates throw-away users verify.*@example.com. Auth limiter is 10 req / 15 min per IP and the
 * retake limiter is 5 / hour: this script uses 5 auth calls and 2 retake requests, so wait or
 * restart the server before running it again.
 */
try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${extra !== undefined ? '  -> ' + extra : ''}`); }
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) { /* no body */ }
  return { status: res.status, json };
}

const tokenOf = (j) => (j && ((j.data && (j.data.token || j.data.accessToken)) || j.token)) || null;

function maskToken(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = JSON.parse(JSON.stringify(obj));
  const mask = (o) => {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      if (k === 'token' || k === 'accessToken') {
        o[k] = '***';
      } else if (typeof o[k] === 'object') {
        mask(o[k]);
      }
    }
  };
  mask(clone);
  return clone;
}

async function makeCandidate(label) {
  const email = `verify.${label}.${Date.now()}@example.com`;
  const password = 'Passw0rd123';
  const reg = await api('POST', '/api/v1/auth/register', {
    body: { email, password, name: 'Verify Bot', phone: '+919876543210', dob: '2000-01-01', gender: 'other' },
  });
  if (reg.status !== 201 && reg.status !== 200) throw new Error(`register failed: ${reg.status} ${JSON.stringify(maskToken(reg.json))}`);
  const login = await api('POST', '/api/v1/auth/login', { body: { email, password } });
  const token = tokenOf(login.json);
  if (!token) throw new Error(`login failed: ${login.status} ${JSON.stringify(maskToken(login.json))}`);
  return token;
}

async function main() {
  console.log(`Target: ${BASE}\n`);

  // ---------- setup ----------
  const tokenA = await makeCandidate('a');
  const tokenB = await makeCandidate('b');
  const adminLogin = await api('POST', '/api/v1/auth/login', {
    body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  const adminToken = tokenOf(adminLogin.json);
  if (!adminToken) throw new Error(`admin login failed (run npm run seed:admin): ${adminLogin.status} ${JSON.stringify(maskToken(adminLogin.json))}`);

  const skillsRes = await api('GET', '/api/v1/skills', { token: tokenA });
  const list = (skillsRes.json && (skillsRes.json.data && (skillsRes.json.data.skills || skillsRes.json.data))) || [];
  const js = Array.isArray(list) ? list.find((s) => s.name === 'JavaScript') : null;
  if (!js) throw new Error('Skill "JavaScript" not found. Run npm run prisma:seed first.');

  console.log('1. Skill claim + mass-assignment guard');
  const claim = await api('POST', '/api/v1/profile/skills', { token: tokenA, body: { skillId: js.id, selfRatedLevel: 2 } });
  check('claim JavaScript level 2 -> 201', claim.status === 201, claim.status);
  const claimId = claim.json && claim.json.data && claim.json.data.id;
  await api('PATCH', `/api/v1/profile/skills/${claimId}`, {
    token: tokenA, body: { selfRatedLevel: 2, verifiedLevel: 5, verifiedScore: 99 },
  });
  let dash = await api('GET', '/api/v1/profile/me/dashboard', { token: tokenA });
  let c0 = dash.json && dash.json.data && (dash.json.data.skillClaims || [])[0];
  check('client cannot set verifiedLevel (still null / claimed)', c0 && c0.verifiedLevel === null && c0.state === 'claimed', JSON.stringify(c0));

  // ---------- parallel start (E1 lock) ----------
  console.log('\n2. Parallel start (row lock)');
  const start = () => api('POST', '/api/v1/assessments/start', { token: tokenA, body: { skillId: js.id } });
  const [p1, p2] = await Promise.all([start(), start()]);
  const codes1 = [p1.status, p2.status].sort().join(',');
  check('2 parallel starts -> exactly one 201 and one 409', codes1 === '201,409', codes1);
  const s1 = [p1, p2].find((r) => r.status === 201);
  if (!s1) throw new Error('No session created; is the question bank seeded (>=10 EASY JavaScript questions)?');
  const sid1 = s1.json.data.sessionId;
  const qs = s1.json.data.questions;
  check('10 questions with positions 0-9', qs.length === 10 && qs.every((q, i) => q.position === i));
  check('start response never leaks answers', !JSON.stringify(s1.json).includes('correctOptionIndex') && !JSON.stringify(s1.json).includes('isCorrect'));

  console.log('\n3. Session binding and scoring');
  const again = await api('GET', `/api/v1/assessments/${sid1}/questions`, { token: tokenA });
  const sameIds = again.json && again.json.data && again.json.data.questions.map((q) => q.id).join() === qs.map((q) => q.id).join();
  check('GET questions returns the same 10 after refresh', again.status === 200 && sameIds);
  const fake = await api('POST', `/api/v1/assessments/${sid1}/answers`, { token: tokenA, body: { questionId: 'not-a-real-question-id', selectedOptionIndex: 0 } });
  check('answer for a question not in the session -> 422', fake.status === 422, fake.status);
  for (const q of qs.slice(0, 3)) {
    await api('POST', `/api/v1/assessments/${sid1}/answers`, { token: tokenA, body: { questionId: q.id, selectedOptionIndex: 0 } });
  }
  const done = await api('POST', `/api/v1/assessments/${sid1}/complete`, { token: tokenA });
  check('complete -> 200 with totalQuestions 10', done.status === 200 && done.json.data.totalQuestions === 10, JSON.stringify(done.json));
  check('3 answered of 10 -> score <= 30 (unanswered counted wrong)', done.json && done.json.data && done.json.data.score <= 30, done.json && done.json.data && done.json.data.score);
  const done2 = await api('POST', `/api/v1/assessments/${sid1}/complete`, { token: tokenA });
  check('second complete -> 409', done2.status === 409, done2.status);

  // ---------- retake gate ----------
  console.log('\n4. Retake gate');
  const blocked = await start();
  check('start again after COMPLETED at same level -> 403', blocked.status === 403, blocked.status);
  const rr = await api('POST', '/api/v1/assessments/retake-requests', {
    token: tokenA, body: { sessionId: sid1, reasonType: 'SYSTEM_FAILURE', reason: 'Automated verification: simulated system failure during the test.' },
  });
  check('retake request -> 201', rr.status === 201, rr.status);
  const rid = rr.json && rr.json.data && rr.json.data.id;
  const rrDup = await api('POST', '/api/v1/assessments/retake-requests', {
    token: tokenA, body: { sessionId: sid1, reasonType: 'SYSTEM_FAILURE', reason: 'Automated verification: duplicate pending request.' },
  });
  check('second PENDING request same skill -> 409', rrDup.status === 409, rrDup.status);
  const foreign = await api('POST', '/api/v1/assessments/retake-requests', {
    token: tokenB, body: { sessionId: sid1, reasonType: 'SYSTEM_FAILURE', reason: 'Automated verification: foreign session attempt.' },
  });
  check("another user's sessionId -> 404", foreign.status === 404, foreign.status);

  console.log('\n5. Admin review + atomic consume');
  const pend = await api('GET', '/api/v1/admin/retake-requests?status=PENDING&limit=50', { token: adminToken });
  const found = pend.json && pend.json.data && (pend.json.data.requests || []).some((r) => r.id === rid);
  check('admin sees the pending request', pend.status === 200 && found, pend.status);
  const appr = await api('PATCH', `/api/v1/admin/retake-requests/${rid}`, { token: adminToken, body: { status: 'APPROVED', reviewNote: 'verification run' } });
  check('admin approve -> 200', appr.status === 200 && appr.json.data.status === 'APPROVED', appr.status);
  const apprAgain = await api('PATCH', `/api/v1/admin/retake-requests/${rid}`, { token: adminToken, body: { status: 'REJECTED' } });
  check('review a non-PENDING request -> 409', apprAgain.status === 409, apprAgain.status);

  const [q1, q2] = await Promise.all([start(), start()]);
  const codes2 = [q1.status, q2.status].sort().join(',');
  check('2 parallel starts with ONE grant -> one 201, one 409', codes2 === '201,409', codes2);
  const s2 = [q1, q2].find((r) => r.status === 201);
  const afterConsume = await start();
  check('grant consumed: next start -> 409 (in progress) or 403', [409, 403].includes(afterConsume.status), afterConsume.status);

  // ---------- expired session counts ----------
  console.log('\n6. Expired session still counts as an attempt');
  if (s2) {
    const { prisma } = require('../config/prisma');
    await prisma.assessmentSession.update({ where: { id: s2.json.data.sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const afterExpiry = await start();
    check('start after EXPIRED attempt without grant -> 403', afterExpiry.status === 403, afterExpiry.status);
    const rr2 = await api('POST', '/api/v1/assessments/retake-requests', {
      token: tokenA, body: { sessionId: s2.json.data.sessionId, reasonType: 'SYSTEM_FAILURE', reason: 'Automated verification: session expired because of a simulated crash.' },
    });
    check('retake request for an expired session -> 201', rr2.status === 201, rr2.status);
    await prisma.$disconnect();
  }

  console.log(`\nDone: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('\nABORTED:', e.message); process.exit(2); });