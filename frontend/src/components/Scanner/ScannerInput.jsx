const scanChecks = [
  'Algorithm and signature structure',
  'Claim types, timing, and lifetime',
  'Remote key and kid abuse indicators',
  'Sensitive data and PII exposure',
  'Weak HMAC signing secrets',
  'Replay and interoperability risks',
]

const ScannerInput = ({ token, onTokenChange, onScan, isScanning }) => {
  const trimmedToken = token.trim()
  const hasValidShape = trimmedToken && trimmedToken.split('.').length === 3

  return (
    <section className="scanner-workspace" aria-labelledby="scanner-workspace-title">
      <div className="scanner-editor-column">
        <div className="scanner-section-heading">
          <div>
            <span className="scanner-eyebrow">TOKEN INPUT</span>
            <h2 id="scanner-workspace-title">JWT to scan</h2>
          </div>
          <span className="scanner-local-badge"><span aria-hidden="true" /> Local analysis</span>
        </div>

        <div className="scanner-editor-shell">
          <div className="scanner-editor-toolbar">
            <div className="scanner-editor-title">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3 4 7l4 4M16 3l4 4-4 4M14 2l-4 10" /></svg>
              JSON Web Token
            </div>
            <span>HEADER · PAYLOAD · SIGNATURE</span>
          </div>
          <textarea
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder="Paste a signed JWT to begin the security scan…"
            className="scanner-token-input"
            disabled={isScanning}
            spellCheck="false"
            aria-label="JWT token to scan"
          />
        </div>

        <div className="scanner-token-meta" aria-live="polite">
          <span>{trimmedToken ? `${token.length.toLocaleString()} characters` : 'Waiting for a token'}</span>
          {trimmedToken && (
            <span className={hasValidShape ? 'scanner-format-valid' : 'scanner-format-invalid'}>
              {hasValidShape
                ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg>
                : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8m0-8-8 8" /></svg>}
              {hasValidShape ? 'Valid JWT structure' : 'Invalid JWT structure'}
            </span>
          )}
        </div>
      </div>

      <aside className="scanner-summary" aria-label="Security scan coverage">
        <div className="scanner-summary-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <span className="scanner-eyebrow">SECURITY COVERAGE</span>
        <h2>Inspect the complete token.</h2>
        <p>Run a focused, local assessment before trusting a JWT implementation.</p>

        <ul className="scanner-check-list">
          {scanChecks.map((check) => (
            <li key={check}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" /></svg>
              {check}
            </li>
          ))}
        </ul>

        <button type="button" onClick={onScan} disabled={!hasValidShape || isScanning} className="scanner-action-button">
          {isScanning ? (
            <><svg className="scanner-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M21 12a9 9 0 0 0-9-9" /></svg>Scanning token…</>
          ) : (
            <><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h5M5 5v5M19 5h-5M19 5v5M5 19h5M5 19v-5M19 19h-5M19 19v-5" /><circle cx="12" cy="12" r="2.5" /></svg>Run security scan</>
          )}
        </button>
        <p className="scanner-privacy-note">Your token is processed locally and is never stored.</p>
      </aside>
    </section>
  )
}

export { ScannerInput }
