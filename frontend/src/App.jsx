import { useState, useEffect } from 'react'
import { Header, TokenInput, DecodedSections, CrackSection, PromoNotification, LibrariesPage, ScannerPage, AdvancedSecurity, PrivacyFeatures, CrackingTips } from './components'
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

  const handleTokenChange = () => {
    // This can be used for any additional logic when token changes
  }

  return (
    <div className="app-shell min-h-screen flex flex-col transition-colors">
      <Header theme={theme} setTheme={setTheme} currentView={currentView} setCurrentView={setCurrentView} />
      <PromoNotification />
      
      <main className="flex-1 w-full">
        {currentView === 'libraries' ? (
          <LibrariesPage />
        ) : currentView === 'scanner' ? (
          <ScannerPage token={token} setToken={setToken} />
        ) : currentView === 'advanced' ? (
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AdvancedSecurity token={token} setToken={setToken} />
          </div>
        ) : (
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentView === 'decoder' ? (
              <>
                {/* JWT.io style intro */}
                <div className="page-hero text-center mb-14 pt-8">
                  <h1 className="mb-5 text-gray-900 dark:text-white">
                    JSON Web Token<br className="hidden sm:block" /> Decoder &amp; Encoder
                  </h1>
                  <p className="text-base leading-relaxed">
                    Decode, inspect, verify, edit, and re-sign JSON Web Tokens in one synchronized workspace.
                  </p>
                </div>

                <div className="workspace-intro mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Paste a JWT to decode, validate, edit, and verify.</p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Edits to header or payload update the encoded token in real time.</p>
                  </div>
                  <span className="workspace-badge"><span className="workspace-badge-dot" /> Local-first editing</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-7 items-stretch">
                  {/* Left Column - Token Input */}
                  <div className="min-w-0 h-full">
                    <TokenInput
                      token={token}
                      setToken={setToken}
                      onTokenChange={handleTokenChange}
                    />
                  </div>

                  {/* Right Column - Decoded sections */}
                  <div className="min-w-0 space-y-4">
                    <DecodedSections token={token} setToken={setToken} />
                  </div>
                </div>
                <PrivacyFeatures />
              </>
            ) : currentView === 'crack' ? (
              <>
                {/* Crack section intro */}
                <div className="page-hero text-center mb-12 pt-8">
                  <h1 className="mb-5 text-gray-900 dark:text-white">
                    JWT Cracker
                  </h1>
                  <p className="text-base leading-relaxed">
                    Test the security of JWT implementations by attempting to recover weak signing secrets with a dictionary attack.
                  </p>
                </div>

                <div className="workspace-intro mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Paste a signed HS* token to audit its secret.</p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Only the signature is tested — header and payload are never modified.</p>
                  </div>
                  <span className="workspace-badge"><span className="workspace-badge-dot" /> Nothing retained</span>
                </div>

                {/* Token input for cracking */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 items-start mb-8">
                  <div className="min-w-0">
                    <TokenInput
                      token={token}
                      setToken={setToken}
                      onTokenChange={handleTokenChange}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="workspace-section-head">
                      <div>
                        <h2>Security Testing Guidelines</h2>
                        <p>Before you run an attack</p>
                      </div>
                    </div>
                    <div className="workspace-card p-6">
                      <div className="space-y-3 text-sm text-gray-400">
                        <p className="font-medium text-amber-400">
                          Only test JWTs that you own or have explicit permission to test.
                        </p>
                        <p>
                          This tool attempts to recover JWT secrets using common passwords and dictionary attacks.
                        </p>
                        <p>
                          Use strong, randomly generated secrets (at least 256 bits) for production systems.
                        </p>
                      </div>
                      <div className="workspace-callout workspace-callout-ok mt-5">
                        <strong className="font-semibold text-gray-200">Privacy protected.</strong> We do not store or log your JWT,
                        secrets, or wordlists. Data is processed on our servers temporarily and deleted automatically after use.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Crack section */}
                <CrackSection token={token} />
                <CrackingTips />
              </>
            ) : null}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer mt-auto border-t">
        <div className="max-w-8xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Company info */}
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <a
                href="https://www.exploit-forge.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center transition-opacity hover:opacity-80"
                title="Visit Exploit Forge"
              >
                <img
                  src={`https://www.exploit-forge.com/assets/exploitforgelogo-${theme === 'dark' ? 'dark' : 'light'}.png`}
                  alt="Exploit Forge"
                  className="h-16 w-auto object-contain sm:h-20"
                />
              </a>
            </div>
            
            {/* Social media icons */}
            <div className="flex items-center space-x-4">
              <span className="footer-follow-label mr-2 text-sm">Follow us on:</span>
              {/* LinkedIn */}
              <a
                href="https://linkedin.com/company/exploit-forge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 transition-colors hover:text-white"
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
                className="text-gray-500 transition-colors hover:text-white"
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
                className="text-gray-500 transition-colors hover:text-white"
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
                className="text-gray-500 transition-colors hover:text-white"
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
