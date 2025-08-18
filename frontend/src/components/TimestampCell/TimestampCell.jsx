import { useState } from 'react'

const TIMESTAMP_FIELDS = {
  'iat': 'Issued At',
  'exp': 'Expires At',
  'nbf': 'Not Before',
  'auth_time': 'Authentication Time',
  'updated_at': 'Updated At',
  'created_at': 'Created At',
  'refresh_token_expires_at': 'Refresh Token Expires At'
}

function TimestampCell({ value, fieldName }) {
  const [showHumanTime, setShowHumanTime] = useState(false)

  // Validate if it's a reasonable timestamp (between 2000 and 2100)
  const isValidTimestamp = (timestamp) => {
    const ts = Number(timestamp)
    return !isNaN(ts) && ts > 946684800 && ts < 4102444800 // Jan 1, 2000 to Jan 1, 2100
  }

  // If not a valid timestamp, show as regular value
  if (!isValidTimestamp(value)) {
    return (
      <span className="font-mono text-gray-700 dark:text-gray-300">
        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
      </span>
    )
  }

  const timestamp = Number(value)
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  
  const isExpired = diffMs < 0
  const isExpiringSoon = diffMs > 0 && diffMs < (15 * 60 * 1000) // 15 minutes
  
  // Format relative time
  const getRelativeTime = () => {
    if (Math.abs(diffMinutes) < 60) {
      return diffMinutes > 0 
        ? `in ${diffMinutes} min${diffMinutes !== 1 ? 's' : ''}` 
        : `${Math.abs(diffMinutes)} min${diffMinutes !== -1 ? 's' : ''} ago`
    } else if (Math.abs(diffHours) < 24) {
      return diffHours > 0 
        ? `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}` 
        : `${Math.abs(diffHours)} hour${diffHours !== -1 ? 's' : ''} ago`
    } else {
      return diffDays > 0 
        ? `in ${diffDays} day${diffDays !== 1 ? 's' : ''}` 
        : `${Math.abs(diffDays)} day${diffDays !== -1 ? 's' : ''} ago`
    }
  }

  // Get status styling
  const getStatusStyling = () => {
    if (fieldName === 'exp' && isExpired) {
      return 'text-red-600 dark:text-red-400'
    } else if (fieldName === 'exp' && isExpiringSoon) {
      return 'text-yellow-600 dark:text-yellow-400'
    } else if (fieldName === 'nbf' && diffMs > 0) {
      return 'text-yellow-600 dark:text-yellow-400' // Not yet valid
    }
    return 'text-green-600 dark:text-green-400'
  }

  // Get status icon
  const getStatusIcon = () => {
    if (fieldName === 'exp' && (isExpired || isExpiringSoon)) {
      return <span className="ml-1 text-sm">⚠️</span>
    }
    return <span className="ml-1 text-sm">🕒</span>
  }

  const handleToggle = () => {
    setShowHumanTime(!showHumanTime)
  }

  return (
    <div className="font-mono">
      <button
        onClick={handleToggle}
        className="group flex items-start text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer"
        title={`Click to ${showHumanTime ? 'show timestamp' : 'show human time'}`}
      >
        <div className="flex flex-col">
          {showHumanTime ? (
            <>
              <span className={`text-sm ${getStatusStyling()}`}>
                {date.toLocaleString()}
                {getStatusIcon()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getRelativeTime()}
                {TIMESTAMP_FIELDS[fieldName] && (
                  <span className="ml-2">({TIMESTAMP_FIELDS[fieldName]})</span>
                )}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Unix: {value}
              </span>
            </>
          ) : (
            <>
              <span className="text-gray-700 dark:text-gray-300">
                {value}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                Click to show human time
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  )
}

export default TimestampCell