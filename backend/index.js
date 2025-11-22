const express = require('express');
const { body, validationResult } = require('express-validator');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Connected Server-Sent Events clients
const sseClients = new Set();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for large wordlists
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    const workerRes = await fetch('http://jwttool-worker:8000/crack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, wordlist }),
    });
    const result = await workerRes.json();
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

app.get('/crack', crackHandler);

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
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
