import { Fragment, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import JSONWithTimestampTooltips from './JSONWithTimestampTooltips'

const base64UrlEncode = (str) =>
  btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

const base64UrlToUint8 = (base64UrlString) => {
  const padded = base64UrlString.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 2 ? '==' : padded.length % 4 === 3 ? '=' : ''
  const base64 = padded + pad
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const pemToArrayBuffer = (pem) => {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '')
  const binary = atob(cleaned)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) {
    view[i] = binary.charCodeAt(i)
  }
  return buffer
}

const pkcs1PublicToSpki = (pkcs1Der) => {
  const pkcs1Bytes = new Uint8Array(pkcs1Der)
  const algId = Uint8Array.of(
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00
  )
  const bitStringLen = encodeDerLength(pkcs1Bytes.length + 1)
  const bitString = new Uint8Array(1 + bitStringLen.length + 1 + pkcs1Bytes.length)
  bitString[0] = 0x03
  bitString.set(bitStringLen, 1)
  bitString[1 + bitStringLen.length] = 0x00 // unused bits
  bitString.set(pkcs1Bytes, 1 + bitStringLen.length + 1)

  const seqLen = algId.length + bitString.length
  const totalLen = encodeDerLength(seqLen)
  const spki = new Uint8Array(1 + totalLen.length + seqLen)
  spki[0] = 0x30
  spki.set(totalLen, 1)
  spki.set(algId, 1 + totalLen.length)
  spki.set(bitString, 1 + totalLen.length + algId.length)
  return spki.buffer
}

const getHashForAlg = (alg) => {
  switch (alg) {
    case 'HS256':
    case 'RS256':
    case 'PS256':
    case 'ES256':
      return 'SHA-256'
    case 'HS384':
    case 'RS384':
    case 'PS384':
    case 'ES384':
      return 'SHA-384'
    case 'HS512':
    case 'RS512':
    case 'PS512':
    case 'ES512':
      return 'SHA-512'
    default:
      return 'SHA-256'
  }
}

const base64UrlEncodeBytes = (buffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return base64UrlEncode(binary)
}

const getRsaParams = (alg) => ({
  name: alg.startsWith('PS') ? 'RSA-PSS' : 'RSASSA-PKCS1-v1_5',
  hash: { name: getHashForAlg(alg) }
})

const getEcdsaParams = (alg) => ({
  name: 'ECDSA',
  namedCurve: alg === 'ES256' ? 'P-256' : alg === 'ES384' ? 'P-384' : 'P-521'
})

const rawSignatureToDer = (signature, alg) => {
  const sizeMap = { ES256: 32, ES384: 48, ES512: 66 }
  const size = sizeMap[alg]
  if (!size) throw new Error('Unsupported ECDSA size')
  const r = signature.slice(0, size)
  const s = signature.slice(size)

  const trim = (arr) => {
    let i = 0
    while (i < arr.length - 1 && arr[i] === 0) i += 1
    return arr.slice(i)
  }

  const encodeInt = (arr) => {
    const t = trim(arr)
    const needsPadding = t[0] & 0x80
    const padded = needsPadding ? Uint8Array.from([0, ...t]) : t
    return Uint8Array.from([0x02, padded.length, ...padded])
  }

  const rEnc = encodeInt(r)
  const sEnc = encodeInt(s)
  const len = rEnc.length + sEnc.length
  return Uint8Array.from([0x30, len, ...rEnc, ...sEnc])
}

const importPublicKey = async (keyString, keyFormat, alg) => {
  const format = keyFormat?.toUpperCase() || 'PEM'

  if (format === 'JWK') {
    const jwk = typeof keyString === 'string' ? JSON.parse(keyString) : keyString
    const params = alg.startsWith('ES') ? getEcdsaParams(alg) : getRsaParams(alg)
    return crypto.subtle.importKey('jwk', jwk, params, false, ['verify'])
  }

  const der = pemToArrayBuffer(keyString)
  const params = alg.startsWith('ES') ? getEcdsaParams(alg) : getRsaParams(alg)

  if (format === 'PKCS1' && !alg.startsWith('ES')) {
    const spki = pkcs1PublicToSpki(der)
    return crypto.subtle.importKey('spki', spki, params, false, ['verify'])
  }

  return crypto.subtle.importKey('spki', der, params, false, ['verify'])
}

