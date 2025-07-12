const ScannerInput = ({ token, onTokenChange, onScan, isScanning }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Token Input */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            JWT Token to Scan
          </label>
          <textarea
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="Paste your JWT token here or it will be automatically imported from your last session..."
            className="w-full h-32 sm:h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-500 dark:placeholder-gray-400
                     font-mono text-sm resize-none touch-manipulation"
            disabled={isScanning}
          />
          
          {/* Token info */}
          {token && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2">
              <span>Token length: {token.length} characters</span>
              {token.split('.').length === 3 && (
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  ✓ Valid JWT format
                </span>
              )}
              {token.split('.').length !== 3 && token.trim() && (
                <span className="text-red-600 dark:text-red-400 flex items-center">
                  ✗ Invalid JWT format
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scan Button and Info */}
        <div className="lg:w-80 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Security Scan
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Our scanner will analyze your JWT for:
            </p>
            <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Algorithm security</li>
              <li>• Claims validation</li>
              <li>• Sensitive data exposure</li>
              <li>• <strong className="text-red-600 dark:text-red-400">Secret cracking attempts</strong></li>
              <li>• Best practice compliance</li>
            </ul>
          </div>

          <button
            onClick={onScan}
            disabled={!token.trim() || token.split('.').length !== 3 || isScanning}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white font-medium py-3 px-4 rounded-lg
                     transition-colors duration-200
                     disabled:cursor-not-allowed
                     flex items-center justify-center
                     min-h-[48px] touch-manipulation text-base"
          >
            {isScanning ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Scanning & Cracking...</span>
              </>
            ) : (
              'Scan JWT Security'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export { ScannerInput }