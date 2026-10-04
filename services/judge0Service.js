const fetch = require('node-fetch');

const { RAPIDAPI_KEY, JUDGE0_API_HOST, JUDGE0_API_URL } = process.env;

if (!RAPIDAPI_KEY || !JUDGE0_API_HOST || !JUDGE0_API_URL) {
  throw new Error('Missing required Judge0 env vars: RAPIDAPI_KEY, JUDGE0_API_HOST, JUDGE0_API_URL');
}

const POLLING_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 20;

let _languagesCache = null;
let _languagesCacheTimestamp = 0;
const LANGUAGES_CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchLanguagesFromApi() {
  const res = await fetch(`${JUDGE0_API_URL}/languages`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': JUDGE0_API_HOST,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Judge0 languages fetch failed: ${res.status} ${text}`);
  }

  return res.json();
}

function getLanguages() {
  const now = Date.now();
  if (_languagesCache && now - _languagesCacheTimestamp < LANGUAGES_CACHE_TTL_MS) {
    return Promise.resolve(_languagesCache);
  }

  return fetchLanguagesFromApi().then(data => {
    _languagesCache = data.map(lang => ({ id: lang.id, name: lang.name }));
    _languagesCacheTimestamp = now;
    return _languagesCache;
  });
}

async function isValidLanguageId(languageId) {
  const languages = await getLanguages();
  return languages.some(lang => lang.id === languageId);
}

function base64Encode(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

async function submitBatch(testCases, sourceCode, languageId) {
  const submissions = testCases.map(tc => ({
    source_code: base64Encode(sourceCode),
    language_id: languageId,
    stdin: base64Encode(tc.input),
    expected_output: base64Encode(tc.expectedOutput),
  }));

  const res = await fetch(`${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': JUDGE0_API_HOST,
    },
    body: JSON.stringify({ submissions }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Judge0 batch submit failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.map(item => item.token);
}

async function getBatchResults(tokens) {
  const tokensParam = tokens.join(',');
  const res = await fetch(
    `${JUDGE0_API_URL}/submissions/batch?tokens=${tokensParam}&base64_encoded=true&fields=status_id,stdout,stderr,token`,
    {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': JUDGE0_API_HOST,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Judge0 batch results fetch failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.submissions;
}

module.exports = {
  getLanguages,
  isValidLanguageId,
  submitBatch,
  getBatchResults,
  POLLING_INTERVAL_MS,
  MAX_POLL_ATTEMPTS,
};