const encodeDerLength = (len) => {
  if (len < 128) return Uint8Array.of(len)
  if (len < 256) return Uint8Array.of(0x81, len)
  return Uint8Array.of(0x82, (len >> 8) & 0xff, len & 0xff)
}

// Wraps an RSA PKCS#1 private key DER into PKCS#8 so Web Crypto can import it
const pkcs1ToPkcs8 = (pkcs1Der) => {
  const pkcs1Bytes = new Uint8Array(pkcs1Der)
  const version = Uint8Array.of(0x02, 0x01, 0x00)
  const algId = Uint8Array.of(
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00
  )
  const pkcs1Len = encodeDerLength(pkcs1Bytes.length)
  const privateKeyOctet = new Uint8Array(1 + pkcs1Len.length + pkcs1Bytes.length)
  privateKeyOctet.set([0x04, ...pkcs1Len], 0)
  privateKeyOctet.set(pkcs1Bytes, 1 + pkcs1Len.length)

  const seqLen = version.length + algId.length + privateKeyOctet.length
  const totalLen = encodeDerLength(seqLen)
  const pkcs8 = new Uint8Array(1 + totalLen.length + seqLen)
  pkcs8[0] = 0x30
  pkcs8.set(totalLen, 1)
  pkcs8.set(version, 1 + totalLen.length)
  pkcs8.set(algId, 1 + totalLen.length + version.length)
  pkcs8.set(privateKeyOctet, 1 + totalLen.length + version.length + algId.length)
  return pkcs8.buffer
}

const importPrivateKey = async (keyString, keyFormat, alg) => {
  const format = keyFormat?.toUpperCase() || 'PKCS8'

  if (format === 'JWK') {
    const jwk = typeof keyString === 'string' ? JSON.parse(keyString) : keyString
    const params = alg.startsWith('ES') ? getEcdsaParams(alg) : getRsaParams(alg)
    return crypto.subtle.importKey('jwk', jwk, params, false, ['sign'])
  }

  const der = pemToArrayBuffer(keyString)
  const params = alg.startsWith('ES') ? getEcdsaParams(alg) : getRsaParams(alg)

  if (format === 'PKCS1' && !alg.startsWith('ES')) {
    const pkcs8Wrapped = pkcs1ToPkcs8(der)
    return crypto.subtle.importKey('pkcs8', pkcs8Wrapped, params, false, ['sign'])
  }

  return crypto.subtle.importKey('pkcs8', der, params, false, ['sign'])
}

const signHmac = async (headerObj, payloadObj, secret, alg = 'HS256') => {
  const headerJson = JSON.stringify({ ...headerObj, alg })
  const payloadJson = JSON.stringify(payloadObj)
  const encodedHeader = base64UrlEncode(headerJson)
  const encodedPayload = base64UrlEncode(payloadJson)

  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: getHashForAlg(alg) },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data)
  const signature = base64UrlEncodeBytes(signatureBuffer)

  return { token: `${encodedHeader}.${encodedPayload}.${signature}`, signature }
}

const derToRawSignature = (derSig, alg) => {
  const sizeMap = { ES256: 32, ES384: 48, ES512: 66 }
  const size = sizeMap[alg]
  if (!size) throw new Error('Unsupported ECDSA size')
  const bytes = new Uint8Array(derSig)
  // If it's already raw (r||s), just return
  if (bytes[0] !== 0x30) {
    if (bytes.length === size * 2) return bytes
    throw new Error('Invalid DER signature')
  }
  let offset = 2
  const getInt = () => {
    if (bytes[offset] !== 0x02) throw new Error('Invalid DER integer')
    const len = bytes[offset + 1]
    const val = bytes.slice(offset + 2, offset + 2 + len)
    offset += 2 + len
    return val
  }
  const r = getInt()
  const s = getInt()
  const pad = (arr) => {
    if (arr.length > size) return arr.slice(arr.length - size)
    if (arr.length === size) return arr
    const padded = new Uint8Array(size)
    padded.set(arr, size - arr.length)
    return padded
  }
  const raw = new Uint8Array(size * 2)
  raw.set(pad(r), 0)
  raw.set(pad(s), size)
  return raw
}

