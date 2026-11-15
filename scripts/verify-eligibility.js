#!/usr/bin/env node
/*
 * Skillora eligibility verification (job matching, skill gaps, ranking).
 *
 * Place at: scripts/verify-eligibility.js
 * Needs:    Node >= 18, a RUNNING local server, a migrated DB, seeded skills + questions.
 * Usage:    BASE_URL=http://localhost:5000 node scripts/verify-eligibility.js
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

const tokenOf = (j) => (j && ((j.data && (j.data.token || j.data.accessToken)) || j.token)) || null;

async function makeCandidate(label) {
  const email = `verify.elig.${label}.${Date.now()}@example.com`;
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

  const skillsRes = await api('GET', '/api/v1/skills', { token: tokenA });
  const list = (skillsRes.json && (skillsRes.json.data && (skillsRes.json.data.skills || skillsRes.json.data))) || [];
  const js = Array.isArray(list) ? list.find((s) => s.name === 'JavaScript') : null;
  if (!js) throw new Error('Skill "JavaScript" not found. Run npm run prisma:seed first.');

  console.log('1. Skill claim');
  const claim = await api('POST', '/api/v1/profile/skills', { token: tokenA, body: { skillId: js.id, selfRatedLevel: 3 } });
  check('claim JavaScript level 3 -> 201', claim.status === 201, claim.status);
  const claimId = claim.json && claim.json.data && claim.json.data.id;

  console.log('\n2. Job eligibility');
  const jobsRes = await api('GET', '/api/v1/jobs', { token: tokenA });
  const jobs = jobsRes.json && jobsRes.json.data || [];
  if (jobs.length === 0) throw new Error('No open jobs found. Seed jobs first.');
  const job = jobs[0];

  const elig = await api('GET', `/api/v1/jobs/${job.id}/eligibility`, { token: tokenA });
  check('job eligibility -> 200', elig.status === 200, elig.status);
  check('eligibility has required fields', elig.json && elig.json.data && typeof elig.json.data.eligibilityScore === 'number' && typeof elig.json.data.isEligible === 'boolean' && elig.json.data.eligibilityLabel);
  check('eligibilityLabel is valid', ['eligible', 'partially-eligible', 'skill-gap'].includes(elig.json.data.eligibilityLabel));

  console.log('\n3. Job matches ranking');
  const matches = await api('GET', '/api/v1/profile/me/job-matches', { token: tokenA });
  check('job matches -> 200', matches.status === 200, matches.status);
  const matchList = matches.json && matches.json.data || [];
  check('job matches is array', Array.isArray(matchList));
  if (matchList.length > 0) {
    check('each match has eligibilityLabel', matchList.every(m => ['eligible', 'partially-eligible', 'skill-gap'].includes(m.eligibilityLabel)));
    check('matches sorted by score desc', matchList.slice(1).every((m, i) => m.eligibilityScore <= matchList[i].eligibilityScore));
  }

  console.log('\n4. Cross-candidate comparison');
  const claimB = await api('POST', '/api/v1/profile/skills', { token: tokenB, body: { skillId: js.id, selfRatedLevel: 5 } });
  check('claimB level 5 -> 201', claimB.status === 201, claimB.status);
  const eligB = await api('GET', `/api/v1/jobs/${job.id}/eligibility`, { token: tokenB });
  if (elig.json.data.eligibilityLabel !== eligB.json.data.eligibilityLabel) {
    console.log(`  Candidate A: ${elig.json.data.eligibilityLabel} (score ${elig.json.data.eligibilityScore})`);
    console.log(`  Candidate B: ${eligB.json.data.eligibilityLabel} (score ${eligB.json.data.eligibilityScore})`);
  }
  check('both candidates get eligibility response', elig.status === 200 && eligB.status === 200);

  console.log(`\nDone: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('\nABORTED:', e.message); process.exit(2); });