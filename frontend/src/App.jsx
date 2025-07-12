import { useState, useEffect } from 'react'
import { Header, TokenInput, DecodedSections, CrackSection, PromoNotification, LibrariesPage, ScannerPage } from './components'
import './App.css'

function App() {
  const [theme, setTheme] = useState('dark') // Default to dark mode
  const [token, setToken] = useState('')
  const [currentView, setCurrentView] = useState('decoder') // 'decoder', 'crack', 'scanner', or 'libraries'

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  const handleTokenChange = (newToken) => {
    // This can be used for any additional logic when token changes
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header theme={theme} setTheme={setTheme} currentView={currentView} setCurrentView={setCurrentView} />
      <PromoNotification />
      
      {/* Secondary Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex">
            <button
              onClick={() => setCurrentView('decoder')}
              className={`py-3 px-6 border-b-3 font-medium text-sm transition-colors ${
                currentView === 'decoder'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              JWT Decoder/Encoder
            </button>
            <button
              onClick={() => setCurrentView('crack')}
              className={`py-3 px-6 border-b-3 font-medium text-sm transition-colors ${
                currentView === 'crack'
                  ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400'
                  : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              JWT Cracker
            </button>
            <button
              onClick={() => setCurrentView('scanner')}
              className={`py-3 px-6 border-b-3 font-medium text-sm transition-colors ${
                currentView === 'scanner'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                  : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              JWT Scanner
            </button>
          </nav>
        </div>
      </div>

      <main className="flex-1 w-full">
        {currentView === 'libraries' ? (
          <LibrariesPage />
        ) : currentView === 'scanner' ? (
          <ScannerPage token={token} setToken={setToken} />
        ) : (
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentView === 'decoder' ? (
              <>
                {/* JWT.io style intro */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    JSON Web Tokens
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    JSON Web Tokens are an open, industry standard{' '}
                    <a 
                      href="https://tools.ietf.org/html/rfc7519" 
                      className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      RFC 7519
                    </a>{' '}
                    method for representing claims securely between two parties.
                  </p>
                </div>

                {/* Main decoder layout - JWT.io style */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left Column - Token Input (60% width) */}
                  <div className="lg:col-span-3">
                    <TokenInput 
                      token={token} 
                      setToken={setToken} 
                      onTokenChange={handleTokenChange}
                    />
                  </div>

                  {/* Right Column - Decoded sections (40% width) */}
                  <div className="lg:col-span-2 space-y-4">
                    <DecodedSections token={token} setToken={setToken} />
                  </div>
                </div>
              </>
            ) : currentView === 'crack' ? (
              <>
                {/* Crack section intro */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    JWT Cracker
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    Test the security of JWT implementations by attempting to crack weak secrets using dictionary attacks.
                  </p>
                </div>

                {/* Token input for cracking */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <TokenInput 
                    token={token} 
                    setToken={setToken} 
                    onTokenChange={handleTokenChange}
                  />
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      ⚠️ Security Testing Guidelines
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <p className="font-medium text-amber-600 dark:text-amber-400">
                        Only test JWTs that you own or have explicit permission to test.
                      </p>
                      <p>
                        This tool attempts to crack JWT secrets using common passwords and dictionary attacks.
                      </p>
                      <p>
                        Use strong, randomly generated secrets (at least 256 bits) for production systems.
                      </p>
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                          🔒 Privacy Protected: We do not store or log your JWT, secrets, or wordlists. Data is processed on our servers temporarily and automatically deleted after use. No sensitive information is retained long-term.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Crack section */}
                <CrackSection token={token} />
              </>
            ) : null}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Company info */}
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <span className="text-sm text-gray-700 dark:text-gray-300">Developed by Exploit-Forge LTD</span>
              <a 
                href="https://exploit-forge.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center hover:opacity-80 transition-opacity"
                title="Visit Exploit-forge"
              >
                <img 
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjQ1IiB2aWV3Qm94PSIwIDAgNDAwIDEyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIFNoaWVsZCBTaGFwZSAtLT4KICA8cGF0aCBkPSJNNTUgMTBMMTAwIDI1VjY1QzEwMCA4NSA3NSAxMDUgNTUgMTEwQzM1IDEwNSAxMCA4NSAxMCA2NVYyNUw1NSAxMFoiIGZpbGw9IiMzNDQ1NjMiIHN0cm9rZT0iIzFGMjkzNyIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgCiAgPCEtLSBDb2RlIEJyYWNrZXRzIC0tPgogIDxwYXRoIGQ9Ik0zNSA0MEwyNSA2MEwzNSA4MCIgc3Ryb2tlPSIjRjU5NzMzIiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik03NSA0MEw4NSA2MEw3NSA4MCIgc3Ryb2tlPSIjRjU5NzMzIiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDxsaW5lIHgxPSI0NSIgeTE9IjM1IiB4Mj0iNjUiIHkyPSI4NSIgc3Ryb2tlPSIjRjU5NzMzIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgoKICA8IS0tIEVYUExPSVQgVGV4dCAtLT4KICA8dGV4dCB4PSIxMzAiIHk9IjQ1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMzNDQ1NjMiPkVYUExPSVQ8L3RleHQ+CiAgPCEtLSBGT1JHRSBUZXh0IC0tPgogIDx0ZXh0IHg9IjEzMCIgeT0iODAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyOCIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI0Y1OTczMyI+Rk9SR0U8L3RleHQ+Cjwvc3ZnPgo=" 
                  alt="Exploit-forge" 
                  className="h-10 w-auto sm:h-8"
                />
              </a>
            </div>
            
            {/* Social media icons */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">Follow us on:</span>
              {/* LinkedIn */}
              <a
                href="https://linkedin.com/company/exploit-forge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Follow us on LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>

              {/* Twitter */}
              <a
                href="https://twitter.com/ExploitforgeLTD"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors"
                title="Follow us on Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
                title="Follow us on Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C8.396 0 7.977.01 6.75.048 2.76.146.146 2.76.048 6.75.01 7.977 0 8.396 0 12.017c0 3.624.01 4.042.048 5.268.098 3.99 2.712 6.604 6.702 6.702 1.227.039 1.645.048 5.267.048 3.624 0 4.042-.01 5.268-.048 3.99-.098 6.604-2.712 6.702-6.702.039-1.226.048-1.644.048-5.268 0-3.621-.01-4.04-.048-5.267C23.888 2.76 21.274.146 17.284.048 16.057.01 15.639 0 12.017 0zm0 2.162c3.557 0 3.98.01 5.238.048 2.908.133 4.109 1.348 4.238 4.238.04 1.258.048 1.681.048 5.238 0 3.558-.01 3.98-.048 5.239-.129 2.89-1.33 4.104-4.238 4.238-1.259.04-1.681.048-5.238.048-3.558 0-3.98-.01-5.239-.048-2.908-.133-4.109-1.348-4.238-4.238-.04-1.259-.048-1.681-.048-5.239 0-3.557.01-3.98.048-5.238.129-2.89 1.33-4.105 4.238-4.238 1.259-.04 1.681-.048 5.239-.048zm0 3.676a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12.017 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z"/>
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/exploit-forge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Visit our GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
