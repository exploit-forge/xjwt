const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to wrap async route handlers
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Decode JWT
app.post('/decode', [
  body('token').isString().notEmpty(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { token } = req.body;
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) return res.status(400).json({ error: 'Invalid token' });
    res.json(decoded);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}));

// Encode JWT
app.post('/encode', [
  body('header').isObject(),
  body('payload').isObject(),
  body('secret').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { header, payload, secret } = req.body;
  try {
    const token = jwt.sign(payload, secret || '', { header });
    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}));

// Verify signature
app.post('/verify', [
  body('token').isString().notEmpty(),
  body('secret').isString().notEmpty(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { token, secret } = req.body;
  jwt.verify(token, secret, (err, decoded) => {
    if (err) return res.status(400).json({ valid: false, error: err.message });
    res.json({ valid: true, decoded });
  });
}));

// Start cracking job using jwttool-worker
app.post('/crack', [
  body('token').isString().notEmpty(),
  body('wordlist').optional().isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { token, wordlist } = req.body;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const args = [token];
  if (wordlist) args.push(wordlist);

  const worker = spawn('jwttool-worker', args);
  worker.stdout.on('data', data => {
    res.write(`data: ${data.toString()}\n\n`);
  });
  worker.stderr.on('data', data => {
    res.write(`data: ERROR ${data.toString()}\n\n`);
  });
  worker.on('close', code => {
    res.write(`data: DONE code=${code}\n\n`);
    res.end();
  });

  req.on('close', () => {
    worker.kill();
  });
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
