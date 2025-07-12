import { useState, useEffect } from 'react'
import { SecurityGauge } from './SecurityGauge'
import { RiskGauge } from './RiskGauge'
import { ScanResults } from './ScanResults'
import { ScannerInput } from './ScannerInput'

const API_BASE = import.meta.env.VITE_BACKEND_URL || '/api'

const ScannerPage = ({ token: initialToken = '', setToken: setAppToken }) => {
  const [scanToken, setScanToken] = useState(initialToken)
  const [scanResults, setScanResults] = useState(null)
  const [isScanning, setIsScanning] = useState(false)

  // Update local token when prop changes
  useEffect(() => {
    setScanToken(initialToken)
  }, [initialToken])

  const attemptSecretCrack = async (token) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Secret cracking timeout'))
      }, 10000) // 10 second timeout for quick scan

      fetch(`${API_BASE}/crack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.body.getReader()
      })
      .then(reader => {
        const decoder = new TextDecoder()
        
        const processStream = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              clearTimeout(timeout)
              resolve(null) // No secret found
              return
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)

                if (data.startsWith('RESULT ')) {
                  clearTimeout(timeout)
                  const result = JSON.parse(data.replace('RESULT ', ''))
                  resolve(result)
                  return
                } else if (data === 'DONE') {
                  clearTimeout(timeout)
                  resolve(null)
                  return
                } else if (data.startsWith('ERROR ')) {
                  clearTimeout(timeout)
                  reject(new Error(data.replace('ERROR ', '')))
                  return
                }
              }
            }

            processStream() // Continue reading
          }).catch(error => {
            clearTimeout(timeout)
            reject(error)
          })
        }

        processStream()
      })
      .catch(error => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  const decodeJWT = (token) => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format')
      }

      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      
      return { header, payload, signature: parts[2] }
    } catch (error) {
      throw new Error('Failed to decode JWT: ' + error.message)
    }
  }

  const analyzeJWT = async (decoded, token) => {
    const issues = []
    let securityScore = 100
    let riskScore = 0
    let crackedSecret = null

    // Header checks
    const alg = decoded.header.alg?.toLowerCase()
    
    if (alg === 'none') {
      issues.push({
        severity: 'Critical',
        category: 'Algorithm',
        issue: 'No signature algorithm (alg=none)',
        recommendation: 'Implement proper signing with RSA, ECDSA, or HMAC algorithms',
        impact: 'Tokens can be forged without detection'
      })
      securityScore -= 50
      riskScore += 60
    } else if (alg?.startsWith('hs')) {
      issues.push({
        severity: 'Medium',
        category: 'Algorithm',
        issue: 'HMAC signing requires shared secret management',
        recommendation: 'Consider RS256/ES256 for distributed systems or ensure robust secret management across all services',
        impact: 'Shared secret must be securely distributed and rotated across all parties'
      })
      securityScore -= 20
      riskScore += 25

      // Try to crack the HMAC secret
      try {
        crackedSecret = await attemptSecretCrack(token)
        if (crackedSecret) {
          issues.unshift({
            severity: 'Critical',
            category: 'Secret Strength',
            issue: `Weak HMAC secret cracked: "${crackedSecret.secret}"`,
            recommendation: 'Use a strong, randomly generated secret (minimum 256 bits). Rotate immediately.',
            impact: 'Anyone can forge tokens with this secret',
            crackedSecret: crackedSecret
          })
          securityScore -= 50 // Major penalty for crackable secret
          riskScore += 75
        }
      } catch (error) {
        console.log('Secret cracking failed:', error.message)
        // No additional issue needed - the HMAC warning above covers it
      }
    } else if (alg?.startsWith('rs') || alg?.startsWith('es') || alg?.startsWith('ps')) {
      // This is good - asymmetric signing
      securityScore += 0 // No penalty
    } else if (alg) {
      issues.push({
        severity: 'Medium',
        category: 'Algorithm',
        issue: `Unknown or uncommon algorithm: ${alg}`,
        recommendation: 'Use standard algorithms like RS256, ES256, or HS256',
        impact: 'May have unknown security vulnerabilities'
      })
      securityScore -= 15
      riskScore += 20
    }

    // Payload checks
    const payload = decoded.payload

    // Check for missing essential claims
    if (!payload.iat && !payload.nbf) {
      issues.push({
        severity: 'Medium',
        category: 'Claims',
        issue: 'Missing timestamp validation (iat or nbf)',
        recommendation: 'Add "iat" (issued at) or "nbf" (not before) claim for token freshness validation',
        impact: 'Cannot verify token age or detect replay attacks effectively'
      })
      securityScore -= 15
      riskScore += 20
    }

    // Context-aware expiration check
    if (!payload.exp) {
      const severity = (!payload.iat && !payload.nbf) ? 'Critical' : 'High'
      const scoreReduction = severity === 'Critical' ? 40 : 30
      const riskIncrease = severity === 'Critical' ? 45 : 35
      
      issues.push({
        severity: severity,
        category: 'Claims',
        issue: severity === 'Critical' ? 
          'Missing expiration and timestamp validation - tokens never expire and have no time constraints' :
          'Missing expiration (exp) claim',
        recommendation: 'Add "exp" claim with appropriate expiration time (recommended: 15 minutes to 24 hours depending on use case)',
        impact: severity === 'Critical' ? 
          'Tokens never expire and have no temporal security controls' :
          'Tokens never expire, creating security risk'
      })
      securityScore -= scoreReduction
      riskScore += riskIncrease
    }

    // Check for sensitive data in payload
    const sensitiveFields = ['password', 'secret', 'key', 'token', 'ssn', 'social_security', 'credit_card', 'cc_number']
    const foundSensitive = []
    
    const checkForSensitive = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key
        const lowerKey = key.toLowerCase()
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          foundSensitive.push(fullPath)
        }
        
        if (typeof value === 'object' && value !== null) {
          checkForSensitive(value, fullPath)
        }
      }
    }

    checkForSensitive(payload)

    if (foundSensitive.length > 0) {
      issues.push({
        severity: 'Critical',
        category: 'Data Exposure',
        issue: `Sensitive data found in payload: ${foundSensitive.join(', ')}`,
        recommendation: 'Remove sensitive information from JWT payload. Store in secure server-side session instead',
        impact: 'Sensitive data is exposed and can be read by anyone with the token'
      })
      securityScore -= 40
      riskScore += 50
    }

    // Additional security checks - More realistic severity
    if (!payload.aud) {
      issues.push({
        severity: 'Low',
        category: 'Claims',
        issue: 'Missing audience (aud) claim',
        recommendation: 'Add "aud" claim to specify intended token recipient (recommended for multi-service environments)',
        impact: 'Tokens may be misused by unintended parties in distributed systems'
      })
      securityScore -= 8 // Reduced penalty
      riskScore += 8
    }

    if (!payload.iss) {
      issues.push({
        severity: 'Low',
        category: 'Claims',
        issue: 'Missing issuer (iss) claim',
        recommendation: 'Add "iss" claim to identify token issuer (improves auditability)',
        impact: 'Cannot verify token origin or trace token lifecycle'
      })
      securityScore -= 5
      riskScore += 5
    }

    // Ensure scores are within bounds
    securityScore = Math.max(0, Math.min(100, securityScore))
    riskScore = Math.max(0, Math.min(100, riskScore))

    return {
      securityScore,
      riskScore,
      crackedSecret,
      issues: issues.sort((a, b) => {
        const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
    }
  }

  const handleScan = async () => {
    if (!scanToken.trim()) {
      return
    }

    setIsScanning(true)
    
    try {
      // Simulate scanning delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const decoded = decodeJWT(scanToken)
      const analysis = await analyzeJWT(decoded, scanToken)
      
      setScanResults({
        ...analysis,
        decoded,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setScanResults({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsScanning(false)
    }
  }

  const generatePDFReport = () => {
    if (!scanResults || scanResults.error) {
      alert('No scan results available to download')
      return
    }

    const { securityScore, riskScore, issues, decoded, timestamp, crackedSecret } = scanResults
    
    // Create PDF content as HTML string
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JWT Security Scan Report</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2563eb; 
            margin-bottom: 10px;
        }
        .scan-date { 
            color: #666; 
            font-size: 14px;
        }
        .scores {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            gap: 20px;
        }
        .score-card {
            flex: 1;
            text-align: center;
            padding: 20px;
            border: 2px solid;
            border-radius: 8px;
        }
        .security-card {
            border-color: #10b981;
            background-color: #f0fdf4;
        }
        .risk-card {
            border-color: #ef4444;
            background-color: #fef2f2;
        }
        .score {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
        }
        .security-score {
            color: #059669;
        }
        .risk-score {
            color: #dc2626;
        }
        .critical-alert {
            background-color: #fef2f2;
            border: 2px solid #ef4444;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .critical-title {
            color: #dc2626;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .cracked-secret {
            background-color: #fee2e2;
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            word-break: break-all;
            margin: 10px 0;
        }
        .issues-section {
            margin: 30px 0;
        }
        .issue {
            margin: 20px 0;
            padding: 15px;
            border-left: 4px solid;
            border-radius: 4px;
        }
        .critical { 
            border-color: #dc2626; 
            background-color: #fef2f2;
        }
        .high { 
            border-color: #f59e0b; 
            background-color: #fffbeb;
        }
        .medium { 
            border-color: #eab308; 
            background-color: #fefce8;
        }
        .low { 
            border-color: #3b82f6; 
            background-color: #eff6ff;
        }
        .issue-header {
            font-weight: bold;
            margin-bottom: 8px;
        }
        .severity {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 10px;
        }
        .severity.critical { 
            background-color: #dc2626; 
            color: white;
        }
        .severity.high { 
            background-color: #f59e0b; 
            color: white;
        }
        .severity.medium { 
            background-color: #eab308; 
            color: white;
        }
        .severity.low { 
            background-color: #3b82f6; 
            color: white;
        }
        .recommendation {
            background-color: #f8fafc;
            padding: 10px;
            border-radius: 4px;
            margin-top: 8px;
        }
        .token-details {
            margin: 30px 0;
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
        }
        .token-section {
            margin: 15px 0;
        }
        .token-content {
            background-color: #1f2937;
            color: #f9fafb;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .summary {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🔍 JWT Security Scanner Report</div>
        <div>Comprehensive Security Analysis</div>
        <div class="scan-date">Generated: ${new Date(timestamp).toLocaleString()}</div>
    </div>

    <div class="scores">
        <div class="score-card security-card">
            <h3>Security Level</h3>
            <div class="score security-score">${Math.round(securityScore)}%</div>
            <div>${getSecurityLevel(securityScore)}</div>
        </div>
        <div class="score-card risk-card">
            <h3>Risk Level</h3>
            <div class="score risk-score">${Math.round(riskScore)}%</div>
            <div>${getRiskLevel(riskScore)}</div>
        </div>
    </div>

    ${crackedSecret ? `
    <div class="critical-alert">
        <div class="critical-title">🚨 CRITICAL: Secret Compromised!</div>
        <p>Your JWT secret was successfully cracked during analysis. This represents a critical security vulnerability that requires immediate attention.</p>
        <div class="cracked-secret">
            <strong>Cracked Secret:</strong> "${crackedSecret.secret}"
            ${crackedSecret.hash ? `<br><strong>SHA256 Hash:</strong> ${crackedSecret.hash}` : ''}
        </div>
        <p><strong>Immediate Actions Required:</strong></p>
        <ul>
            <li>Rotate secret immediately using a cryptographically random 256+ bit secret</li>
            <li>Invalidate all existing tokens signed with this secret</li>
            <li>Review access logs for potential unauthorized token use</li>
            <li>Consider asymmetric signing (RS256/ES256) for better security</li>
        </ul>
    </div>
    ` : ''}

    <div class="summary">
        <h3>Executive Summary</h3>
        <p><strong>Issues Found:</strong> ${issues.length} total security issues</p>
        <ul>
            <li>Critical: ${issues.filter(i => i.severity === 'Critical').length}</li>
            <li>High: ${issues.filter(i => i.severity === 'High').length}</li>
            <li>Medium: ${issues.filter(i => i.severity === 'Medium').length}</li>
            <li>Low: ${issues.filter(i => i.severity === 'Low').length}</li>
        </ul>
        ${crackedSecret ? 
          '<p><strong>⚠️ Critical Finding:</strong> Weak HMAC secret successfully cracked - immediate remediation required.</p>' :
          '<p><strong>Secret Analysis:</strong> No weak secrets detected during automated testing.</p>'
        }
    </div>

    <div class="issues-section">
        <h2>Detailed Security Issues & Recommendations</h2>
        ${issues.length > 0 ? issues.map(issue => `
            <div class="issue ${issue.severity.toLowerCase()}">
                <div class="issue-header">
                    <span class="severity ${issue.severity.toLowerCase()}">${issue.severity}</span>
                    ${issue.category} - ${issue.issue}
                </div>
                <div><strong>Impact:</strong> ${issue.impact}</div>
                <div class="recommendation">
                    <strong>💡 Recommendation:</strong> ${issue.recommendation}
                </div>
            </div>
        `).join('') : '<p>✅ No security issues detected. Your JWT follows security best practices!</p>'}
    </div>

    <div class="token-details">
        <h2>Token Analysis Details</h2>
        <div class="token-section">
            <h3>Header</h3>
            <div class="token-content">${JSON.stringify(decoded.header, null, 2)}</div>
        </div>
        <div class="token-section">
            <h3>Payload</h3>
            <div class="token-content">${JSON.stringify(decoded.payload, null, 2)}</div>
        </div>
    </div>

    <div class="footer">
        <p>Generated by JWT Security Scanner - Exploit-Forge LTD</p>
        <p>This report contains security analysis performed on ${new Date(timestamp).toLocaleDateString()}</p>
        <p>⚠️ This report may contain sensitive information. Handle with appropriate security measures.</p>
    </div>
</body>
</html>`

    // Create blob and download
    const blob = new Blob([pdfContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jwt-security-report-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getSecurityLevel = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 50) return 'Fair'
    if (score >= 30) return 'Poor'
    return 'Critical'
  }

  const getRiskLevel = (score) => {
    if (score >= 80) return 'Critical'
    if (score >= 60) return 'High'
    if (score >= 40) return 'Medium'
    if (score >= 20) return 'Low'
    return 'Minimal'
  }

  const handleTokenChange = (newToken) => {
    setScanToken(newToken)
    // Also update the app-level token if the setter is provided
    if (setAppToken) {
      setAppToken(newToken)
    }
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          JWT Security Scanner
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto px-2">
          Comprehensive security analysis of JWT tokens including algorithm validation, 
          claims verification, and sensitive data detection.
        </p>
      </div>

      {/* Scanner Input */}
      <div className="mb-6 sm:mb-8">
        <ScannerInput 
          token={scanToken}
          onTokenChange={handleTokenChange}
          onScan={handleScan}
          isScanning={isScanning}
        />
      </div>

      {/* Results */}
      {scanResults && (
        <div className="space-y-6 sm:space-y-8">
          {scanResults.error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Scan Error
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm sm:text-base">{scanResults.error}</p>
            </div>
          ) : (
            <>
              {/* Gauges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                <SecurityGauge score={scanResults.securityScore} />
                <RiskGauge score={scanResults.riskScore} />
              </div>

              {/* Detailed Results */}
              <ScanResults results={scanResults} />

              {/* Download Report Button */}
              {!scanResults.error && (
                <div className="flex justify-center mt-6 sm:mt-8 px-4">
                  <button
                    onClick={generatePDFReport}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 sm:py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm text-base min-h-[48px] touch-manipulation"
                  >
                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="whitespace-nowrap">Download Scan Report</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ScannerPage