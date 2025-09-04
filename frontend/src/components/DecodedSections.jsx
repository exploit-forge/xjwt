import { useState, useEffect, useCallback, useRef } from 'react'
import TimestampCell from './TimestampCell'
import JSONWithTimestampTooltips from './JSONWithTimestampTooltips'

const API_BASE = import.meta.env.VITE_BACKEND_URL || '/api' // Only needed for verify/encode with HMAC

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
    const timestampFields = ['iat', 'exp', 'nbf', 'auth_time', 'updated_at', 'created_at', 'refresh_token_expires_at']

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
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [encodedToken, setEncodedToken] = useState('')
  const [isInternalUpdate, setIsInternalUpdate] = useState(false)
  const [hasBeenModified, setHasBeenModified] = useState(false)
  const [isAutoSigning, setIsAutoSigning] = useState(false)

  // Decode token whenever it changes (from external input only)
  useEffect(() => {
    if (!isInternalUpdate) {
      if (token) {
        decodeToken()
      } else {
        resetFields()
      }
    }
    setIsInternalUpdate(false) // Reset flag
  }, [token])

  // Auto-encode when header or payload changes (from editing)
  useEffect(() => {
    if (header && payload && setToken) {
      autoEncodeToken()
    }
  }, [header, payload, algorithm])

  // Auto-sign token when secret changes (if we have content and a valid secret)
  useEffect(() => {
    if (secret && secret.trim() && header && payload && hasBeenModified) {
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
  }, [secret, header, payload, hasBeenModified, algorithm])

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
    try {
      setIsAutoSigning(true)
      const headerObj = { ...header, alg: algorithm }

      // Only auto-sign for HMAC algorithms with secrets
      if (algorithm.startsWith('HS') && secret.trim()) {
        const response = await fetch(`${API_BASE}/encode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            header: headerObj,
            payload: payload,
            secret: secret
          })
        })

        if (response.ok) {
          const data = await response.json()
          
          // Update the signature from the new signed token
          const newSignature = data.token.split('.')[2]
          setSignature(newSignature)
          
          // Update the main token with the properly signed version
          setIsInternalUpdate(true)
          setToken(data.token)
          
          // Clear the modified flag since it's now properly signed
          setHasBeenModified(false)
        }
      } else if (algorithm === 'none') {
        // For 'none' algorithm, clear signature
        setSignature('')
        const headerObj = { ...header, alg: 'none' }
        const base64UrlEncode = (obj) => {
          return btoa(JSON.stringify(obj))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')
        }
        const encodedHeader = base64UrlEncode(headerObj)
        const encodedPayload = base64UrlEncode(payload)
        const unsignedToken = `${encodedHeader}.${encodedPayload}.`
        
        setIsInternalUpdate(true)
        setToken(unsignedToken)
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
  }

  const decodeToken = () => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format')
      }

      // Client-side Base64 decoding
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      const signature = parts[2]

      setHeader(header)
      setPayload(payload)
      setSignature(signature)
      setAlgorithm(header.alg || 'HS256')
      setHasBeenModified(false) // Reset modified flag when decoding fresh token
    } catch (error) {
      console.error('Error decoding token:', error)
      // Reset fields on decode error
      resetFields()
    }
  }

  const encodeToken = async () => {
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

      // For algorithms that require server-side signing (asymmetric or HMAC with secret)
      if (algorithm.startsWith('HS') && secret.trim()) {
        // HMAC algorithms - need server for signing
        const response = await fetch(`${API_BASE}/encode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            header: headerObj,
            payload: payload,
            secret: secret
          })
        })

        if (response.ok) {
          const data = await response.json()
          setEncodedToken(data.token)
          setHasBeenModified(false) // Reset modified flag when token is properly signed
          setSignature(data.token.split('.')[2]) // Update signature from the new token
        } else {
          console.error('Failed to encode token with signature')
        }
      } else if (algorithm.startsWith('RS') || algorithm.startsWith('ES') || algorithm.startsWith('PS')) {
        // Asymmetric algorithms - would need private key (not implemented in this demo)
        alert('Asymmetric algorithms (RS*/ES*/PS*) require private keys and are not supported in this demo. Use HS* algorithms with a secret instead.')
      } else if (algorithm === 'none') {
        // No signature - can be done client-side
        const unsignedToken = `${encodedHeader}.${encodedPayload}.`
        setEncodedToken(unsignedToken)
        setHasBeenModified(false) // Reset modified flag
        setSignature('') // No signature for 'none' algorithm
      } else {
        // Default: create unsigned token structure
        const unsignedToken = `${encodedHeader}.${encodedPayload}.`
        setEncodedToken(unsignedToken)
        setHasBeenModified(false) // Reset modified flag
        setSignature('') // No signature
      }
    } catch (error) {
      console.error('Error encoding token:', error)
    }
  }

  const handleHeaderEdit = (newHeader) => {
    setHeader(newHeader)
  }

  const handlePayloadEdit = (newPayload) => {
    setPayload(newPayload)
  }

  const handleAlgorithmChange = (newAlgorithm) => {
    setAlgorithm(newAlgorithm)
    // Update header with new algorithm
    if (header) {
      setHeader({ ...header, alg: newAlgorithm })
    }
  }

  const verifyToken = async () => {
    if (!secret.trim()) {
      alert('Please enter a secret key')
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      // Only signature verification needs server-side processing
      const response = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, secret })
      })

      const data = await response.json()
      setVerificationResult(data)
    } catch (error) {
      console.error('Error verifying token:', error)
      setVerificationResult({ valid: false, error: 'Network error during signature verification' })
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
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Token Modified - Signature May Be Invalid
                  </h4>
                  <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    <p>You've edited this JWT. The current signature may not match the new content.</p>
                    <p className="mt-1">
                      <strong>💡 Enter your secret below</strong> to automatically re-sign with the new content!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Secret Input */}
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

          {/* Algorithm Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Algorithm
            </label>
            <select
              value={algorithm}
              onChange={(e) => handleAlgorithmChange(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
            >
              <option value="HS256">HS256</option>
              <option value="HS384">HS384</option>
              <option value="HS512">HS512</option>
              <option value="RS256">RS256</option>
              <option value="RS384">RS384</option>
              <option value="RS512">RS512</option>
              <option value="ES256">ES256</option>
              <option value="ES384">ES384</option>
              <option value="ES512">ES512</option>
              <option value="none">none</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={verifyToken}
              disabled={!token || !secret || isVerifying}
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
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Privacy Protected & Real-time Auto-Signing:</p>
                <p>• JWT decoding happens in your browser - tokens never leave your device</p>
                <p>• <strong>Auto-signing</strong>: When you enter a secret, the token is automatically re-signed</p>
                <p>• <strong>Live editing</strong>: Changes to header/payload automatically update the encoded token</p>
                <p>• Only signature operations require server processing (for security)</p>
                <p>• Asymmetric algorithms (RS*/ES*) are not supported for security reasons</p>
              </div>
            </div>
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

export default DecodedSections
