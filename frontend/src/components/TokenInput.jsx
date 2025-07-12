import { useState, useEffect } from 'react'

function TokenInput({ token, setToken, onTokenChange }) {
  const [parts, setParts] = useState(['', '', ''])
  const [isValidToken, setIsValidToken] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    if (token) {
      const tokenParts = token.split('.')
      setParts([
        tokenParts[0] || '',
        tokenParts[1] || '',
        tokenParts[2] || ''
      ])
      
      // Client-side validation - check if it's a valid JWT structure
      if (tokenParts.length !== 3) {
        setIsValidToken(false)
        setValidationError('Invalid JWT format - must have exactly 3 parts separated by dots')
        return
      }
      
      if (!tokenParts[0] || !tokenParts[1]) {
        setIsValidToken(false)
        setValidationError('Invalid JWT - missing header or payload')
        return
      }
      
      // Additionally validate that header and payload are valid Base64/JSON
      try {
        const header = JSON.parse(atob(tokenParts[0].replace(/-/g, '+').replace(/_/g, '/')))
        const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')))
        setIsValidToken(true)
        setValidationError('')
      } catch (error) {
        setIsValidToken(false)
        setValidationError('Invalid JWT - header or payload is not valid Base64/JSON')
      }
      
      if (onTokenChange) {
        onTokenChange(token)
      }
    } else {
      setParts(['', '', ''])
      setIsValidToken(false)
      setValidationError('')
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              ENCODED VALUE
            </h2>
          </div>
          <button
            onClick={loadSampleToken}
            className="px-4 py-1.5 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
          >
            Generate example
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="relative">
          <textarea
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder="Paste a JWT below that you'd like to decode, validate, and verify..."
            className="w-full h-48 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors placeholder-gray-500 dark:placeholder-gray-400"
            spellCheck={false}
          />
          
          {/* Action buttons positioned in top-right of textarea */}
          {token && (
            <div className="absolute top-2 right-2 flex space-x-2">
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium flex items-center space-x-1"
              >
                <span>{copyStatus || 'Copy'}</span>
              </button>
              <button
                onClick={clearToken}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Token Validation Banner */}
        {token && isValidToken && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Valid JWT Format</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400">Live Editing</span>
              </div>
            </div>
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
            <div className="font-mono text-xs break-all leading-relaxed p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
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
              {parts[2] && (
                <span className="text-blue-500 dark:text-blue-400" title="Signature">
                  {parts[2]}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TokenInput
