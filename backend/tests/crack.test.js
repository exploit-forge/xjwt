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
