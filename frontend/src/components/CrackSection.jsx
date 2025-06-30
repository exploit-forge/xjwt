import { useState, useRef, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || '/api'

function CrackSection({ token }) {
  const [wordlistFile, setWordlistFile] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState('')
  const [crackedSecret, setCrackedSecret] = useState(null)
  const [progress, setProgress] = useState('')
  const [eventSource, setEventSource] = useState(null)
  const [usingCustomWordlist, setUsingCustomWordlist] = useState(false)
  const logsRef = useRef(null)

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  const startCracking = async () => {
    if (!token) {
      alert('Please provide a JWT token to crack')
      return
    }

    setIsRunning(true)
    setLogs('')
    setCrackedSecret(null)
    setUsingCustomWordlist(false)
    setProgress('Initializing attack...')

    try {
      let wordlistContent = null
      
      // Read wordlist file if provided
      if (wordlistFile) {
        setProgress('📖 Reading wordlist file...')
        wordlistContent = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.onerror = (e) => reject(new Error('Failed to read wordlist file'))
          reader.readAsText(wordlistFile)
        })
      }

      // Prepare request data
      const requestData = { token }
      if (wordlistContent) {
        requestData.wordlist = wordlistContent
      }

      setProgress('🚀 Starting attack...')

      // Use POST for both custom and default wordlists
      const response = await fetch(`${API_BASE}/crack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Handle SSE response from POST request
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // Remove 'data: ' prefix

            if (data.startsWith('RESULT ')) {
              const result = JSON.parse(data.replace('RESULT ', ''))
              setCrackedSecret(result)
              if (usingCustomWordlist) {
                setProgress('🎉 Secret found with custom wordlist!')
              } else {
                setProgress('🎉 Secret found!')
              }
              setIsRunning(false)
              return
            } else if (data === 'DONE') {
              if (!crackedSecret) {
                setProgress('❌ Attack completed - no secret found')
              }
              setIsRunning(false)
              return
            } else if (data.startsWith('ERROR ')) {
              setLogs(prev => prev + `❌ ${data.replace('ERROR ', '')}\n`)
              setProgress('❌ Error occurred')
              setIsRunning(false)
              return
            } else if (data.trim()) {
              setLogs(prev => prev + data + '\n')
              
              // Update progress based on log content
              if (data.includes('Using custom wordlist with')) {
                const match = data.match(/Using custom wordlist with (\d+) entries/)
                if (match) {
                  setUsingCustomWordlist(true)
                  setProgress(`📁 Using custom wordlist (${match[1]} entries)`)
                }
              } else if (data.includes('Using default wordlist')) {
                setUsingCustomWordlist(false)
                setProgress('📖 Using default wordlist (100+ secrets)')
              } else if (data.includes('Testing')) {
                if (usingCustomWordlist) {
                  setProgress('🎯 Testing passwords with custom wordlist...')
                } else {
                  setProgress('🔍 Testing passwords...')
                }
              } else if (data.includes('Loaded')) {
                setProgress('📖 Wordlist loaded')
              } else if (data.includes('Starting')) {
                setProgress('🚀 Attack started')
              }
            }
          }
        }
      }

    } catch (error) {
      setProgress('❌ Error occurred')
      setLogs(prev => prev + `❌ Error: ${error.message}\n`)
      setIsRunning(false)
    }
  }

  const stopCracking = () => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
    setIsRunning(false)
    setProgress('⏹️ Attack stopped')
    setLogs(prev => prev + '\n=== Attack stopped by user ===\n')
  }

  const clearLogs = () => {
    setLogs('')
    setCrackedSecret(null)
    setProgress('')
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    
    if (file) {
      // Check file format
      const allowedExtensions = ['.txt', '.list', '.dic']
      const fileName = file.name.toLowerCase()
      const isValidFormat = allowedExtensions.some(ext => fileName.endsWith(ext))
      
      if (!isValidFormat) {
        alert('Invalid Format! Please upload only .txt, .list, or .dic files.')
        event.target.value = '' // Clear the input
        return
      }
      
      // Check file size (warn if > 1MB, reject if > 2MB)
      const maxSize = 2 * 1024 * 1024 // 2MB
      const warnSize = 1 * 1024 * 1024 // 1MB
      
      if (file.size > maxSize) {
        alert(`File too large! Maximum size is 2MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`)
        event.target.value = '' // Clear the input
        return
      }
      
      if (file.size > warnSize) {
        const proceed = confirm(`Large wordlist detected (${(file.size / 1024 / 1024).toFixed(1)}MB). This may take a long time to process. Continue?`)
        if (!proceed) {
          event.target.value = '' // Clear the input
          return
        }
      }
    }
    
    setWordlistFile(file)
  }

  const copySecret = () => {
    if (crackedSecret?.secret) {
      navigator.clipboard.writeText(crackedSecret.secret)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              JWT SECRET CRACKER
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              BRUTE FORCE JWT SECRETS USING DICTIONARY ATTACKS
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-xs text-gray-500 dark:text-gray-500">
              <span>Powered by jwt_tool</span>
              <a
                href="https://github.com/ticarpi/jwt_tool"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="View jwt_tool on GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wordlist Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Wordlist (Optional)
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".txt,.list,.dic"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 file:cursor-pointer cursor-pointer transition-colors"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leave empty to use default wordlist with 100+ common secrets
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Attack Status
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
              <div className={`text-sm font-medium ${
                isRunning ? 'text-orange-600 dark:text-orange-400' : 
                crackedSecret ? 'text-green-600 dark:text-green-400' : 
                'text-gray-600 dark:text-gray-400'
              }`}>
                {isRunning ? '🏃‍♂️ Running' : crackedSecret ? '✅ Success' : '⏹️ Idle'}
              </div>
              {progress && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {progress}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={startCracking}
              disabled={isRunning || !token}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>{isRunning ? '🔄' : '🚀'}</span>
              <span>{isRunning ? 'Attacking...' : 'Start Attack'}</span>
            </button>
            
            <button
              onClick={stopCracking}
              disabled={!isRunning}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>⏹️</span>
              <span>Stop</span>
            </button>
          </div>

          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Clear Logs
          </button>
        </div>

        {/* Results */}
        {crackedSecret && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                  🎉 Secret Cracked Successfully!
                </h3>
                <div className="space-y-2">
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <span className="font-medium">Secret:</span>
                  </div>
                  <div className="font-mono text-sm bg-green-100 dark:bg-green-900/50 p-3 rounded border border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 break-all">
                    {crackedSecret.secret}
                  </div>
                  {crackedSecret.hash && (
                    <>
                      <div className="text-sm text-green-700 dark:text-green-400">
                        <span className="font-medium">SHA256 Hash:</span>
                      </div>
                      <div className="font-mono text-xs bg-green-100 dark:bg-green-900/50 p-2 rounded border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 break-all">
                        {crackedSecret.hash}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={copySecret}
                className="ml-4 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                Copy Secret
              </button>
            </div>
          </div>
        )}

        {/* Attack Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Attack Logs
            </label>
            {isRunning && (
              <div className="flex items-center space-x-2 text-sm text-orange-600 dark:text-orange-400">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            )}
          </div>
          <textarea
            ref={logsRef}
            value={logs}
            readOnly
            placeholder="Attack logs will appear here..."
            className="w-full h-64 p-4 font-mono text-sm bg-gray-900 dark:bg-black text-green-400 border border-gray-600 dark:border-gray-700 rounded-lg resize-none overflow-y-auto logs-container"
            style={{
              backgroundColor: '#1a1a1a',
              color: '#00ff00',
              fontFamily: 'Monaco, Consolas, "Courier New", monospace'
            }}
          />
        </div>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            💡 Tips for Effective JWT Cracking
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Default wordlist contains 100000+ common JWT secrets</li>
            <li>• Upload custom wordlists for targeted attacks</li>
            <li>• Weak secrets like "secret", "key", or "password" are often found quickly</li>
            <li>• Large wordlists may take considerable time to process</li>
            <li>• This tool only works with HMAC-signed tokens (HS256, HS384, HS512)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default CrackSection
