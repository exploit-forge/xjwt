const request = require('supertest');
const app = require('../index');

describe('JWT encode and decode routes', () => {
  test('encodes and decodes a token round-trip', async () => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { foo: 'bar' };
    const secret = 'mysecret';

    const encodeRes = await request(app)
      .post('/encode')
      .send({ header, payload, secret })
      .expect(200);
    const token = encodeRes.body.token;
    expect(typeof token).toBe('string');

    const decodeRes = await request(app)
      .post('/decode')
      .send({ token })
      .expect(200);

    expect(decodeRes.body.header.alg).toBe(header.alg);
    expect(decodeRes.body.payload.foo).toBe(payload.foo);
  });

  test('returns 400 for invalid token', async () => {
    const res = await request(app)
      .post('/decode')
      .send({ token: 'invalid.token.value' })
      .expect(400);
    expect(res.body.error).toBeDefined();
  });
});
