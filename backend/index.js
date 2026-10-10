const express = require('express');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const fetch = require('node-fetch');
const dns = require('dns').promises;
const net = require('net');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const WORKER_URL = process.env.WORKER_URL || 'http://jwttool-worker:8000';
const LIVE_TEST_TIMEOUT_MS = 5000;
const LIVE_TEST_ALLOW_PRIVATE_TARGETS = process.env.LIVE_TEST_ALLOW_PRIVATE_TARGETS === 'true';
const BLOCKED_LIVE_HEADERS = new Set([
  'authorization', 'connection', 'content-length', 'content-type', 'host',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

// Connected Server-Sent Events clients
const sseClients = new Set();

app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ limit: '3mb', extended: true }));

// Helper to wrap async route handlers
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Note: Encoding/decoding and verification are handled on the client.

// Start cracking job using jwttool-worker service via POST or GET (for SSE clients)
const crackHandler = async (req, res) => {
  const token = req.method === 'GET' ? req.query.token : req.body.token;
  const wordlist = req.method === 'GET' ? req.query.wordlist : req.body.wordlist;
  
  if (!token) {
    res.writeHead(400, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });
    res.write(`data: ERROR token required\n\n`);
    res.write('data: DONE\n\n');
    res.end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });

  try {
    const workerRes = await fetch(`${WORKER_URL}/crack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, wordlist }),
    });
    const result = await workerRes.json();
    if (!workerRes.ok) {
      throw new Error(result.detail || `Security worker returned ${workerRes.status}`);
    }
    if (result.secret) {
      res.write(`data: RESULT ${JSON.stringify(result)}\n\n`);
    }
  } catch (err) {
    res.write(`data: ERROR ${err.message}\n\n`);
  } finally {
    res.write('data: DONE\n\n');
    res.end();
    sseClients.delete(res);
  }
};

app.post('/crack', [
  body('token').isString().notEmpty(),
  body('wordlist').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.writeHead(400, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });
    res.write(`data: ERROR ${errors.array().map(e => e.msg).join(', ')}\n\n`);
    res.write('data: DONE\n\n');
    res.end();
    return;
  }
  
  try {
    await crackHandler(req, res);
  } catch (err) {
    console.error('Error in crack handler:', err);
    if (!res.headersSent) {
      res.writeHead(500, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });
      res.write(`data: ERROR ${err.message}\n\n`);
      res.write('data: DONE\n\n');
      res.end();
    }
  }
});

const proxyWorkerJson = endpoint => asyncHandler(async (req, res) => {
  const workerRes = await fetch(`${WORKER_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
  const result = await workerRes.json();
  if (!workerRes.ok) {
    return res.status(workerRes.status).json({ error: result.detail || 'Security worker request failed' });
  }
  return res.json(result);
});

const isPrivateAddress = address => {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || a >= 224;
  }
  const normalized = address.toLowerCase().split('%')[0];
  if (normalized.startsWith('::ffff:')) return isPrivateAddress(normalized.slice(7));
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') ||
    normalized.startsWith('fd') || normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') ||
    normalized.startsWith('ff');
};

const resolveLiveTarget = async target => {
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    throw Object.assign(new Error('Enter a valid absolute target URL'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) {
    throw Object.assign(new Error('Target must be an HTTP(S) URL without credentials or a fragment'), { status: 400 });
  }
  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw Object.assign(new Error('Target hostname could not be resolved'), { status: 400 });
  }
  if (!addresses.length) throw Object.assign(new Error('Target hostname could not be resolved'), { status: 400 });
  if (!LIVE_TEST_ALLOW_PRIVATE_TARGETS && addresses.some(({ address }) => isPrivateAddress(address))) {
    throw Object.assign(new Error('Private and internal network targets are blocked'), { status: 400 });
  }
  const pinned = addresses[0];
  const Agent = parsed.protocol === 'https:' ? https.Agent : http.Agent;
  const agent = new Agent({
    lookup: (_hostname, options, callback) => {
      if (options && options.all) return callback(null, [pinned]);
      return callback(null, pinned.address, pinned.family);
    },
  });
  return { parsed, agent };
};

const createRequestBody = (method, bodyFormat, requestBody) => {
  if (method !== 'POST') return { body: undefined, contentType: undefined };
  let parsedBody;
  try {
    parsedBody = JSON.parse(requestBody || '{}');
  } catch {
    throw Object.assign(new Error('Request body must be a valid JSON object'), { status: 400 });
  }
  if (!parsedBody || Array.isArray(parsedBody) || typeof parsedBody !== 'object') {
    throw Object.assign(new Error('Request body must be a JSON object'), { status: 400 });
  }
  if (bodyFormat === 'form') {
    const form = new URLSearchParams();
    Object.entries(parsedBody).forEach(([key, value]) => form.set(key, typeof value === 'string' ? value : JSON.stringify(value)));
    return { body: form.toString(), contentType: 'application/x-www-form-urlencoded' };
  }
  return { body: JSON.stringify(parsedBody), contentType: 'application/json' };
};

const validateCustomHeaders = customHeaders => {
  if (customHeaders === undefined) return {};
  if (!Array.isArray(customHeaders) || customHeaders.length > 10) {
    throw Object.assign(new Error('Custom headers must contain at most 10 entries'), { status: 400 });
  }
  const headers = {};
  for (const header of customHeaders) {
    const name = typeof header?.name === 'string' ? header.name.trim() : '';
    const value = typeof header?.value === 'string' ? header.value : '';
    if (!name || !value || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/.test(name)) {
      throw Object.assign(new Error('Every custom header requires a valid name and value'), { status: 400 });
    }
    if (value.length > 2048 || /[\r\n]/.test(value)) {
      throw Object.assign(new Error(`Invalid value for custom header ${name}`), { status: 400 });
    }
    if (BLOCKED_LIVE_HEADERS.has(name.toLowerCase())) {
      throw Object.assign(new Error(`Custom header ${name} is managed by xJWT and cannot be overridden`), { status: 400 });
    }
    headers[name] = value;
  }
  return headers;
};

