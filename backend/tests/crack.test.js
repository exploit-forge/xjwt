const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

jest.mock('node-fetch');
const fetch = require('node-fetch');
const { Response } = jest.requireActual('node-fetch');

afterEach(() => {
  fetch.mockReset();
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
