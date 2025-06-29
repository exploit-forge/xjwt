import { useState, useEffect } from 'react'
import { Header, TokenInput, DecodedSections, CrackSection, PromoNotification, LibrariesPage } from './components'
import './App.css'

function App() {
  const [theme, setTheme] = useState('dark') // Default to dark mode
  const [token, setToken] = useState('')
  const [currentView, setCurrentView] = useState('decoder') // 'decoder', 'crack', or 'libraries'

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
              JWT Security Testing
            </button>
          </nav>
        </div>
      </div>

      <main className="flex-1 w-full">
        {currentView === 'libraries' ? (
          <LibrariesPage />
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
                <DecodedSections token={token} />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Crack section intro */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                JWT Security Testing
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
                </div>
              </div>
            </div>

            {/* Crack section */}
            <CrackSection token={token} />
          </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm">
            Developed by{' '}
            <a 
              href="https://exploit-forge.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline decoration-2 underline-offset-2 transition-colors"
            >
              Exploit-forge LTD
            </a>
            .
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
