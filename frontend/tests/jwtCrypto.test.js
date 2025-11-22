import { describe, it, expect, beforeAll } from 'vitest'
import { generateKeyPairSync, createPublicKey, webcrypto } from 'node:crypto'
import {
  signAsymmetric,
  verifyAsymmetric,
  signHmac,
  verifyHmac
} from '../src/components/DecodedSections.jsx'

beforeAll(() => {
  // Ensure Web Crypto exists in Node test env
  if (!globalThis.crypto?.subtle) {
    globalThis.crypto = webcrypto
  }
})

const payload = {
  sub: '1234567890',
  name: 'John Doe',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
}

const headerFor = (alg) => ({ alg, typ: 'JWT' })
const tamperPayload = (token, mutate) => {
  const [h, p, s] = token.split('.')
  const json = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64url').toString('utf8'))
  mutate(json)
  const newPayload = Buffer.from(JSON.stringify(json)).toString('base64url')
  return `${h}.${newPayload}.${s}`
}

describe('asymmetric signing and verification', () => {
  it('RS256 with PKCS8 private key (PEM) and PEM public key', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { format: 'pem', type: 'spki' },
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' }
    })

    const { token } = await signAsymmetric(headerFor('RS256'), payload, privateKey, 'PKCS8', 'RS256')
    const valid = await verifyAsymmetric(token, publicKey, 'PEM', 'RS256')
    expect(valid).toBe(true)

    const tampered = tamperPayload(token, (obj) => { obj.role = 'user' })
    const validTampered = await verifyAsymmetric(tampered, publicKey, 'PEM', 'RS256')
    expect(validTampered).toBe(false)
  })

  it('RS256 with PKCS1 private key (PEM) and PEM public key', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { format: 'pem', type: 'spki' },
      privateKeyEncoding: { format: 'pem', type: 'pkcs1' }
    })

    const { token } = await signAsymmetric(headerFor('RS256'), payload, privateKey, 'PKCS1', 'RS256')
    const valid = await verifyAsymmetric(token, publicKey, 'PEM', 'RS256')
    expect(valid).toBe(true)
  })

  it('RS256 verification with PKCS1 public key', async () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { format: 'pem', type: 'spki' },
      privateKeyEncoding: { format: 'pem', type: 'pkcs1' }
    })
    const pkcs1Public = createPublicKey(privateKey).export({ format: 'pem', type: 'pkcs1' })

    const { token } = await signAsymmetric(headerFor('RS256'), payload, privateKey, 'PKCS1', 'RS256')
    const valid = await verifyAsymmetric(token, pkcs1Public, 'PKCS1', 'RS256')
    expect(valid).toBe(true)
  })

  it('PS256 with PKCS8 private key', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { format: 'pem', type: 'spki' },
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' }
    })

    const { token } = await signAsymmetric(headerFor('PS256'), payload, privateKey, 'PKCS8', 'PS256')
    const valid = await verifyAsymmetric(token, publicKey, 'PEM', 'PS256')
    expect(valid).toBe(true)
  })

  it('ES256 with PKCS8 private key', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { format: 'pem', type: 'spki' },
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' }
    })

    const { token } = await signAsymmetric(headerFor('ES256'), payload, privateKey, 'PKCS8', 'ES256')
    const valid = await verifyAsymmetric(token, publicKey, 'PEM', 'ES256')
    expect(valid).toBe(true)
  })

  it('RS256 with JWK private key and JWK public key', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { format: 'jwk' },
      privateKeyEncoding: { format: 'jwk' }
    })

    const { token } = await signAsymmetric(headerFor('RS256'), payload, privateKey, 'JWK', 'RS256')
    const valid = await verifyAsymmetric(token, publicKey, 'JWK', 'RS256')
    expect(valid).toBe(true)
  })
})

describe('HMAC signing and verification', () => {
  it('HS256 signs and verifies', async () => {
    const secret = 'super-secret'
    const { token } = await signHmac(headerFor('HS256'), payload, secret, 'HS256')
    const valid = await verifyHmac(token, secret, 'HS256')
    expect(valid).toBe(true)
  })

  it('HS256 fails on tampered payload', async () => {
    const secret = 'super-secret'
    const { token } = await signHmac(headerFor('HS256'), payload, secret, 'HS256')
    const tampered = tamperPayload(token, (obj) => { obj.name = 'Jane' })
    const valid = await verifyHmac(tampered, secret, 'HS256')
    expect(valid).toBe(false)
  })
})