const runRequestProbe = async ({ parsed, agent }, options, test) => {
  const { tokenTransport, tokenParameter, requestMethod, bodyFormat, requestBody, customHeaders } = options;
  const requestUrl = new URL(parsed.toString());
  const headers = { Accept: 'application/json, text/plain, */*', 'User-Agent': 'xjwt-live-security-test/1.0', ...customHeaders };
  if (tokenTransport === 'authorization') headers.Authorization = `Bearer ${test.token}`;
  else requestUrl.searchParams.set(tokenParameter, test.token);
  const requestPayload = createRequestBody(requestMethod, bodyFormat, requestBody);
  if (requestPayload.contentType) headers['Content-Type'] = requestPayload.contentType;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TEST_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(requestUrl.toString(), {
      method: requestMethod,
      redirect: 'manual',
      agent,
      signal: controller.signal,
      headers,
      body: requestPayload.body,
    });
    if (response.body && typeof response.body.destroy === 'function') response.body.destroy();
    const accepted = response.status >= 200 && response.status < 400;
    const rejected = response.status >= 400 && response.status < 500;
    const passed = test.control ? accepted : rejected;
    return {
      id: test.id,
      title: test.title,
      token: test.token,
      kind: test.control ? 'control' : 'probe',
      passed,
      status: response.status,
      outcome: accepted ? 'Accepted' : rejected ? 'Rejected' : 'Server error',
      duration_ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      id: test.id,
      title: test.title,
      token: test.token,
      kind: test.control ? 'control' : 'probe',
      passed: false,
      status: null,
      outcome: error.name === 'AbortError' ? 'Timed out' : 'Request failed',
      error: error.name === 'AbortError' ? `No response within ${LIVE_TEST_TIMEOUT_MS / 1000} seconds` : error.message,
      duration_ms: Date.now() - startedAt,
    };
  }
};

app.post('/security/analyze', [
  body('token').isString().notEmpty().isLength({ max: 32768 }),
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A valid JWT is required' });
  return proxyWorkerJson('analyze')(req, res, next);
});

app.post('/security/playbook', [
  body('token').isString().notEmpty().isLength({ max: 32768 }),
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'A valid JWT is required' });
  return proxyWorkerJson('playbook')(req, res, next);
});

app.post('/security/live-test', [
  body('token').isString().notEmpty().isLength({ max: 32768 }),
  body('targetUrl').isString().notEmpty().isLength({ max: 2048 }),
  body('requestMethod').isIn(['GET', 'POST']),
  body('bodyFormat').optional().isIn(['json', 'form']),
  body('requestBody').optional().isString().isLength({ max: 16384 }),
  body('customHeaders').optional().isArray({ max: 10 }),
  body('tokenTransport').isIn(['authorization', 'query']),
  body('tokenParameter').optional({ values: 'falsy' }).isString().matches(/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/),
  body('authorized').equals('true'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty() || (req.body.tokenTransport === 'query' && !req.body.tokenParameter)) {
    return res.status(400).json({ error: 'A valid token, target URL, delivery method, and authorization confirmation are required' });
  }

  const normalizedToken = req.body.token.trim().replace(/^Bearer\s+/i, '');
  const customHeaders = validateCustomHeaders(req.body.customHeaders);
  if (req.body.requestMethod === 'POST') createRequestBody(req.body.requestMethod, req.body.bodyFormat || 'json', req.body.requestBody);
  const target = await resolveLiveTarget(req.body.targetUrl);
  const workerRes = await fetch(`${WORKER_URL}/playbook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: normalizedToken }),
  });
  const playbook = await workerRes.json();
  if (!workerRes.ok) {
    return res.status(workerRes.status).json({ error: playbook.detail || 'Could not generate live-test probes' });
  }

  const tests = [
    { id: 'original-token', title: 'Original token control', token: normalizedToken, control: true },
    ...playbook.mutations.slice(0, 10).map(mutation => ({ ...mutation, control: false })),
  ];
  let results;
  try {
    results = await Promise.all(tests.map(test => runRequestProbe(target, {
      tokenTransport: req.body.tokenTransport,
      tokenParameter: req.body.tokenParameter,
      requestMethod: req.body.requestMethod,
      bodyFormat: req.body.bodyFormat || 'json',
      requestBody: req.body.requestBody,
      customHeaders,
    }, test)));
  } finally {
    target.agent.destroy();
  }
  return res.json({
    target: `${target.parsed.origin}${target.parsed.pathname}`,
    method: req.body.requestMethod,
    token_parameter: req.body.tokenParameter || null,
    delivery: req.body.tokenTransport === 'authorization' ? 'Authorization: Bearer' : `Query: ${req.body.tokenParameter}`,
    passed: results.filter(result => result.passed).length,
    failed: results.filter(result => !result.passed).length,
    results,
  });
}));

// Endpoint for worker to send log lines
app.post('/worker/results', (req, res) => {
  const { line } = req.body || {};
  if (line) {
    for (const client of sseClients) {
      client.write(`data: ${line}\n\n`);
    }
  }
  res.sendStatus(200);
});

// Global error handler
app.use((err, req, res, next) => {
  if (!err.status || err.status >= 500) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