const signAsymmetric = async (headerObj, payloadObj, privateKey, keyFormat, alg) => {
  const headerJson = JSON.stringify({ ...headerObj, alg })
  const payloadJson = JSON.stringify(payloadObj)
  const encodedHeader = base64UrlEncode(headerJson)
  const encodedPayload = base64UrlEncode(payloadJson)
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  const key = await importPrivateKey(privateKey, keyFormat, alg)

  let signatureBuffer
  if (alg.startsWith('ES')) {
    const derSig = await crypto.subtle.sign({ name: 'ECDSA', hash: { name: getHashForAlg(alg) } }, key, data)
    signatureBuffer = derToRawSignature(derSig, alg)
  } else if (alg.startsWith('PS')) {
    const hash = getHashForAlg(alg)
    const saltLength = hash === 'SHA-256' ? 32 : hash === 'SHA-384' ? 48 : 64
    signatureBuffer = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength }, key, data)
  } else {
    signatureBuffer = await crypto.subtle.sign(getRsaParams(alg), key, data)
  }

  const signature = base64UrlEncodeBytes(signatureBuffer)
  return { token: `${encodedHeader}.${encodedPayload}.${signature}`, signature }
}

const verifyHmac = async (token, secret, alg = 'HS256') => {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT format')
  const [headerPart, payloadPart, signaturePart] = parts
  const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: getHashForAlg(alg) },
    false,
    ['sign']
  )
  const expected = base64UrlEncodeBytes(await crypto.subtle.sign('HMAC', key, data))
  return expected === signaturePart
}

const verifyAsymmetric = async (token, publicKey, keyFormat, alg) => {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT format')
  const [headerPart, payloadPart, signaturePart] = parts
  const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  const key = await importPublicKey(publicKey, keyFormat, alg)

  if (alg.startsWith('ES')) {
    const rawSig = base64UrlToUint8(signaturePart)
    const derSig = rawSig[0] === 0x30 ? rawSig : rawSignatureToDer(rawSig, alg)
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: { name: getHashForAlg(alg) } }, key, derSig, data)
    if (ok) return true
    // Some environments may expect raw (r||s); try raw as fallback
    if (rawSig[0] !== 0x30) {
      return crypto.subtle.verify({ name: 'ECDSA', hash: { name: getHashForAlg(alg) } }, key, rawSig, data)
    }
    return false
  }

  const sigBytes = base64UrlToUint8(signaturePart)
  if (alg.startsWith('PS')) {
    const hash = getHashForAlg(alg)
    const saltLength = hash === 'SHA-256' ? 32 : hash === 'SHA-384' ? 48 : 64
    return crypto.subtle.verify({ name: 'RSA-PSS', saltLength }, key, sigBytes, data)
  }

  return crypto.subtle.verify(getRsaParams(alg), key, sigBytes, data)
}

const CLAIM_DETAILS = {
  iss: { description: 'The issuer that created and signed the JWT.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-4.1.1' },
  sub: { description: 'The principal that is the subject of the JWT.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2' },
  aud: { description: 'The recipients for which the JWT is intended.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-4.1.3' },
  exp: { description: 'The expiration time on or after which the JWT must not be accepted.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4', numericDate: true },
  nbf: { description: 'The time before which the JWT must not be accepted for processing.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-4.1.5', numericDate: true },
  iat: { description: 'The time at which the JWT was issued.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-4.1.6', numericDate: true },
  jti: { description: 'A unique identifier for the JWT, commonly used for replay prevention.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7' },
  typ: { description: 'The media type of the complete JWT.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-5.1' },
  cty: { description: 'The content type of the JWT payload, especially for nested JWTs.', href: 'https://www.rfc-editor.org/rfc/rfc7519#section-5.2' },
  alg: { description: 'The cryptographic algorithm used to secure the JWT.', href: 'https://www.rfc-editor.org/rfc/rfc7515#section-4.1.1' },
  kid: { description: 'A hint identifying the key used to secure the JWT.', href: 'https://www.rfc-editor.org/rfc/rfc7515#section-4.1.4' },
  nonce: { description: 'A value used to associate the token with a client session and mitigate replay.', href: 'https://openid.net/specs/openid-connect-core-1_0.html#IDToken' },
  auth_time: { description: 'The time at which the user authentication occurred.', href: 'https://openid.net/specs/openid-connect-core-1_0.html#IDToken', numericDate: true },
  azp: { description: 'The authorized party to which the token was issued.', href: 'https://openid.net/specs/openid-connect-core-1_0.html#IDToken' },
  scope: { description: 'The permissions or access scopes granted by the token.', href: 'https://www.rfc-editor.org/rfc/rfc8693#section-4.2' },
  sid: { description: 'An identifier for the authenticated user session.', href: 'https://openid.net/specs/openid-connect-backchannel-1_0.html#Backchannel' },
}

