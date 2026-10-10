import { useState, useEffect, useRef } from 'react'
import { SecurityGauge } from './SecurityGauge'
import { RiskGauge } from './RiskGauge'
import { ScanResults } from './ScanResults'
import { ScannerInput } from './ScannerInput'

const API_BASE = import.meta.env.VITE_BACKEND_URL || '/api'

const ScannerPage = ({ token: initialToken = '', setToken: setAppToken }) => {
  const [scanToken, setScanToken] = useState(initialToken)
  const [scanResults, setScanResults] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const gaugesRef = useRef(null)

  // Update local token when prop changes
  useEffect(() => {
    setScanToken(initialToken)
  }, [initialToken])

  useEffect(() => {
    if (!scanResults || scanResults.error || !gaugesRef.current) return undefined
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scrollTimer = window.setTimeout(() => {
      gaugesRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(scrollTimer)
  }, [scanResults])

  const attemptSecretCrack = async (token) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Secret cracking timeout'))
      }, 10000) // 10 second timeout for quick scan

      fetch(`${API_BASE}/crack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.body.getReader()
      })
      .then(reader => {
        const decoder = new TextDecoder()
        
        const processStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              clearTimeout(timeout)
              resolve(null) // No secret found
              return
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)

                if (data.startsWith('RESULT ')) {
                  clearTimeout(timeout)
                  const result = JSON.parse(data.replace('RESULT ', ''))
                  resolve(result)
                  return
                } else if (data === 'DONE') {
                  clearTimeout(timeout)
                  resolve(null)
                  return
                } else if (data.startsWith('ERROR ')) {
                  clearTimeout(timeout)
                  reject(new Error(data.replace('ERROR ', '')))
                  return
                }
              }
            }

            processStream() // Continue reading
          }).catch(error => {
            clearTimeout(timeout)
            reject(error)
          })
        }

        processStream()
      })
      .catch(error => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  const decodeJWT = (token) => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format')
      }

      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      
      return { header, payload, signature: parts[2] }
    } catch (error) {
      throw new Error('Failed to decode JWT: ' + error.message)
    }
  }

  const analyzeJWT = async (decoded, token) => {
    const issues = []
    let securityScore = 100
    let riskScore = 0
    let crackedSecret = null

    // Header checks
    const algValue = decoded.header.alg
    const alg = typeof algValue === 'string' ? algValue.toLowerCase() : ''
    const addIssue = (severity, category, issue, recommendation, impact, scorePenalty = 0, riskIncrease = 0) => {
      issues.push({ severity, category, issue, recommendation, impact })
      securityScore -= scorePenalty
      riskScore += riskIncrease
    }

    if (!alg) {
      addIssue(
        'Critical', 'Algorithm', 'Missing or invalid alg header',
        'Reject tokens without an explicit, allowlisted signing algorithm.',
        'A verifier may apply an unsafe default or fail to enforce signature validation.', 45, 55
      )
    }

    if (decoded.header.typ !== undefined && typeof decoded.header.typ !== 'string') {
      addIssue('Low', 'Header', 'Invalid typ header type', 'Use a string typ value such as "JWT", or omit it.', 'Non-standard header types can cause inconsistent processing.', 5, 5)
    } else if (typeof decoded.header.typ === 'string' && decoded.header.typ.toUpperCase() !== 'JWT') {
      addIssue('Low', 'Header', `Unexpected token type: ${decoded.header.typ}`, 'Confirm the application expects this media type before accepting the token.', 'The token may be routed to a validator that assumes a different format.', 5, 5)
    }

    const remoteKeyHeaders = ['jku', 'x5u'].filter((name) => decoded.header[name] !== undefined)
    if (remoteKeyHeaders.length) {
      addIssue(
        'High', 'Key Selection', `Remote key reference present: ${remoteKeyHeaders.join(', ')}`,
        'Do not fetch key URLs directly from tokens. Resolve keys through a strict issuer-to-key allowlist with SSRF protections.',
        'An attacker-controlled key URL can enable SSRF or substitution of the verification key.', 25, 35
      )
    }

    if (decoded.header.jwk !== undefined) {
      addIssue('High', 'Key Selection', 'Token embeds a JWK verification key', 'Ignore token-supplied keys unless the protocol explicitly requires them and their trust is independently established.', 'Trusting an embedded key can let an attacker choose the key used to verify their token.', 25, 35)
    }

    if (decoded.header.kid !== undefined) {
      if (typeof decoded.header.kid !== 'string') {
        addIssue('Medium', 'Key Selection', 'Invalid kid header type', 'Require kid to be a bounded string and match it against known key identifiers.', 'Unexpected key identifier types can trigger inconsistent lookup behavior.', 10, 15)
      } else if (/\.\.|[/\\]|https?:|['"`;]|\$\(/i.test(decoded.header.kid) || decoded.header.kid.includes(String.fromCharCode(0))) {
        addIssue('High', 'Key Selection', 'Suspicious characters in kid header', 'Use kid only as an exact lookup key from a fixed allowlist; never concatenate it into paths, URLs, SQL, or shell commands.', 'Unsafe kid handling can lead to path traversal, injection, or attacker-selected verification keys.', 25, 35)
      }
    }

    if (decoded.header.crit !== undefined) {
      if (!Array.isArray(decoded.header.crit) || decoded.header.crit.some((item) => typeof item !== 'string')) {
        addIssue('High', 'Header', 'Malformed crit header', 'Require crit to be an array of understood extension-header names and reject all unsupported entries.', 'Malformed critical-header handling can create validation differences between services.', 20, 25)
      } else if (decoded.header.crit.length > 0) {
        addIssue('Medium', 'Header', `Critical extensions require explicit support: ${decoded.header.crit.join(', ')}`, 'Reject the token unless every listed critical extension is explicitly implemented by the verifier.', 'Ignoring a critical extension changes the intended token-processing rules.', 10, 15)
      }
    }

    if (decoded.header.b64 === false) {
      addIssue('High', 'Header', 'Unencoded payload option enabled (b64=false)', 'Accept RFC 7797 tokens only in a deliberately configured code path with crit including "b64".', 'General-purpose JWT parsers may interpret an unencoded payload differently, enabling validation bypasses.', 20, 30)
    }

    if (alg && alg !== 'none' && !decoded.signature) {
      addIssue('Critical', 'Signature', 'Signature is missing', 'Reject tokens that declare a signing algorithm but do not contain a signature.', 'An unsigned token may be accepted if signature enforcement is inconsistent.', 50, 60)
    }

    if (token.length > 8192) {
      addIssue('Medium', 'Token Size', `Oversized JWT (${token.length.toLocaleString()} characters)`, 'Set a conservative token-size limit at the gateway and application boundary.', 'Very large tokens can increase parsing cost, exceed header limits, and cause availability issues.', 10, 15)
    }
    
    if (alg === 'none') {
      issues.push({
        severity: 'Critical',
        category: 'Algorithm',
        issue: 'No signature algorithm (alg=none)',
        recommendation: 'Implement proper signing with RSA, ECDSA, or HMAC algorithms',
        impact: 'Tokens can be forged without detection'
      })
      securityScore -= 50
      riskScore += 60
    } else if (alg?.startsWith('hs')) {
      issues.push({
        severity: 'Medium',
        category: 'Algorithm',
        issue: 'HMAC signing requires shared secret management',
        recommendation: 'Consider RS256/ES256 for distributed systems or ensure robust secret management across all services',
        impact: 'Shared secret must be securely distributed and rotated across all parties'
      })
      securityScore -= 20
      riskScore += 25

      // Try to crack the HMAC secret
      try {
        crackedSecret = await attemptSecretCrack(token)
        if (crackedSecret) {
          issues.unshift({
            severity: 'Critical',
            category: 'Secret Strength',
            issue: `Weak HMAC secret cracked: "${crackedSecret.secret}"`,
            recommendation: 'Use a strong, randomly generated secret (minimum 256 bits). Rotate immediately.',
            impact: 'Anyone can forge tokens with this secret',
            crackedSecret: crackedSecret
          })
          securityScore -= 50 // Major penalty for crackable secret
          riskScore += 75
        }
      } catch (error) {
        console.log('Secret cracking failed:', error.message)
        // No additional issue needed - the HMAC warning above covers it
      }
    } else if (alg?.startsWith('rs') || alg?.startsWith('es') || alg?.startsWith('ps')) {
      // This is good - asymmetric signing
      securityScore += 0 // No penalty
    } else if (alg) {
      issues.push({
        severity: 'Medium',
        category: 'Algorithm',
        issue: `Unknown or uncommon algorithm: ${alg}`,
        recommendation: 'Use standard algorithms like RS256, ES256, or HS256',
        impact: 'May have unknown security vulnerabilities'
      })
      securityScore -= 15
      riskScore += 20
    }

    // Payload checks
    const payloadValue = decoded.payload
    const payloadIsObject = payloadValue && typeof payloadValue === 'object' && !Array.isArray(payloadValue)
    const payload = payloadIsObject ? payloadValue : {}

    if (!payloadIsObject) {
      addIssue('Critical', 'Payload', 'JWT payload is not a JSON object', 'Reject JWT claims sets that are not JSON objects.', 'Validators may interpret non-object payloads inconsistently.', 40, 50)
    }

    const numericDateClaims = ['iat', 'exp', 'nbf']
    numericDateClaims.forEach((claim) => {
      if (payload[claim] !== undefined && (typeof payload[claim] !== 'number' || !Number.isFinite(payload[claim]))) {
        addIssue('High', 'Claims', `${claim} must be a finite JSON number`, `Encode ${claim} as a NumericDate number, not a string or other value.`, 'Type coercion differs between JWT libraries and can bypass or break time validation.', 20, 25)
      }
    })

    if (payload.iss !== undefined && typeof payload.iss !== 'string') {
      addIssue('Medium', 'Claims', 'Issuer (iss) must be a string', 'Encode iss as an exact issuer identifier and compare it against configured trusted issuers.', 'Malformed issuer values can produce inconsistent trust decisions.', 10, 15)
    }
    if (payload.sub !== undefined && typeof payload.sub !== 'string') {
      addIssue('Medium', 'Claims', 'Subject (sub) must be a string', 'Encode sub as a stable string identifier.', 'Malformed subject values can cause authorization ambiguity.', 10, 15)
    }
    if (payload.aud !== undefined && !(typeof payload.aud === 'string' || (Array.isArray(payload.aud) && payload.aud.length > 0 && payload.aud.every((item) => typeof item === 'string')))) {
      addIssue('High', 'Claims', 'Audience (aud) has an invalid type', 'Use a string or non-empty array of strings and validate it against the intended recipient.', 'Malformed audience data may be skipped or interpreted differently by validators.', 20, 25)
    }

    // Check for missing essential claims
    if (payload.iat === undefined && payload.nbf === undefined) {
      issues.push({
        severity: 'Medium',
        category: 'Claims',
        issue: 'Missing timestamp validation (iat or nbf)',
        recommendation: 'Add "iat" (issued at) or "nbf" (not before) claim for token freshness validation',
        impact: 'Cannot verify token age or detect replay attacks effectively'
      })
      securityScore -= 15
      riskScore += 20
    }

    // Context-aware expiration check
    if (payload.exp === undefined) {
      const severity = (payload.iat === undefined && payload.nbf === undefined) ? 'Critical' : 'High'
      const scoreReduction = severity === 'Critical' ? 40 : 30
      const riskIncrease = severity === 'Critical' ? 45 : 35
      
      issues.push({
        severity: severity,
        category: 'Claims',
        issue: severity === 'Critical' ? 
          'Missing expiration and timestamp validation - tokens never expire and have no time constraints' :
          'Missing expiration (exp) claim',
        recommendation: 'Add "exp" claim with appropriate expiration time (recommended: 15 minutes to 24 hours depending on use case)',
        impact: severity === 'Critical' ? 
          'Tokens never expire and have no temporal security controls' :
          'Tokens never expire, creating security risk'
      })
      securityScore -= scoreReduction
      riskScore += riskIncrease
    }

    // Enhanced timestamp validation and security checks
    const now = Math.floor(Date.now() / 1000) // Current Unix timestamp

    if (typeof payload.iat === 'number' && payload.iat > now + 300) {
      const minutesAhead = Math.ceil((payload.iat - now) / 60)
      addIssue('Medium', 'Token Status', `Token issued in the future (${minutesAhead} minutes ahead)`, 'Reject tokens issued beyond a small, explicitly configured clock-skew allowance.', 'A future issued-at time may indicate clock problems or a forged claims set.', 15, 20)
    }

    if (typeof payload.iat === 'number' && typeof payload.exp === 'number' && payload.exp <= payload.iat) {
      addIssue('High', 'Token Lifetime', 'Expiration is not later than issued-at time', 'Require exp to be strictly later than iat.', 'The token has an impossible or already-invalid lifetime.', 25, 30)
    }

    if (typeof payload.nbf === 'number' && typeof payload.exp === 'number' && payload.nbf >= payload.exp) {
      addIssue('High', 'Token Lifetime', 'Not-before time is not earlier than expiration', 'Require nbf to be earlier than exp.', 'There is no valid time window in which the token should be accepted.', 25, 30)
    }
    
    // Check if token is expired
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp) && payload.exp < now) {
      const expiredMinutes = Math.floor((now - payload.exp) / 60)
      const expiredHours = Math.floor(expiredMinutes / 60)
      const expiredDays = Math.floor(expiredHours / 24)
      
      let timeAgo = ''
      if (expiredDays > 0) {
        timeAgo = `${expiredDays} day${expiredDays !== 1 ? 's' : ''} ago`
      } else if (expiredHours > 0) {
        timeAgo = `${expiredHours} hour${expiredHours !== 1 ? 's' : ''} ago`
      } else {
        timeAgo = `${expiredMinutes} minute${expiredMinutes !== 1 ? 's' : ''} ago`
      }
      
      issues.push({
        severity: 'High',
        category: 'Token Status',
        issue: `Token is expired (expired ${timeAgo})`,
        recommendation: 'This token should not be accepted by any service. Implement proper token expiration checking.',
        impact: 'Expired tokens should be rejected to prevent replay attacks and unauthorized access'
      })
      securityScore -= 30
      riskScore += 40
    }
    
    // Check if token is not yet valid (nbf)
    if (typeof payload.nbf === 'number' && Number.isFinite(payload.nbf) && payload.nbf > now) {
      const notValidMinutes = Math.floor((payload.nbf - now) / 60)
      const notValidHours = Math.floor(notValidMinutes / 60)
      
      let timeUntil = ''
      if (notValidHours > 0) {
        timeUntil = `${notValidHours} hour${notValidHours !== 1 ? 's' : ''}`
      } else {
        timeUntil = `${notValidMinutes} minute${notValidMinutes !== 1 ? 's' : ''}`
      }
      
      issues.push({
        severity: 'Medium',
        category: 'Token Status',
        issue: `Token is not yet valid (valid in ${timeUntil})`,
        recommendation: 'Ensure systems properly validate nbf claim before accepting tokens.',
        impact: 'Premature token use could indicate clock synchronization issues or token misuse'
      })
      securityScore -= 15
      riskScore += 20
    }
    
    // Check token lifetime (if both iat and exp are present)
    if (typeof payload.iat === 'number' && Number.isFinite(payload.iat) && typeof payload.exp === 'number' && Number.isFinite(payload.exp) && payload.exp > payload.iat) {
      const lifetimeSeconds = payload.exp - payload.iat
      const lifetimeMinutes = Math.floor(lifetimeSeconds / 60)
      const lifetimeHours = Math.floor(lifetimeMinutes / 60)
      const lifetimeDays = Math.floor(lifetimeHours / 24)
      
      // Check for extremely long lifetime (> 30 days)
      if (lifetimeSeconds > (30 * 24 * 60 * 60)) {
        issues.push({
          severity: 'High',
          category: 'Token Lifetime',
          issue: `Extremely long token lifetime: ${lifetimeDays} days`,
          recommendation: 'Use shorter token lifetimes (recommended: 15 minutes to 24 hours). Implement token refresh for longer sessions.',
          impact: 'Long-lived tokens increase security risk if compromised and make token rotation difficult'
        })
        securityScore -= 25
        riskScore += 35
      }
      // Check for very long lifetime (> 7 days)
      else if (lifetimeSeconds > (7 * 24 * 60 * 60)) {
        issues.push({
          severity: 'Medium',
          category: 'Token Lifetime',
          issue: `Very long token lifetime: ${lifetimeDays} days`,
          recommendation: 'Consider shorter token lifetimes for better security. Recommended: 1-24 hours for access tokens.',
          impact: 'Long-lived tokens pose higher security risk if compromised'
        })
        securityScore -= 15
        riskScore += 20
      }
      // Check for very short lifetime (< 5 minutes)
      else if (lifetimeSeconds < (5 * 60)) {
        issues.push({
          severity: 'Low',
          category: 'Token Lifetime',
          issue: `Very short token lifetime: ${lifetimeMinutes} minutes`,
          recommendation: 'Ensure token lifetime is sufficient for your use case. Very short lifetimes may cause usability issues.',
          impact: 'May cause frequent authentication prompts and poor user experience'
        })
        securityScore -= 5
        riskScore += 5
      }
    }
    
    // Check if token is expiring soon (within 15 minutes)
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp) && payload.exp > now) {
      const timeToExpiry = payload.exp - now
      if (timeToExpiry < (15 * 60)) { // 15 minutes
        const minutesLeft = Math.floor(timeToExpiry / 60)
        issues.push({
          severity: 'Info',
          category: 'Token Status',
          issue: `Token expires soon (in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''})`,
          recommendation: 'This is informational. Consider implementing token refresh before expiration.',
          impact: 'Token will need renewal soon to maintain access'
        })
      }
    }
    
    // Check for invalid timestamp values
    ['iat', 'exp', 'nbf'].forEach(claim => {
      if (payload[claim] !== undefined) {
        const timestamp = Number(payload[claim])
        // Check if timestamp is reasonable (between year 2000 and 2100)
        if (isNaN(timestamp) || timestamp < 946684800 || timestamp > 4102444800) {
          issues.push({
            severity: 'Medium',
            category: 'Claims',
            issue: `Invalid timestamp in ${claim} claim: ${payload[claim]}`,
            recommendation: `Ensure ${claim} contains a valid Unix timestamp`,
            impact: 'Invalid timestamps prevent proper token validation'
          })
          securityScore -= 15
          riskScore += 20
        }
      }
    })

    // Check for sensitive data in payload
    const sensitiveFields = ['password', 'passwd', 'secret', 'private_key', 'api_key', 'access_token', 'refresh_token', 'authorization', 'cookie', 'session', 'ssn', 'social_security', 'credit_card', 'cc_number', 'cvv', 'pin']
    const piiFields = ['email', 'phone', 'phone_number', 'address', 'date_of_birth', 'dob', 'passport', 'national_id']
    const foundSensitive = []
    const foundPii = []
    
    const checkForSensitive = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key
        const lowerKey = key.toLowerCase()
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          foundSensitive.push(fullPath)
        }
        if (piiFields.some(field => lowerKey === field || lowerKey.includes(`${field}_`))) {
          foundPii.push(fullPath)
        }
        
        if (typeof value === 'object' && value !== null) {
          checkForSensitive(value, fullPath)
        }
      }
    }

    checkForSensitive(payload)

    if (foundSensitive.length > 0) {
      issues.push({
        severity: 'Critical',
        category: 'Data Exposure',
        issue: `Sensitive data found in payload: ${foundSensitive.join(', ')}`,
        recommendation: 'Remove sensitive information from JWT payload. Store in secure server-side session instead',
        impact: 'Sensitive data is exposed and can be read by anyone with the token'
      })
      securityScore -= 40
      riskScore += 50
    }

    if (foundPii.length > 0) {
      addIssue(
        'Medium', 'Privacy', `Personally identifiable data found in payload: ${foundPii.join(', ')}`,
        'Minimize JWT claims and use opaque identifiers where possible. Never assume an encoded payload is confidential.',
        'Anyone who obtains the token can decode and read this personal data.', 15, 20
      )
    }

    if (!payload.jti) {
      addIssue('Low', 'Replay Protection', 'Missing JWT ID (jti) claim', 'Add a unique jti when the application needs revocation, one-time use, or replay detection.', 'The token cannot be individually tracked or denylisted. This may be acceptable for short-lived stateless tokens.', 4, 5)
    } else if (typeof payload.jti !== 'string') {
      addIssue('Medium', 'Claims', 'JWT ID (jti) must be a string', 'Use a high-entropy unique string for jti.', 'A malformed identifier can weaken replay tracking or revocation.', 10, 15)
    }

    // Additional security checks - More realistic severity
    if (!payload.aud) {
      issues.push({
        severity: 'Low',
        category: 'Claims',
        issue: 'Missing audience (aud) claim',
        recommendation: 'Add "aud" claim to specify intended token recipient (recommended for multi-service environments)',
        impact: 'Tokens may be misused by unintended parties in distributed systems'
      })
      securityScore -= 8 // Reduced penalty
      riskScore += 8
    }

    if (!payload.iss) {
      issues.push({
        severity: 'Low',
        category: 'Claims',
        issue: 'Missing issuer (iss) claim',
        recommendation: 'Add "iss" claim to identify token issuer (improves auditability)',
        impact: 'Cannot verify token origin or trace token lifecycle'
      })
      securityScore -= 5
      riskScore += 5
    }

    // Ensure scores are within bounds
    securityScore = Math.max(0, Math.min(100, securityScore))
    riskScore = Math.max(0, Math.min(100, riskScore))

    return {
      securityScore,
      riskScore,
      crackedSecret,
      issues: issues.sort((a, b) => {
        const severityOrder = { 'Critical': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Info': 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
    }
  }

  const handleScan = async () => {
    if (!scanToken.trim()) {
      return
    }

    setIsScanning(true)
    setScanResults(null)
    
    try {
      // Simulate scanning delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const decoded = decodeJWT(scanToken)
      const analysis = await analyzeJWT(decoded, scanToken)
      
      setScanResults({
        ...analysis,
        decoded,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setScanResults({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsScanning(false)
    }
  }

  const generatePDFReport = () => {
    if (!scanResults || scanResults.error) {
      alert('No scan results available to download')
      return
    }

    const { securityScore, riskScore, issues, decoded, timestamp, crackedSecret } = scanResults
    
    // Create PDF content as HTML string
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JWT Security Scan Report</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2563eb; 
            margin-bottom: 10px;
        }
        .scan-date { 
            color: #666; 
            font-size: 14px;
        }
        .scores {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            gap: 20px;
        }
        .score-card {
            flex: 1;
            text-align: center;
            padding: 20px;
            border: 2px solid;
            border-radius: 8px;
        }
        .security-card {
            border-color: #10b981;
            background-color: #f0fdf4;
        }
        .risk-card {
            border-color: #ef4444;
            background-color: #fef2f2;
        }
        .score {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
        }
        .security-score {
            color: #059669;
        }
        .risk-score {
            color: #dc2626;
        }
        .critical-alert {
            background-color: #fef2f2;
            border: 2px solid #ef4444;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .critical-title {
            color: #dc2626;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .cracked-secret {
            background-color: #fee2e2;
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
        }
        .issues-section {
            margin: 30px 0;
        }
        .issue {
            margin: 20px 0;
            padding: 15px;
            border-left: 4px solid;
            border-radius: 4px;
        }
        .critical { 
            border-color: #dc2626; 
            background-color: #fef2f2;
        }
        .high { 
            border-color: #f59e0b; 
            background-color: #fffbeb;
        }
        .medium { 
            border-color: #eab308; 
            background-color: #fefce8;
        }
        .low { 
            border-color: #3b82f6; 
            background-color: #eff6ff;
        }
        .issue-header {
            font-weight: bold;
            margin-bottom: 8px;
        }
        .severity {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 10px;
        }
        .severity.critical { 
            background-color: #dc2626; 
            color: white;
        }
        .severity.high { 
            background-color: #f59e0b; 
            color: white;
        }
        .severity.medium { 
            background-color: #eab308; 
            color: white;
        }
        .severity.low { 
            background-color: #3b82f6; 
            color: white;
        }
        .recommendation {
            background-color: #f8fafc;
            padding: 10px;
            border-radius: 4px;
            margin-top: 8px;
        }
        .token-details {
            margin: 30px 0;
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
        }
        .token-section {
            margin: 15px 0;
        }
        .token-content {
            background-color: #1f2937;
            color: #f9fafb;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .summary {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🔍 JWT Security Scanner Report</div>
        <div>Comprehensive Security Analysis</div>
        <div class="scan-date">Generated: ${new Date(timestamp).toLocaleString()}</div>
    </div>

    <div class="scores">
        <div class="score-card security-card">
            <h3>Security Level</h3>
            <div class="score security-score">${Math.round(securityScore)}%</div>
            <div>${getSecurityLevel(securityScore)}</div>
        </div>
        <div class="score-card risk-card">
            <h3>Risk Level</h3>
            <div class="score risk-score">${Math.round(riskScore)}%</div>
            <div>${getRiskLevel(riskScore)}</div>
        </div>
    </div>

    ${crackedSecret ? `
    <div class="critical-alert">
        <div class="critical-title">🚨 CRITICAL: Secret Compromised!</div>
        <p>Your JWT secret was successfully cracked during analysis. This represents a critical security vulnerability that requires immediate attention.</p>
        <div class="cracked-secret">
            <strong>Cracked Secret:</strong> "${crackedSecret.secret}"
            ${crackedSecret.hash ? `<br><strong>SHA256 Hash:</strong> ${crackedSecret.hash}` : ''}
        </div>
        <p><strong>Immediate Actions Required:</strong></p>
        <ul>
            <li>Rotate secret immediately using a cryptographically random 256+ bit secret</li>
            <li>Invalidate all existing tokens signed with this secret</li>
            <li>Review access logs for potential unauthorized token use</li>
            <li>Consider asymmetric signing (RS256/ES256) for better security</li>
        </ul>
    </div>
    ` : ''}

    <div class="summary">
        <h3>Executive Summary</h3>
        <p><strong>Issues Found:</strong> ${issues.length} total security issues</p>
        <ul>
            <li>Critical: ${issues.filter(i => i.severity === 'Critical').length}</li>
            <li>High: ${issues.filter(i => i.severity === 'High').length}</li>
            <li>Medium: ${issues.filter(i => i.severity === 'Medium').length}</li>
            <li>Low: ${issues.filter(i => i.severity === 'Low').length}</li>
        </ul>
        ${crackedSecret ? 
          '<p><strong>⚠️ Critical Finding:</strong> Weak HMAC secret successfully cracked - immediate remediation required.</p>' :
          '<p><strong>Secret Analysis:</strong> No weak secrets detected during automated testing.</p>'
        }
    </div>

    <div class="issues-section">
        <h2>Detailed Security Issues & Recommendations</h2>
        ${issues.length > 0 ? issues.map(issue => `
            <div class="issue ${issue.severity.toLowerCase()}">
                <div class="issue-header">
                    <span class="severity ${issue.severity.toLowerCase()}">${issue.severity}</span>
                    ${issue.category} - ${issue.issue}
                </div>
                <div><strong>Impact:</strong> ${issue.impact}</div>
                <div class="recommendation">
                    <strong>💡 Recommendation:</strong> ${issue.recommendation}
                </div>
            </div>
        `).join('') : '<p>✅ No security issues detected. Your JWT follows security best practices!</p>'}
    </div>

    <div class="token-details">
        <h2>Token Analysis Details</h2>
        <div class="token-section">
            <h3>Header</h3>
            <div class="token-content">${JSON.stringify(decoded.header, null, 2)}</div>
        </div>
        <div class="token-section">
            <h3>Payload</h3>
            <div class="token-content">${JSON.stringify(decoded.payload, null, 2)}</div>
        </div>
    </div>

    <div class="footer">
        <p>Generated by JWT Security Scanner - Exploit-Forge LTD</p>
        <p>This report contains security analysis performed on ${new Date(timestamp).toLocaleDateString()}</p>
        <p>⚠️ This report may contain sensitive information. Handle with appropriate security measures.</p>
    </div>
</body>
</html>`

    // Create blob and download
    const blob = new Blob([pdfContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jwt-security-report-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getSecurityLevel = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 50) return 'Fair'
    if (score >= 30) return 'Poor'
    return 'Critical'
  }

  const getRiskLevel = (score) => {
    if (score >= 80) return 'Critical'
    if (score >= 60) return 'High'
    if (score >= 40) return 'Medium'
    if (score >= 20) return 'Low'
    return 'Minimal'
  }

  const handleTokenChange = (newToken) => {
    setScanToken(newToken)
    // Also update the app-level token if the setter is provided
    if (setAppToken) {
      setAppToken(newToken)
    }
  }

  return (
    <div className="scanner-page max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Header */}
      <div className="page-hero scanner-hero text-center">
        <h1>
          JWT Security Scanner
        </h1>
        <p>
          Analyze signing algorithms, validate claims, detect sensitive data, and identify weak secrets in one focused scan.
        </p>
      </div>

      {/* Scanner Input */}
      <div className="mb-6 sm:mb-8">
        <ScannerInput 
          token={scanToken}
          onTokenChange={handleTokenChange}
          onScan={handleScan}
          isScanning={isScanning}
        />
      </div>

      {/* Results */}
      {scanResults && (
        <div className="scanner-results-stack">
          {scanResults.error ? (
            <div className="scanner-error-card" role="alert">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></svg>
              <div><h3>Scan could not be completed</h3><p>{scanResults.error}</p></div>
            </div>
          ) : (
            <>
              {/* Gauges */}
              <div className="scanner-score-grid" ref={gaugesRef}>
                <SecurityGauge score={scanResults.securityScore} />
                <RiskGauge score={scanResults.riskScore} />
              </div>

              {/* Detailed Results */}
              <ScanResults results={scanResults} />

              {/* Download Report Button */}
              {!scanResults.error && (
                <div className="scanner-report-action">
                  <button
                    onClick={generatePDFReport}
                    className="scanner-report-button"
                  >
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="whitespace-nowrap">Download Scan Report</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ScannerPage
