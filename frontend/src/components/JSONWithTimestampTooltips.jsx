import { useState, useEffect, useMemo, useRef } from 'react'

function JSONWithTimestampTooltips({ data, editedData, onChange, onBlur, readOnly = false }) {
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef(null)

  const claimHints = useMemo(() => ({
    alg: 'Algorithm used to sign the token',
    typ: 'Type of token (typically "JWT")',
    kid: 'Key ID (identifies the signing key)',
    cty: 'Content type (used for nested JWTs)',
    crit: 'Critical header parameters that must be understood',
    x5u: 'X.509 certificate URL',
    x5t: 'X.509 certificate thumbprint',
    x5c: 'X.509 certificate chain',
    iss: 'Issuer (who created and signed the token)',
    sub: 'Subject (whom the token refers to)',
    aud: 'Audience (intended recipient)',
    exp: 'Expiration time (seconds since Unix epoch)',
    nbf: 'Not before (seconds since Unix epoch)',
    iat: 'Issued at (seconds since Unix epoch)',
    jti: 'JWT ID (unique identifier)',
    nonce: 'Nonce (unique value to associate a session)',
    azp: 'Authorized party (client id)',
    sid: 'Session ID',
    scope: 'Authorized scope for the subject',
    roles: 'Roles granted to the subject',
    role: 'Role granted to the subject',
    auth_time: 'Time of authentication (seconds since Unix epoch)',
    updated_at: 'Last update time (seconds since Unix epoch)',
    created_at: 'Creation time (seconds since Unix epoch)',
    refresh_token_expires_at: 'Refresh token expiration time (seconds since Unix epoch)',
    eat: 'Expiration time (seconds since Unix epoch)'
  }), [])

  const timestampKeys = useMemo(() => new Set([
    'iat',
    'exp',
    'nbf',
    'auth_time',
    'updated_at',
    'created_at',
    'refresh_token_expires_at',
    'eat'
  ]), [])

  useEffect(() => {
    if (readOnly) {
      setIsEditing(false)
      return
    }
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [readOnly, isEditing])

  const isTimestamp = (value) => {
    const num = Number(value)
    if (Number.isNaN(num)) return false
    return num > 946684800 && num < 4102444800
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(Number(timestamp) * 1000)
    return date.toString()
  }

  const showTooltip = (content, event) => {
    setTooltip({ show: true, content, x: event.clientX, y: event.clientY })
  }

  const moveTooltip = (event) => {
    setTooltip((prev) => (prev.show ? { ...prev, x: event.clientX, y: event.clientY } : prev))
  }

  const hideTooltip = () => {
    setTooltip({ show: false, content: '', x: 0, y: 0 })
  }

  const getKeyHint = (key) => {
    if (!key) return ''
    return claimHints[key.toLowerCase()] || ''
  }

  const getTimestampHint = (keyName, value) => {
    if (!keyName) return ''
    const normalizedKey = keyName.toLowerCase()
    if (!timestampKeys.has(normalizedKey)) return ''
    if (!isTimestamp(value)) return ''
    return formatTimestamp(value)
  }

  const isJsonValid = (value) => {
    if (!value || !value.trim()) return false
    try {
      JSON.parse(value)
      return true
    } catch (error) {
      return false
    }
  }

  const parsedData = useMemo(() => {
    const trimmed = editedData?.trim()
    if (trimmed) {
      try {
        return JSON.parse(trimmed)
      } catch (error) {
        return null
      }
    }
    return data || null
  }, [editedData, data])

  const tooltipHandlers = (content) => {
    if (!content) return {}
    return {
      onMouseEnter: (event) => showTooltip(content, event),
      onMouseMove: moveTooltip,
      onMouseLeave: hideTooltip
    }
  }

  const renderValue = (value, keyName, depth) => {
    if (value === null) {
      return <span className="text-gray-400">null</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>
      return (
        <>
          {'['}
          {value.map((item, index) => (
            <span key={`${depth}-arr-${index}`}>
              {'\n'}
              {'  '.repeat(depth + 1)}
              {renderValue(item, null, depth + 1)}
              {index < value.length - 1 ? ',' : ''}
            </span>
          ))}
          {'\n'}
          {'  '.repeat(depth)}
          {']'}
        </>
      )
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value)
      if (entries.length === 0) return <span>{'{}'}</span>
      return (
        <>
          {'{'}
          {entries.map(([key, nestedValue], index) => {
            const hint = getKeyHint(key)
            const keyClasses = hint
              ? 'json-key cursor-help border-b border-dotted border-blue-400/70 dark:border-blue-300/70'
              : 'json-key'
            return (
              <span key={`${depth}-${key}`}>
                {'\n'}
                {'  '.repeat(depth + 1)}
                <span className={keyClasses} {...tooltipHandlers(hint)}>
                  {JSON.stringify(key)}
                </span>
                {': '}
                {renderValue(nestedValue, key, depth + 1)}
                {index < entries.length - 1 ? ',' : ''}
              </span>
            )
          })}
          {'\n'}
          {'  '.repeat(depth)}
          {'}'}
        </>
      )
    }

    if (typeof value === 'string') {
      const hint = getTimestampHint(keyName, value)
      const valueClasses = hint
        ? 'json-string cursor-help border-b border-dotted border-amber-400/70 dark:border-amber-300/70'
        : 'json-string'
      return (
        <span className={valueClasses} {...tooltipHandlers(hint)}>
          {JSON.stringify(value)}
        </span>
      )
    }

    if (typeof value === 'number') {
      const hint = getTimestampHint(keyName, value)
      const valueClasses = hint
        ? 'json-number cursor-help border-b border-dotted border-amber-400/70 dark:border-amber-300/70'
        : 'json-number'
      return (
        <span className={valueClasses} {...tooltipHandlers(hint)}>
          {String(value)}
        </span>
      )
    }

    if (typeof value === 'boolean') {
      return <span className="json-boolean">{String(value)}</span>
    }

    return <span className="text-gray-400">{String(value)}</span>
  }

  if (readOnly || !isEditing) {
    return (
      <div className="relative">
        <div
          className={`w-full h-32 p-3 font-mono text-sm bg-transparent overflow-auto whitespace-pre text-gray-700 dark:text-gray-300 ${
            readOnly ? '' : 'cursor-text'
          }`}
          onClick={readOnly ? undefined : () => setIsEditing(true)}
          onKeyDown={
            readOnly
              ? undefined
              : (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setIsEditing(true)
                  }
                }
          }
          role={readOnly ? undefined : 'button'}
          tabIndex={readOnly ? undefined : 0}
          aria-label={readOnly ? undefined : 'Edit JSON'}
        >
          {parsedData ? renderValue(parsedData, null, 0) : (editedData || '')}
        </div>

        {tooltip.show && (
          <div
            className="fixed z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded shadow-lg pointer-events-none max-w-xs"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 40
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>
    )
  }

  const handleBlur = (event) => {
    if (onBlur) {
      onBlur(event)
    }
    if (isJsonValid(editedData)) {
      setIsEditing(false)
    }
  }

  return (
    <textarea
      ref={textareaRef}
      value={editedData}
      onChange={onChange}
      onBlur={handleBlur}
      className="w-full h-32 p-3 font-mono text-sm bg-transparent border-0 focus:ring-0 resize-none"
      spellCheck={false}
      placeholder="Edit JSON here..."
    />
  )

}

export default JSONWithTimestampTooltips
