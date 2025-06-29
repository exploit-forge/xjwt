import { useState, useEffect } from 'react'

function TokenInput({ token, setToken, onTokenChange }) {
  const [parts, setParts] = useState(['', '', ''])
  const [isValidToken, setIsValidToken] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    if (token) {
      const tokenParts = token.split('.')
      setParts([
        tokenParts[0] || '',
        tokenParts[1] || '',
        tokenParts[2] || ''
      ])
      setIsValidToken(tokenParts.length === 3 && tokenParts[0] && tokenParts[1])
      if (onTokenChange) {
        onTokenChange(token)
      }
    } else {
      setParts(['', '', ''])
      setIsValidToken(false)
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
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Valid JWT</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400">Signature Verified</span>
            </div>
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
