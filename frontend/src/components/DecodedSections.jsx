import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''

function DecodedSection({ title, subtitle, data, colorClass, onEdit, editable = true }) {
  const [activeTab, setActiveTab] = useState('json')
  const [editedData, setEditedData] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  useEffect(() => {
    setEditedData(data ? JSON.stringify(data, null, 2) : '')
  }, [data])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedData).then(() => {
      setCopyStatus('Copied!')
      setTimeout(() => setCopyStatus(''), 2000)
    })
  }

  const renderClaimsTable = () => {
    if (!data || typeof data !== 'object') return null

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(data).map(([key, value]) => (
              <tr key={key} className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-2 pr-4 font-mono text-purple-600 dark:text-purple-400">{key}</td>
                <td className="py-2 font-mono text-gray-700 dark:text-gray-300">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-3 border-b border-gray-200 dark:border-gray-700 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Copy"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Expand"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex mt-3 -mb-px">
          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'json' 
                ? 'text-gray-900 dark:text-white border-gray-900 dark:border-white' 
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'claims' 
                ? 'text-gray-900 dark:text-white border-gray-900 dark:border-white' 
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            CLAIMS TABLE
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900">
        {activeTab === 'json' ? (
          <textarea
            value={editedData}
            onChange={(e) => {
              setEditedData(e.target.value)
              if (onEdit) {
                try {
                  const parsed = JSON.parse(e.target.value)
                  onEdit(parsed)
                } catch (e) {
                  // Invalid JSON, don't update
                }
              }
            }}
            readOnly={!editable}
            className={`w-full h-32 p-3 font-mono text-sm bg-transparent border-0 focus:ring-0 resize-none ${
              !editable ? 'cursor-default' : ''
            }`}
            spellCheck={false}
          />
        ) : (
          <div className="min-h-[8rem]">
            {renderClaimsTable()}
          </div>
        )}
        {copyStatus && (
          <div className="absolute top-2 right-2 text-xs text-green-600 dark:text-green-400">
            {copyStatus}
          </div>
        )}
      </div>
    </div>
  )
}

function DecodedSections({ token }) {
  const [header, setHeader] = useState(null)
  const [payload, setPayload] = useState(null)
  const [signature, setSignature] = useState('')
  const [algorithm, setAlgorithm] = useState('HS256')
  const [secret, setSecret] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [encodedToken, setEncodedToken] = useState('')

  // Decode token whenever it changes
  useEffect(() => {
    if (token) {
      decodeToken()
    } else {
      resetFields()
    }
  }, [token])

  const resetFields = () => {
    setHeader(null)
    setPayload(null)
    setSignature('')
    setVerificationResult(null)
    setEncodedToken('')
  }

  const decodeToken = async () => {
    try {
      const response = await fetch(`${API_BASE}/decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      
      if (response.ok) {
        const data = await response.json()
        setHeader(data.header)
        setPayload(data.payload)
        setSignature(data.signature || '')
        setAlgorithm(data.header.alg || 'HS256')
      } else {
        console.error('Failed to decode token')
      }
    } catch (error) {
      console.error('Error decoding token:', error)
    }
  }

  const encodeToken = async () => {
    try {
      const headerObj = { ...header, alg: algorithm }

      const response = await fetch(`${API_BASE}/encode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: headerObj,
          payload: payload,
          secret: secret || ''
        })
      })

      if (response.ok) {
        const data = await response.json()
        setEncodedToken(data.token)
      } else {
        console.error('Failed to encode token')
      }
    } catch (error) {
      console.error('Error encoding token:', error)
    }
  }

  const verifyToken = async () => {
    if (!secret.trim()) {
      alert('Please enter a secret key')
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const response = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, secret })
      })

      const data = await response.json()
      setVerificationResult(data)
    } catch (error) {
      console.error('Error verifying token:', error)
      setVerificationResult({ valid: false, error: 'Network error' })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <DecodedSection
        title="DECODED HEADER"
        subtitle="ALGORITHM & TOKEN TYPE"
        data={header}
        colorClass="bg-gray-50 dark:bg-gray-700"
        onEdit={setHeader}
      />

      {/* Payload Section */}
      <DecodedSection
        title="DECODED PAYLOAD"
        subtitle="DATA"
        data={payload}
        colorClass="bg-gray-50 dark:bg-gray-700"
        onEdit={setPayload}
      />

      {/* Verify Signature Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            JWT SIGNATURE VERIFICATION
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            (OPTIONAL)
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Secret Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Enter the secret used to sign the JWT:
            </label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="your-256-bit-secret"
              className="w-full px-4 py-2 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Algorithm Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Algorithm
            </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
            >
              <option value="HS256">HS256</option>
              <option value="HS384">HS384</option>
              <option value="HS512">HS512</option>
              <option value="RS256">RS256</option>
              <option value="RS384">RS384</option>
              <option value="RS512">RS512</option>
              <option value="ES256">ES256</option>
              <option value="ES384">ES384</option>
              <option value="ES512">ES512</option>
              <option value="none">none</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={verifyToken}
              disabled={!token || !secret || isVerifying}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed text-sm"
            >
              {isVerifying ? 'Verifying...' : 'Verify Signature'}
            </button>
            <button
              onClick={encodeToken}
              disabled={!header || !payload}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed text-sm"
            >
              Generate Token
            </button>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <div className={`p-3 rounded-lg border text-sm ${
              verificationResult.valid
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              <div className="flex items-center space-x-2">
                {verificationResult.valid ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">
                  {verificationResult.valid ? 'Signature Verified!' : 'Invalid Signature'}
                </span>
              </div>
              {verificationResult.error && (
                <p className="mt-1 text-xs">{verificationResult.error}</p>
              )}
            </div>
          )}

          {/* Generated Token */}
          {encodedToken && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Generated Token
              </label>
              <div className="relative">
                <textarea
                  value={encodedToken}
                  readOnly
                  className="w-full h-20 p-3 font-mono text-sm bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg resize-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(encodedToken)}
                  className="absolute top-2 right-2 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DecodedSections
