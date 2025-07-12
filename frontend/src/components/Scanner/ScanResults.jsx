const ScanResults = ({ results }) => {
  const { issues, decoded, timestamp, crackedSecret } = results

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'Critical':
        return '🔴'
      case 'High':
        return '🟠'
      case 'Medium':
        return '🟡'
      case 'Low':
        return '🔵'
      default:
        return '⚪'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'High':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'Medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'Low':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
    }
  }

  const getSeverityTextColor = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'text-red-800 dark:text-red-200'
      case 'High':
        return 'text-orange-800 dark:text-orange-200'
      case 'Medium':
        return 'text-yellow-800 dark:text-yellow-200'
      case 'Low':
        return 'text-blue-800 dark:text-blue-200'
      default:
        return 'text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Scan Results
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Scanned: {new Date(timestamp).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {issues.filter(i => i.severity === 'Critical').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {issues.filter(i => i.severity === 'High').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">High</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {issues.filter(i => i.severity === 'Medium').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Medium</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {issues.filter(i => i.severity === 'Low').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Low</div>
          </div>
        </div>
      </div>

      {/* Cracked Secret Alert - if found */}
      {crackedSecret && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">🚨</span>
                <h3 className="text-xl font-bold text-red-800 dark:text-red-200">
                  CRITICAL: Secret Compromised!
                </h3>
              </div>
              <div className="space-y-3">
                <p className="text-red-700 dark:text-red-300 font-medium">
                  Your JWT secret was successfully cracked in seconds. This is a critical security vulnerability.
                </p>
                <div className="bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded p-3">
                  <div className="text-sm text-red-700 dark:text-red-400 mb-2">
                    <span className="font-medium">Cracked Secret:</span>
                  </div>
                  <div className="font-mono text-lg bg-red-200 dark:bg-red-900/70 p-3 rounded border border-red-400 dark:border-red-600 text-red-900 dark:text-red-200 break-all">
                    "{crackedSecret.secret}"
                  </div>
                  {crackedSecret.hash && (
                    <div className="mt-3">
                      <div className="text-sm text-red-700 dark:text-red-400 mb-1">
                        <span className="font-medium">SHA256 Hash:</span>
                      </div>
                      <div className="font-mono text-xs bg-red-200 dark:bg-red-900/70 p-2 rounded border border-red-400 dark:border-red-600 text-red-800 dark:text-red-300 break-all">
                        {crackedSecret.hash}
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded p-3">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    🚀 Immediate Actions Required:
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• <strong>Rotate secret immediately</strong> - Use a cryptographically random 256+ bit secret</li>
                    <li>• <strong>Invalidate all existing tokens</strong> signed with this secret</li>
                    <li>• <strong>Review access logs</strong> for potential unauthorized token use</li>
                    <li>• <strong>Consider asymmetric signing</strong> (RS256/ES256) for better security</li>
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(crackedSecret.secret)}
              className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors"
              title="Copy secret to clipboard"
            >
              Copy Secret
            </button>
          </div>
        </div>
      )}

      {/* Issues and Recommendations */}
      {issues.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Issues & Recommendations
          </h3>
          
          <div className="space-y-4">
            {issues.map((issue, index) => (
              <div 
                key={index}
                className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <span className="mr-2">{getSeverityIcon(issue.severity)}</span>
                    <span className={`font-semibold text-sm ${getSeverityTextColor(issue.severity)}`}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <span className="ml-2 text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                      {issue.category}
                    </span>
                  </div>
                </div>
                
                <h4 className={`font-medium mb-2 ${getSeverityTextColor(issue.severity)}`}>
                  {issue.issue}
                </h4>
                
                <div className="mb-3">
                  <p className={`text-sm ${getSeverityTextColor(issue.severity)} opacity-90`}>
                    <strong>Impact:</strong> {issue.impact}
                  </p>
                </div>
                
                <div className={`bg-white dark:bg-gray-800 border border-opacity-50 rounded p-3 
                               ${issue.severity === 'Critical' ? 'border-red-300 dark:border-red-700' : 
                                 issue.severity === 'High' ? 'border-orange-300 dark:border-orange-700' :
                                 issue.severity === 'Medium' ? 'border-yellow-300 dark:border-yellow-700' :
                                 'border-blue-300 dark:border-blue-700'}`}>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>✅ Recommendation:</strong> {issue.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                No Issues Found
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Your JWT follows security best practices. Great job!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Token Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Token Analysis Details
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Header */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Header</h4>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm overflow-x-auto">
              <code className="text-gray-800 dark:text-gray-200">
                {JSON.stringify(decoded.header, null, 2)}
              </code>
            </pre>
          </div>

          {/* Payload */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Payload</h4>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm overflow-x-auto">
              <code className="text-gray-800 dark:text-gray-200">
                {JSON.stringify(decoded.payload, null, 2)}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ScanResults }