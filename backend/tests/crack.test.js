const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

jest.mock('node-fetch');
const fetch = require('node-fetch');
const { Response } = jest.requireActual('node-fetch');
const dns = require('dns').promises;

jest.mock('dns', () => ({ promises: { lookup: jest.fn() } }));

afterEach(() => {
  fetch.mockReset();
  dns.lookup.mockReset();
});

test('/security/live-test reports control and mutation pass/fail results', async () => {
  dns.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  fetch
    .mockResolvedValueOnce(new Response(JSON.stringify({ mutations: [{ id: 'alg-none', title: 'Unsigned token', token: 'a.b.' }] })))
    .mockResolvedValueOnce(new Response('', { status: 200 }))
    .mockResolvedValueOnce(new Response('', { status: 401 }));

  const res = await request(app)
    .post('/security/live-test')
    .send({ token: 'header.payload.signature', targetUrl: 'https://example.com/account', requestMethod: 'GET', tokenTransport: 'query', tokenParameter: 'token', authorized: true })
    .expect(200);

  expect(res.body).toMatchObject({ passed: 2, failed: 0, token_parameter: 'token' });
  expect(res.body.results).toHaveLength(2);
  expect(res.body.results[1].token).toBe('a.b.');
  expect(fetch.mock.calls[1][0]).toContain('token=header.payload.signature');
});

test('/security/live-test blocks private network targets', async () => {
  dns.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
  const res = await request(app)
    .post('/security/live-test')
    .send({ token: 'header.payload.signature', targetUrl: 'http://localhost/private', requestMethod: 'GET', tokenTransport: 'query', tokenParameter: 'jwt', authorized: true })
    .expect(400);
  expect(res.body.error).toMatch(/private|internal/i);
});

test('/security/live-test supports Authorization Bearer and strips a pasted prefix', async () => {
  dns.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  fetch
    .mockResolvedValueOnce(new Response(JSON.stringify({ mutations: [] })))
    .mockResolvedValueOnce(new Response('', { status: 204 }));

  const res = await request(app)
    .post('/security/live-test')
    .send({ token: 'Bearer header.payload.signature', targetUrl: 'https://example.com/account', requestMethod: 'GET', tokenTransport: 'authorization', authorized: true })
    .expect(200);

  expect(res.body.delivery).toBe('Authorization: Bearer');
  expect(JSON.parse(fetch.mock.calls[0][1].body).token).toBe('header.payload.signature');
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer header.payload.signature');
});

test('/security/live-test sends POST probes with a JSON body', async () => {
  dns.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  fetch
    .mockResolvedValueOnce(new Response(JSON.stringify({ mutations: [] })))
    .mockResolvedValueOnce(new Response('', { status: 200 }));

  await request(app)
    .post('/security/live-test')
    .send({
      token: 'header.payload.signature',
      targetUrl: 'https://example.com/request',
      requestMethod: 'POST',
      bodyFormat: 'json',
      requestBody: '{"amount":1000}',
      tokenTransport: 'authorization',
      customHeaders: [{ name: 'X-API-Key', value: 'test-api-key' }],
      authorized: true,
    })
    .expect(200);

  expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST', body: '{"amount":1000}' });
  expect(fetch.mock.calls[1][1].headers['Content-Type']).toBe('application/json');
  expect(fetch.mock.calls[1][1].headers['X-API-Key']).toBe('test-api-key');
});

test('/security/live-test blocks managed custom headers', async () => {
  const res = await request(app)
    .post('/security/live-test')
    .send({
      token: 'header.payload.signature',
      targetUrl: 'https://example.com/account',
      requestMethod: 'GET',
      tokenTransport: 'authorization',
      customHeaders: [{ name: 'Host', value: 'internal.example' }],
      authorized: true,
    })
    .expect(400);
  expect(res.body.error).toMatch(/cannot be overridden/i);
});

test('/crack returns secret when in wordlist', async () => {
  const secret = 'secret';
  const token = jwt.sign({foo: 'bar'}, secret);
  fetch.mockResolvedValue(new Response(JSON.stringify({secret, hash: 'hash'})));

  const res = await request(app)
    .post('/crack')
    .send({ token })
    .expect(200);

  expect(res.text).toContain(secret);
});

test('/security/analyze proxies a valid worker response', async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({finding_count: 1, findings: [{id: 'missing-exp'}]})));
  const res = await request(app)
    .post('/security/analyze')
    .send({ token: 'header.payload.signature' })
    .expect(200);
  expect(res.body.finding_count).toBe(1);
  expect(fetch.mock.calls[0][0]).toContain('/analyze');
});

test('/security/playbook passes worker errors through safely', async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({detail: 'JWT must contain exactly three segments'}), {status: 400}));
  const res = await request(app)
    .post('/security/playbook')
    .send({ token: 'invalid' })
    .expect(400);
  expect(res.body.error).toMatch(/three segments/);
});
