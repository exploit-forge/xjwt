import { useState, useEffect } from 'react'

function TokenInput({ token, setToken, onTokenChange }) {
  const [parts, setParts] = useState(['', '', ''])
  const [isValidToken, setIsValidToken] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [isSigned, setIsSigned] = useState(false)

  useEffect(() => {
    if (!token) {
      setParts(['', '', ''])
      setIsValidToken(false)
      setValidationError('')
      setIsSigned(false)
      return
    }

    const tokenParts = token.split('.')
    const normalizedParts =
      tokenParts.length === 1
        ? ['', tokenParts[0] || '', '']
        : tokenParts.length === 2
          ? [tokenParts[0] || '', tokenParts[1] || '', '']
          : [
              tokenParts[0] || '',
              tokenParts[1] || '',
              tokenParts[2] || ''
            ]
    setParts(normalizedParts)

    const hasFullStructure = tokenParts.length === 3 && tokenParts[0] && tokenParts[1]
    let hasDecodeError = false

    try {
      if (normalizedParts[0]) {
        JSON.parse(atob(normalizedParts[0].replace(/-/g, '+').replace(/_/g, '/')))
      }
      if (normalizedParts[1]) {
        JSON.parse(atob(normalizedParts[1].replace(/-/g, '+').replace(/_/g, '/')))
      }
    } catch {
      hasDecodeError = true
    }

    if (hasFullStructure && !hasDecodeError) {
      setIsValidToken(true)
      setValidationError('')
    } else if (!hasFullStructure) {
      setIsValidToken(false)
      setValidationError('Incomplete JWT - expected 3 parts separated by dots')
    } else {
      setIsValidToken(false)
      setValidationError('Invalid JWT - header or payload is not valid Base64/JSON')
    }

    setIsSigned(Boolean(normalizedParts[2]))

    if (onTokenChange) {
      onTokenChange(token)
    }
  }, [token, onTokenChange])

  const handleTokenChange = (value) => {
    setToken(value)
  }

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token).then(() => {
        setCopyStatus('Copied!')
        setTimeout(() => setCopyStatus(''), 2000)
      })
    }
  }

  const clearToken = () => {
    setToken('')
  }

  const loadSampleToken = () => {
    const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    setToken(sampleToken)
  }

  return (
    <div className="token-input-section">
      <div className="workspace-section-head">
        <div>
          <h2>Encoded Token</h2>
          <p>JSON Web Token (JWT)</p>
        </div>
        <button
          onClick={loadSampleToken}
          className="accent-button px-4 py-2 text-sm rounded-xl transition-all font-medium"
        >
          Generate example
        </button>
      </div>

      <div className="token-input-panel workspace-panel p-1.5">
        <div className="workspace-panel-toolbar">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="font-mono text-orange-400">›_</span> JSON Web Token (JWT)
          </span>
          {token && (
            <div className="flex items-center gap-1">
              <button
                onClick={copyToClipboard}
                className={`workspace-icon-button ${copyStatus ? 'text-green-500' : ''}`}
                title={copyStatus ? 'Copied' : 'Copy token'}
                aria-label={copyStatus ? 'Token copied' : 'Copy token'}
                aria-live="polite"
              >
                {copyStatus ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12.5l4.2 4.2L19 7" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
              </button>
              <button onClick={clearToken} className="workspace-icon-button" title="Clear token" aria-label="Clear token">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
        <div className="token-input-editor-wrap px-1 pb-1">
        <div className="relative h-full">
          <textarea
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder="Paste a JWT below that you'd like to decode, validate, and verify..."
            className="workspace-editor w-full h-full min-h-64 p-4 font-mono text-sm resize-none transition-colors placeholder-gray-500"
            spellCheck={false}
          />
          
        </div>
        </div>
      </div>

        {/* Token Validation Banner */}
        {token && isValidToken && (
          <div className="mt-4 space-y-2">
            {isSigned ? (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Valid Signed JWT</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 dark:text-green-400">Live Editing</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Valid Unsigned JWT</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-amber-600 dark:text-amber-400">Live Editing</span>
                  </div>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  This JWT has valid format but no signature. Enter a secret in the verification section to auto-sign it.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Token Validation Error */}
        {token && !isValidToken && validationError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-red-800 dark:text-red-200">Invalid JWT</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationError}</p>
          </div>
        )}

        {/* Color-coded Token Display */}
        {token && isValidToken && (
          <div className="mt-4">
            <div className="token-preview font-mono text-xs break-all leading-relaxed p-4 rounded-lg">
              {parts[0] && (
                <>
                  <span className="text-red-500 dark:text-red-400" title="Header">
                    {parts[0]}
                  </span>
                  {parts[1] && <span className="text-gray-400">.</span>}
                </>
              )}
              {parts[1] && (
                <>
                  <span className="text-purple-500 dark:text-purple-400" title="Payload">
                    {parts[1]}
                  </span>
                  {parts[2] && <span className="text-gray-400">.</span>}
                </>
              )}
              {parts[2] && parts[2].length > 0 ? (
                <span className="text-blue-500 dark:text-blue-400" title="Signature">
                  {parts[2]}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500 italic text-xs" title="No Signature">
                  [unsigned]
                </span>
              )}
            </div>
          </div>
        )}
    </div>
  )
}

export default TokenInput