const NUMERIC_DATE_URL = 'https://www.rfc-editor.org/rfc/rfc7519#section-2'

function DecodedSection({ title, subtitle, data, onEdit, editable = true }) {
  const [activeTab, setActiveTab] = useState('json')
  const [editedData, setEditedData] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showClaimDetails, setShowClaimDetails] = useState(true)
  const [isValidJSON, setIsValidJSON] = useState(true)
  const debounceTimerRef = useRef(null)

  useLayoutEffect(() => {
    setEditedData(data ? JSON.stringify(data, null, 2) : '')
    setIsValidJSON(true)
  }, [data])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isExpanded) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsExpanded(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isExpanded])

  // Debounced JSON validation - only for visual feedback, doesn't update parent
  const debouncedValidation = useCallback((value) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      try {
        JSON.parse(value)
        setIsValidJSON(true)
      } catch (e) {
        setIsValidJSON(false)
      }
    }, 300) // Shorter delay for just validation
  }, [])

  const handleJSONChange = (e) => {
    const value = e.target.value
    setEditedData(value)
    
    // Immediate visual validation (try to parse, but don't show errors immediately for better UX)
    try {
      JSON.parse(value)
      setIsValidJSON(true)
    } catch (e) {
      // Don't immediately mark as invalid - wait for debounced validation
      // This prevents "Invalid JSON" flashing while user is typing
    }
    
    // Debounced validation for showing errors
    debouncedValidation(value)
  }

  // Handle blur event - ONLY place where we update the parent component
  const handleJSONBlur = () => {
    // Clear any pending validation timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Only update parent if JSON is valid and there are actual edits
    if (onEdit && editedData.trim()) {
      try {
        const parsed = JSON.parse(editedData)
        if (JSON.stringify(parsed) !== JSON.stringify(data)) {
          onEdit(parsed)
        }
        setIsValidJSON(true)
      } catch (e) {
        setIsValidJSON(false)
        // Don't update parent with invalid JSON
      }
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedData).then(() => {
      setCopyStatus('Copied!')
      setTimeout(() => setCopyStatus(''), 2000)
    })
  }

  const renderClaimsTable = () => {
    if (!data || typeof data !== 'object') return null

    const timestampFields = ['iat', 'exp', 'nbf', 'eat', 'auth_time', 'updated_at', 'created_at', 'refresh_token_expires_at']

    const renderClaimValue = (key, value) => {
      if (timestampFields.includes(key) && Number.isFinite(Number(value))) {
        return (
          <span className="claims-value-timestamp">
            <span>{String(value)}</span>
            <time dateTime={new Date(Number(value) * 1000).toISOString()}>{new Date(Number(value) * 1000).toString()}</time>
          </span>
        )
      }
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
    }

    return (
      <div className="claims-breakdown-wrap">
        <table className={`claims-breakdown-table ${showClaimDetails ? 'claims-details-visible' : ''}`}>
          <tbody>
            {Object.entries(data).map(([key, value]) => {
              const details = CLAIM_DETAILS[key]
              return (
                <Fragment key={key}>
                  <tr>
                    <th scope="row">{key}</th>
                    <td><code>{renderClaimValue(key, value)}</code></td>
                    {showClaimDetails && (
                      <td className="claims-description">
                        {details ? <>{details.description} <a href={details.href} target="_blank" rel="noopener noreferrer">Learn more</a></> : <span>Custom or application-specific claim.</span>}
                      </td>
                    )}
                  </tr>
                  {details?.numericDate && (
                    <tr className="claims-guidance-row">
                      <td colSpan={showClaimDetails ? 3 : 2}>
                        This value must be a <a href={NUMERIC_DATE_URL} target="_blank" rel="noopener noreferrer">NumericDate</a>, representing seconds since the Unix epoch.
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <>
    {isExpanded && (
      <button
        type="button"
        className="workspace-expanded-backdrop"
        onClick={() => setIsExpanded(false)}
        aria-label={`Close expanded ${title.toLowerCase()}`}
      />
    )}
    <div
      className={isExpanded ? 'workspace-expanded' : ''}
      role={isExpanded ? 'dialog' : undefined}
      aria-modal={isExpanded ? 'true' : undefined}
      aria-label={isExpanded ? title : undefined}
    >
      <div className="workspace-section-head">
        <div className="flex w-full items-center justify-between">
          <div>
            <h3>
              {title}
            </h3>
            {subtitle && (
              <p>
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="workspace-panel overflow-hidden">
      <div className="workspace-panel-tabs flex items-center justify-between gap-3 px-3 py-2 border-b border-white/5">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('json')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'json'
                ? 'workspace-tab-active'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'claims'
                ? 'workspace-tab-active'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            CLAIMS BREAKDOWN
          </button>
        </div>
          <div className="flex items-center space-x-2">
            {activeTab === 'claims' && (
              <button
                type="button"
                onClick={() => setShowClaimDetails((visible) => !visible)}
                className="workspace-icon-button"
                title={showClaimDetails ? 'Hide claim descriptions' : 'Show claim descriptions'}
                aria-label={showClaimDetails ? 'Hide claim descriptions' : 'Show claim descriptions'}
                aria-pressed={showClaimDetails}
              >
                {showClaimDetails ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m3 3 18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.1 2.7M6.3 6.3C3.9 8 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                )}
              </button>
            )}
            <button
              onClick={copyToClipboard}
              className={`p-1.5 transition-colors ${copyStatus ? 'text-green-500' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
              title={copyStatus ? 'Copied' : 'Copy'}
              aria-label={copyStatus ? 'Copied' : `Copy ${title.toLowerCase()}`}
              aria-live="polite"
            >
              {copyStatus ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12.5l4.2 4.2L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
              aria-label={isExpanded ? `Collapse ${title.toLowerCase()}` : `Expand ${title.toLowerCase()}`}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4m0 5H4m11 0V4m0 5h5M9 15v5m0-5H4m11 0v5m0-5h5" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              )}
            </button>
          </div>
      </div>

      {/* Content */}
      <div className="workspace-panel-body p-4">
        {activeTab === 'json' ? (
          <div className="relative">
            <JSONWithTimestampTooltips
              data={data}
              editedData={editedData}
              onChange={handleJSONChange}
              onBlur={handleJSONBlur}
              readOnly={!editable}
            />
            {/* JSON Validation Status */}
            {!isValidJSON && editedData && (
              <div className="absolute top-2 right-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1 text-xs text-red-600 dark:text-red-400">
                Invalid JSON
              </div>
            )}
            {isValidJSON && editedData && (
              <div className="absolute top-2 right-8 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-2 py-1 text-xs text-green-600 dark:text-green-400">
                Valid JSON
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[8rem]">
            {renderClaimsTable()}
          </div>
        )}
      </div>
    </div>
    </div>
    </>
  )
}

function DecodedSections({ token, setToken }) {
  const [header, setHeader] = useState(null)
  const [payload, setPayload] = useState(null)
  const [signature, setSignature] = useState('')
  const [algorithm, setAlgorithm] = useState('HS256')
  const [secret, setSecret] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [privateKeyFormat, setPrivateKeyFormat] = useState('PKCS8')
  const [publicKeyFormat, setPublicKeyFormat] = useState('PEM')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [encodedToken, setEncodedToken] = useState('')
  const [isInternalUpdate, setIsInternalUpdate] = useState(false)
  const [hasBeenModified, setHasBeenModified] = useState(false)
  const [isAutoSigning, setIsAutoSigning] = useState(false)
  const [showModifiedWarning, setShowModifiedWarning] = useState(false)
  const skipAutoEncodeRef = useRef(false)

  const isHmacAlg = algorithm && algorithm.startsWith('HS')
  const isAsymmetricAlg = algorithm && (algorithm.startsWith('RS') || algorithm.startsWith('ES') || algorithm.startsWith('PS'))

  // Decode token whenever it changes (from external input only)
  useEffect(() => {
    if (!token) {
      resetFields()
      setIsInternalUpdate(false)
      return
    }

    if (!isInternalUpdate) {
      skipAutoEncodeRef.current = true
      decodeToken()
    }
    setIsInternalUpdate(false) // Reset flag
  }, [token])

  useEffect(() => {
    if (header && header.alg) {
      setAlgorithm(header.alg)
    }
  }, [header])

  // Auto-encode when header or payload changes (from editing)
  useEffect(() => {
    if (skipAutoEncodeRef.current) {
      skipAutoEncodeRef.current = false
      return
    }
    if (hasBeenModified && header && payload && setToken) {
      autoEncodeToken()
    }
  }, [header, payload, algorithm, hasBeenModified])

  // Auto-sign token when secret changes (if we have content and a valid secret)
  useEffect(() => {
    if (isHmacAlg && secret && secret.trim() && header && payload && hasBeenModified) {
      autoSignToken()
    } else if (algorithm === 'none' && hasBeenModified && header && payload) {
      // Special case: 'none' algorithm should create unsigned token
      const base64UrlEncode = (obj) => {
        return btoa(JSON.stringify(obj))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '')
      }
      const headerObj = { ...header, alg: 'none' }
      const encodedHeader = base64UrlEncode(headerObj)
      const encodedPayload = base64UrlEncode(payload)
      const unsignedToken = `${encodedHeader}.${encodedPayload}.`
      
      updateTokenInternal(unsignedToken)
      setSignature('')
      setHasBeenModified(false)
    }
    // Note: We preserve the original signature for display when secret is cleared
    // Only the 'none' algorithm explicitly creates unsigned tokens
  }, [secret, header, payload, hasBeenModified, algorithm, isHmacAlg])

  const updateTokenInternal = (nextToken) => {
    if (!setToken) return false
    if (nextToken === token) {
      setIsInternalUpdate(false)
      return false
    }
    setIsInternalUpdate(true)
    setToken(nextToken)
    return true
  }

  const autoEncodeToken = () => {
    try {
      const headerObj = { ...header, alg: algorithm }

      // Client-side Base64URL encoding
      const base64UrlEncode = (obj) => {
        return btoa(JSON.stringify(obj))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '')
      }

      const encodedHeader = base64UrlEncode(headerObj)
      const encodedPayload = base64UrlEncode(payload)

      // For live editing, keep the old signature initially
      // It will be replaced automatically when user enters a secret
      const newToken = `${encodedHeader}.${encodedPayload}.${signature || ''}`
      const didUpdate = updateTokenInternal(newToken)
      if (!didUpdate) {
        setHasBeenModified(false)
        return
      }

      // Mark that content was modified (for visual feedback)
      setHasBeenModified(true)
      setVerificationResult(null) // Clear any previous verification results
    } catch (error) {
      console.error('Error auto-encoding token:', error)
    }
  }

  // Auto-sign token when user enters a secret
  const autoSignToken = async () => {
    if (!isHmacAlg) return
    try {
      setIsAutoSigning(true)
      const headerObj = { ...header, alg: algorithm }

      if (secret.trim()) {
        const { token: signedToken, signature: newSignature } = await signHmac(headerObj, payload, secret, algorithm)
        setSignature(newSignature)
        updateTokenInternal(signedToken)
        setHasBeenModified(false)
      }
    } catch (error) {
      console.error('Error auto-signing token:', error)
    } finally {
      setIsAutoSigning(false)
    }
  }

  const resetFields = () => {
    setHeader(null)
    setPayload(null)
    setSignature('')
    setVerificationResult(null)
    setEncodedToken('')
    setHasBeenModified(false)
    setIsAutoSigning(false)
    setSecret('')
    setPublicKey('')
    setPrivateKey('')
  }

  const decodeToken = () => {
    const parts = token.split('.')
    const [rawHeader, rawPayload, rawSignature] =
      parts.length === 1
        ? [null, parts[0], null]
        : parts.length === 2
          ? [parts[0], parts[1], null]
          : [parts[0], parts[1], parts[2]]

    const safeDecodePart = (segment) => {
      if (!segment) return null
      try {
        return JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')))
      } catch (error) {
        return null
      }
    }

    const decodedHeader = safeDecodePart(rawHeader)
    const decodedPayload = safeDecodePart(rawPayload)

    setHeader(decodedHeader)
    setPayload(decodedPayload)
    setSignature(rawSignature || '')
    setAlgorithm((decodedHeader && decodedHeader.alg) || 'HS256')
    setHasBeenModified(false) // Reset modified flag when decoding fresh token
  }

  const encodeToken = async () => {
    try {
      const headerObj = { ...header, alg: algorithm }

      // Client-side Base64URL encoding
      const encodedHeader = base64UrlEncode(JSON.stringify(headerObj))
      const encodedPayload = base64UrlEncode(JSON.stringify(payload))

      if (algorithm.startsWith('HS') && secret.trim()) {
        const { token: signedToken, signature: sig } = await signHmac(headerObj, payload, secret, algorithm)
        setEncodedToken(signedToken)
        setHasBeenModified(false)
        setSignature(sig)
      } else if (isAsymmetricAlg && privateKey.trim()) {
        const { token: signedToken, signature: sig } = await signAsymmetric(headerObj, payload, privateKey, privateKeyFormat, algorithm)
        setEncodedToken(signedToken)
        setHasBeenModified(false)
        setSignature(sig)
      } else if (algorithm === 'none') {
        const unsignedToken = `${encodedHeader}.${encodedPayload}.`
        setEncodedToken(unsignedToken)
        setHasBeenModified(false)
        setSignature('')
      } else {
        const unsignedToken = `${encodedHeader}.${encodedPayload}.`
        setEncodedToken(unsignedToken)
        setHasBeenModified(false)
        setSignature('')
      }
    } catch (error) {
      console.error('Error encoding token:', error)
    }
  }

  const handleHeaderEdit = (newHeader) => {
    setHasBeenModified(true)
    setHeader(newHeader)
    if (newHeader && newHeader.alg) {
      setAlgorithm(newHeader.alg)
    }
  }

  const handlePayloadEdit = (newPayload) => {
    setHasBeenModified(true)
    setPayload(newPayload)
  }

  const handleAlgorithmChange = () => {
    // algorithm now follows header.alg; this handler is retained to avoid breaking props but does nothing
  }

  const verifyToken = async () => {
    if (!isHmacAlg && !isAsymmetricAlg) {
      setVerificationResult({
        valid: false,
        error: 'Select an HMAC algorithm (HS*) to verify with a shared secret.'
      })
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      if (isHmacAlg) {
        if (!secret.trim()) {
          alert('Please enter a secret key')
          setIsVerifying(false)
          return
        }
        const valid = await verifyHmac(token, secret, algorithm)
        setVerificationResult({ valid })
      } else if (isAsymmetricAlg) {
        if (!publicKey.trim()) {
          alert('Please paste a public key')
          setIsVerifying(false)
          return
        }
        const valid = await verifyAsymmetric(token, publicKey, publicKeyFormat, algorithm)
        setVerificationResult({ valid })
      }
    } catch (error) {
      console.error('Error verifying token:', error)
      setVerificationResult({ valid: false, error: error.message })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <DecodedSection
        title="DECODED HEADER"
        subtitle="ALGORITHM & TOKEN TYPE"
        data={header}
        onEdit={handleHeaderEdit}
      />

      {/* Payload Section */}
      <DecodedSection
        title="DECODED PAYLOAD"
        subtitle="DATA"
        data={payload}
        onEdit={handlePayloadEdit}
      />

      {/* Verify Signature Section */}
      <div className="workspace-panel overflow-hidden">
        <div className="workspace-panel-heading px-6 py-3 border-b border-white/5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            JWT SIGNATURE VERIFICATION
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            (OPTIONAL)
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Token Modified Warning */}
          {hasBeenModified && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <button
                type="button"
                onClick={() => setShowModifiedWarning((open) => !open)}
                className="w-full flex items-start justify-between text-left"
                aria-expanded={showModifiedWarning}
              >
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Token Modified - Signature May Be Invalid
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      {showModifiedWarning ? 'Click to collapse' : 'Click to expand'}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-amber-700 dark:text-amber-300 mt-1 transform transition-transform ${showModifiedWarning ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showModifiedWarning && (
                <div className="mt-2 text-sm text-amber-700 dark:text-amber-300 pl-8">
                  <p>You've edited this JWT. The current signature may not match the new content.</p>
                  {isHmacAlg ? (
                    <p className="mt-1">
                      <strong>Enter your secret below</strong> to automatically re-sign with the new content!
                    </p>
                  ) : (
                    <p className="mt-1">
                      <strong>Asymmetric tokens (RS*/ES*/PS*)</strong> can't be auto-signed here; provide a public key for manual verification.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Key / Secret Input */}
          {isHmacAlg ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter the secret used to sign the JWT:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="your-256-bit-secret"
                  className="w-full px-4 py-2 pr-10 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {/* Auto-signing status indicator */}
                {isAutoSigning && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {!hasBeenModified && secret && !isAutoSigning && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Auto-signing feedback */}
              {isAutoSigning && (
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center">
                  <span className="mr-1">🔄</span> Auto-signing token with your secret...
                </p>
              )}
              {!hasBeenModified && secret && !isAutoSigning && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
                  <span className="mr-1">✅</span> Token automatically signed! Ready to verify.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter the public key used to verify the JWT:
              </label>
              <textarea
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq...\n-----END PUBLIC KEY-----"
                className="w-full min-h-[120px] px-4 py-2 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              />
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-600 dark:text-gray-400">Public key format</label>
                <select
                  value={publicKeyFormat}
                  onChange={(e) => setPublicKeyFormat(e.target.value)}
                  className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs"
                >
                  <option value="PEM">PEM</option>
                  <option value="PKCS1">PKCS #1</option>
                  <option value="PKCS8">PKCS #8</option>
                  <option value="JWK">JWK</option>
                  <option value="X509">X.509</option>
                </select>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Asymmetric verification runs in the browser. Supported: RS*/PS* (RSA) and ES* (ECDSA) with PEM or JWK public keys.
              </p>
            </div>
          )}

          {/* Private Key Input for Signing */}
          {isAsymmetricAlg && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Private key for signing (optional, for token generation)
              </label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----"
                className="w-full min-h-[120px] px-4 py-2 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
              />
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-600 dark:text-gray-400">Private key format</label>
                <select
                  value={privateKeyFormat}
                  onChange={(e) => setPrivateKeyFormat(e.target.value)}
                  className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs"
                >
                  <option value="PKCS1">PKCS #1 (PEM)</option>
                  <option value="PKCS8">PKCS #8 (PEM)</option>
                  <option value="JWK">JWK</option>
                </select>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Signing happens locally. Provide a private key to generate a signed RS*/PS*/ES* token.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={verifyToken}
              disabled={
                !token ||
                isVerifying ||
                (isHmacAlg ? !secret : isAsymmetricAlg ? !publicKey : true)
              }
              className="accent-button px-4 py-2 disabled:bg-gray-400 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed text-sm"
            >
              {isVerifying ? 'Verifying...' : 'Verify Signature'}
            </button>
            <button
              onClick={encodeToken}
              disabled={!header || !payload}
              className="accent-button px-4 py-2 disabled:bg-gray-400 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed text-sm"
            >
              Generate Token
            </button>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <div className={`p-3 rounded-lg border text-sm ${
              verificationResult.valid
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              <div className="flex items-center space-x-2">
                {verificationResult.valid ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">
                  {verificationResult.valid ? 'Signature Verified!' : 'Invalid Signature'}
                </span>
              </div>
              {verificationResult.error && (
                <p className="mt-1 text-xs">{verificationResult.error}</p>
              )}
            </div>
          )}

          {/* Generated Token */}
          {encodedToken && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Generated Token
              </label>
              <div className="relative">
                <textarea
                  value={encodedToken}
                  readOnly
                  className="w-full h-20 p-3 font-mono text-sm bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg resize-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(encodedToken)}
                  className="absolute top-2 right-2 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export {
  signHmac,
  verifyHmac,
  signAsymmetric,
  verifyAsymmetric,
  importPublicKey,
  importPrivateKey,
  pkcs1ToPkcs8
}

export default DecodedSections
