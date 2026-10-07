import { useEffect, useState } from 'react'

const severities = ['Critical', 'High', 'Medium', 'Low', 'Info']

const StatusIcon = ({ kind = 'alert' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {kind === 'check' ? <path d="M20 6 9 17l-5-5" /> : <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></>}
  </svg>
)

const ScanResults = ({ results }) => {
  const { issues, decoded, timestamp, crackedSecret } = results
  const [secretCopied, setSecretCopied] = useState(false)

  useEffect(() => {
    if (!secretCopied) return undefined
    const timer = setTimeout(() => setSecretCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [secretCopied])

  const copySecret = async () => {
    await navigator.clipboard.writeText(crackedSecret.secret)
    setSecretCopied(true)
  }

  return (
    <div className="scanner-results">
      <section className="scanner-results-summary">
        <div className="scanner-results-title">
          <div><span className="scanner-eyebrow">SCAN COMPLETE</span><h2>Findings overview</h2></div>
          <time dateTime={timestamp}>{new Date(timestamp).toLocaleString()}</time>
        </div>
        <div className="scanner-severity-grid">
          {severities.map((severity) => (
            <div key={severity} className={`scanner-severity-stat severity-${severity.toLowerCase()}`}>
              <span className="scanner-severity-dot" aria-hidden="true" />
              <strong>{issues.filter((issue) => issue.severity === severity).length}</strong>
              <span>{severity}</span>
            </div>
          ))}
        </div>
      </section>

      {crackedSecret && (
        <section className="scanner-secret-alert">
          <div className="scanner-alert-heading">
            <span className="scanner-alert-icon"><StatusIcon /></span>
            <div><span className="scanner-eyebrow">CRITICAL FINDING</span><h2>Signing secret compromised</h2></div>
            <button type="button" onClick={copySecret} className="scanner-copy-secret">
              {secretCopied ? <><StatusIcon kind="check" />Copied</> : <><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>Copy secret</>}
            </button>
          </div>
          <p>The HMAC signing secret was recovered from the wordlist. Anyone with this value can forge trusted tokens.</p>
          <div className="scanner-secret-value"><span>RECOVERED SECRET</span><code>{crackedSecret.secret}</code></div>
          {crackedSecret.hash && <div className="scanner-secret-hash"><span>SHA-256</span><code>{crackedSecret.hash}</code></div>}
          <div className="scanner-remediation-list">
            <h3>Immediate response</h3>
            <ol>
              <li><span>01</span><p><strong>Rotate the secret</strong>Use a cryptographically random value of at least 256 bits.</p></li>
              <li><span>02</span><p><strong>Invalidate existing tokens</strong>Reject every token signed with the compromised key.</p></li>
              <li><span>03</span><p><strong>Review access logs</strong>Look for forged or unexpected token usage.</p></li>
              <li><span>04</span><p><strong>Consider asymmetric signing</strong>Use RS256, PS256, or ES256 when services should not share signing authority.</p></li>
            </ol>
          </div>
        </section>
      )}

      {issues.length > 0 ? (
        <section className="scanner-findings-card">
          <div className="scanner-card-heading"><div><span className="scanner-eyebrow">DETAILED ANALYSIS</span><h2>Issues and recommendations</h2></div><span>{issues.length} finding{issues.length === 1 ? '' : 's'}</span></div>
          <div className="scanner-findings-list">
            {issues.map((issue, index) => (
              <article key={`${issue.category}-${issue.issue}-${index}`} className={`scanner-finding severity-${issue.severity.toLowerCase()}`}>
                <div className="scanner-finding-marker"><span>{String(index + 1).padStart(2, '0')}</span></div>
                <div className="scanner-finding-body">
                  <div className="scanner-finding-meta"><span className="scanner-severity-pill">{issue.severity}</span><span>{issue.category}</span></div>
                  <h3>{issue.issue}</h3>
                  <div className="scanner-finding-copy"><p><strong>Impact</strong>{issue.impact}</p><p><strong>Recommendation</strong>{issue.recommendation}</p></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="scanner-clean-result"><span><StatusIcon kind="check" /></span><div><h2>No issues found</h2><p>The token passed every offline check available to this scanner.</p></div></section>
      )}

      <section className="scanner-token-details">
        <div className="scanner-card-heading"><div><span className="scanner-eyebrow">DECODED CONTENT</span><h2>Token analysis details</h2></div></div>
        <div className="scanner-json-grid">
          <div><h3>Header</h3><pre><code>{JSON.stringify(decoded.header, null, 2)}</code></pre></div>
          <div><h3>Payload</h3><pre><code>{JSON.stringify(decoded.payload, null, 2)}</code></pre></div>
        </div>
      </section>
    </div>
  )
}

export { ScanResults }
