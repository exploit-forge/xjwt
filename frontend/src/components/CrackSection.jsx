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
      
      // Check file size (warn if > 10MB, reject if > 50MB)
      const maxSize = 50 * 1024 * 1024 // 50MB
      const warnSize = 10 * 1024 * 1024 // 10MB
      
      if (file.size > maxSize) {
        alert(`File too large! Maximum size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`)
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
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Powered by jwt_tool
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
            <li>• Default wordlist contains 100+ common JWT secrets</li>
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
