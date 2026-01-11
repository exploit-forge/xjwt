import { useState, useEffect, useCallback, useRef } from 'react'
import TimestampCell from './TimestampCell'
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

function DecodedSection({ title, subtitle, data, colorClass, onEdit, editable = true }) {
  const [activeTab, setActiveTab] = useState('json')
  const [editedData, setEditedData] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [isValidJSON, setIsValidJSON] = useState(true)
  const debounceTimerRef = useRef(null)

  useEffect(() => {
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
        onEdit(parsed)
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

    // Define timestamp fields that should use TimestampCell
    const timestampFields = ['iat', 'exp', 'nbf', 'eat', 'auth_time', 'updated_at', 'created_at', 'refresh_token_expires_at']

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(data).map(([key, value]) => (
              <tr key={key} className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-2 pr-4 font-mono text-purple-600 dark:text-purple-400">{key}</td>
                <td className="py-2">
                  {timestampFields.includes(key) ? (
                    <TimestampCell value={value} fieldName={key} />
                  ) : (
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-3 border-b border-gray-200 dark:border-gray-700 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Copy"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Expand"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex mt-3 -mb-px">
          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'json' 
                ? 'text-gray-900 dark:text-white border-gray-900 dark:border-white' 
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'claims' 
                ? 'text-gray-900 dark:text-white border-gray-900 dark:border-white' 
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            CLAIMS TABLE
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900">
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
        {copyStatus && (
          <div className="absolute top-2 right-2 text-xs text-green-600 dark:text-green-400">
            {copyStatus}
          </div>
        )}
      </div>
    </div>
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
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showModifiedWarning, setShowModifiedWarning] = useState(false)

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
    if (header && payload && setToken) {
      autoEncodeToken()
    }
  }, [header, payload, algorithm])

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
      
      setIsInternalUpdate(true)
      setToken(unsignedToken)
      setSignature('')
      setHasBeenModified(false)
    }
    // Note: We preserve the original signature for display when secret is cleared
    // Only the 'none' algorithm explicitly creates unsigned tokens
  }, [secret, header, payload, hasBeenModified, algorithm, isHmacAlg])

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
      
      // Mark that content was modified (for visual feedback)
      setHasBeenModified(true)
      setVerificationResult(null) // Clear any previous verification results
      
      // Mark as internal update to prevent decode loop
      setIsInternalUpdate(true)
      // Update the main token state to reflect changes in real-time
      setToken(newToken)
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
        setIsInternalUpdate(true)
        setToken(signedToken)
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
    setHeader(newHeader)
    if (newHeader && newHeader.alg) {
      setAlgorithm(newHeader.alg)
    }
  }

  const handlePayloadEdit = (newPayload) => {
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
        colorClass="bg-gray-50 dark:bg-gray-700"
        onEdit={handleHeaderEdit}
      />

      {/* Payload Section */}
      <DecodedSection
        title="DECODED PAYLOAD"
        subtitle="DATA"
        data={payload}
        colorClass="bg-gray-50 dark:bg-gray-700"
        onEdit={handlePayloadEdit}
      />

      {/* Verify Signature Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed text-sm"
            >
              {isVerifying ? 'Verifying...' : 'Verify Signature'}
            </button>
            <button
              onClick={encodeToken}
              disabled={!header || !payload}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed text-sm"
            >
              Generate Token
            </button>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <button
              type="button"
              onClick={() => setShowPrivacy((v) => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-blue-800 dark:text-blue-200"
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Privacy Protected & Real-time Auto-Signing</span>
              </span>
              <svg className={`w-4 h-4 transform transition-transform ${showPrivacy ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showPrivacy && (
              <div className="px-3 pb-3 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>• JWT decoding happens in your browser - tokens never leave your device</p>
                <p>• <strong>Auto-signing</strong>: When you enter a secret, the token is automatically re-signed</p>
                <p>• <strong>Live editing</strong>: Changes to header/payload automatically update the encoded token</p>
                <p>• Asymmetric signing and verification run locally with your provided keys</p>
              </div>
            )}
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
