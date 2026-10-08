import { useState } from 'react'
import TokenInput from './TokenInput'

const API_BASE = import.meta.env.VITE_BACKEND_URL || '/api'

function AdvancedSecurity({ token, setToken }) {
  const [playbook, setPlaybook] = useState(null)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [copiedMutationId, setCopiedMutationId] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [requestMethod, setRequestMethod] = useState('GET')
  const [bodyFormat, setBodyFormat] = useState('json')
  const [requestBody, setRequestBody] = useState('{}')
  const [customHeaders, setCustomHeaders] = useState([{ name: '', value: '' }])
  const [tokenDelivery, setTokenDelivery] = useState('authorization')
  const [customTokenParameter, setCustomTokenParameter] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [liveResults, setLiveResults] = useState(null)
  const [copiedLiveResultId, setCopiedLiveResultId] = useState('')

  const copyMutation = async (mutation) => {
    await navigator.clipboard.writeText(mutation.token)
    setCopiedMutationId(mutation.id)
    window.setTimeout(() => setCopiedMutationId((current) => current === mutation.id ? '' : current), 1800)
  }

  const copyLiveToken = async (result) => {
    await navigator.clipboard.writeText(result.token)
    setCopiedLiveResultId(result.id)
    window.setTimeout(() => setCopiedLiveResultId((current) => current === result.id ? '' : current), 1800)
  }

  const updateCustomHeader = (index, field, value) => {
    setCustomHeaders((current) => current.map((header, headerIndex) => headerIndex === index ? { ...header, [field]: value } : header))
  }

  const addCustomHeader = () => {
    setCustomHeaders((current) => current.length >= 10 ? current : [...current, { name: '', value: '' }])
  }

  const removeCustomHeader = (index) => {
    setCustomHeaders((current) => current.length === 1
      ? [{ name: '', value: '' }]
      : current.filter((_, headerIndex) => headerIndex !== index))
  }

  const request = async (path, body) => {
    setError('')
    const response = await fetch(`${API_BASE}/security/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const responseText = await response.text()
    let result
    try {
      result = responseText ? JSON.parse(responseText) : {}
    } catch {
      throw new Error(`Backend returned ${response.status} with a non-JSON response. Check the xJWT API connection.`)
    }
    if (!response.ok) throw new Error(result.error || 'Security check failed')
    return result
  }

  const runPlaybook = async () => {
    setLoading('playbook')
    try {
      const result = await request('playbook', { token })
      setPlaybook(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading('')
    }
  }

  const runLiveTest = async (event) => {
    event.preventDefault()
    setLoading('live')
    setLiveResults(null)
    try {
      const isAuthorization = tokenDelivery === 'authorization'
      setLiveResults(await request('live-test', {
        token,
        targetUrl,
        requestMethod,
        bodyFormat: requestMethod === 'POST' ? bodyFormat : undefined,
        requestBody: requestMethod === 'POST' ? requestBody : undefined,
        customHeaders: customHeaders.filter(header => header.name.trim() || header.value),
        tokenTransport: isAuthorization ? 'authorization' : 'query',
        tokenParameter: tokenDelivery === 'custom' ? customTokenParameter : tokenDelivery,
        authorized,
      }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-hero pt-8 pb-4 text-center">
        <h1 className="mb-5 text-gray-900 dark:text-white">Advanced JWT Security Testing</h1>
        <p className="text-base leading-relaxed">Generate offline probes or validate how an authorized endpoint handles them.</p>
      </div>

      <div className="workspace-intro">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Choose an offline playbook or run controlled tests against an authorized target.</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Offline playbooks never contact a target. Live tests run only when you explicitly start them.</p>
        </div>
        <span className="workspace-badge"><span className="workspace-badge-dot" /> You control every request</span>
      </div>

      <TokenInput token={token} setToken={setToken} />

      {error && <div role="alert" className="workspace-callout workspace-callout-danger text-red-700 dark:text-red-300">{error}</div>}

      <section className="workspace-card flex flex-col p-6">
        <h2 className="text-base font-semibold">Offline probe playbook</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">Prefer not to run a live test? Generate a bounded set of unsigned and claim-validation probes to review or use manually. Nothing is sent automatically.</p>
        <button disabled={!token || loading} onClick={runPlaybook} className="ghost-button mt-5 self-start px-4 py-2 text-sm">{loading === 'playbook' ? 'Generating…' : 'Generate playbook'}</button>
      </section>

      {playbook && (
        <div>
          <div className="workspace-section-head">
            <div>
              <h2>Generated probes</h2>
              <p>{playbook.mutations.length} mutation{playbook.mutations.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <section className="workspace-card p-6">
            <div className="workspace-callout workspace-callout-warn">
              These tokens are intentionally invalid or mutated. Send them only to an authorized test environment.
            </div>
            <div className="mt-4 space-y-3">
              {playbook.mutations.map(mutation => (
                <div key={mutation.id} className="workspace-subpanel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{mutation.title}</span>
                    <button
                      onClick={() => copyMutation(mutation)}
                      className={`ghost-button min-w-[4.5rem] px-2.5 py-1 text-xs ${copiedMutationId === mutation.id ? 'copy-button-success' : ''}`}
                      aria-live="polite"
                    >
                      {copiedMutationId === mutation.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <code className="mt-2.5 block break-all font-mono text-xs leading-relaxed text-gray-600 dark:text-gray-500">{mutation.token}</code>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <div>
        <div className="workspace-section-head">
          <div>
            <h2>Live endpoint testing</h2>
            <p>Verify how an authorized endpoint handles the original token and generated probes</p>
          </div>
          <span className="status-pill status-pill-info">{requestMethod}</span>
        </div>
        <section className="workspace-card live-test-card">
          <div className="live-test-intro">
            <div className="live-test-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
            </div>
            <div>
              <h3>Test a protected endpoint</h3>
              <p>xJWT sends a control request, then checks whether each invalid mutation is rejected. Choose a Bearer header or a query parameter to match the target API.</p>
            </div>
          </div>

          <form onSubmit={runLiveTest} className="live-test-form">
            <label className="live-test-field live-test-url-field">
              <span>Target URL</span>
              <input
                type="url"
                value={targetUrl}
                onChange={event => setTargetUrl(event.target.value)}
                placeholder="https://api.example.com/protected/resource"
                required
                disabled={loading === 'live'}
              />
            </label>
            <label className="live-test-field">
              <span>HTTP method</span>
              <select value={requestMethod} onChange={event => setRequestMethod(event.target.value)} disabled={loading === 'live'}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
            <label className="live-test-field">
              <span>Token delivery</span>
              <select
                value={tokenDelivery}
                onChange={event => setTokenDelivery(event.target.value)}
                disabled={loading === 'live'}
              >
                <option value="authorization">Authorization: Bearer</option>
                <option value="token">Query parameter: token</option>
                <option value="access_token">Query parameter: access_token</option>
                <option value="jwt">Query parameter: jwt</option>
                <option value="custom">Custom query parameter…</option>
              </select>
            </label>
            {requestMethod === 'POST' && (
              <>
                <label className="live-test-field">
                  <span>Body format</span>
                  <select value={bodyFormat} onChange={event => setBodyFormat(event.target.value)} disabled={loading === 'live'}>
                    <option value="json">JSON</option>
                    <option value="form">Form URL encoded</option>
                  </select>
                </label>
                <label className="live-test-field live-test-body-field">
                  <span>Request body</span>
                  <textarea
                    value={requestBody}
                    onChange={event => setRequestBody(event.target.value)}
                    placeholder={bodyFormat === 'json' ? '{\n  "amount": 1000\n}' : '{\n  "amount": "1000"\n}'}
                    spellCheck={false}
                    required
                    disabled={loading === 'live'}
                  />
                  <small>Enter a JSON object. xJWT will encode it as {bodyFormat === 'json' ? 'application/json' : 'application/x-www-form-urlencoded'}.</small>
                </label>
              </>
            )}
            {tokenDelivery === 'custom' && (
              <label className="live-test-field live-test-custom-field">
                <span>Custom parameter name</span>
                <input
                  value={customTokenParameter}
                  onChange={event => setCustomTokenParameter(event.target.value)}
                  placeholder="auth_token"
                  pattern="[A-Za-z][A-Za-z0-9_.-]{0,63}"
                  required
                  autoFocus
                  disabled={loading === 'live'}
                />
              </label>
            )}
            <fieldset className="live-test-headers">
              <div className="live-test-headers-head">
                <div>
                  <legend>Custom request headers <span>Optional</span></legend>
                  <p>Add any extra headers required by the target API.</p>
                </div>
                <button type="button" onClick={addCustomHeader} disabled={customHeaders.length >= 10 || loading === 'live'} className="live-test-add-header">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  Add header
                </button>
              </div>
              <div className="live-test-header-list">
                {customHeaders.map((header, index) => (
                  <div className="live-test-header-row" key={index}>
                    <label className="live-test-field">
                      <span>Header name</span>
                      <input value={header.name} onChange={event => updateCustomHeader(index, 'name', event.target.value)} placeholder="X-API-Key" disabled={loading === 'live'} />
                    </label>
                    <label className="live-test-field">
                      <span>Header value</span>
                      <input value={header.value} onChange={event => updateCustomHeader(index, 'value', event.target.value)} placeholder="Enter header value" disabled={loading === 'live'} />
                    </label>
                    <button type="button" onClick={() => removeCustomHeader(index)} className="live-test-remove-header" title="Remove header" aria-label={`Remove custom header ${index + 1}`} disabled={loading === 'live'}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="live-test-preview">
              <span>REQUEST PREVIEW</span>
              <code>{tokenDelivery === 'authorization'
                ? `${requestMethod} ${targetUrl || 'https://api.example.com/resource'} · Authorization: Bearer <JWT>`
                : `${requestMethod} ${targetUrl || 'https://api.example.com/resource'}${(targetUrl || '').includes('?') ? '&' : '?'}${tokenDelivery === 'custom' ? (customTokenParameter || '<parameter>') : tokenDelivery}=<JWT>`}
              </code>
            </div>
            <label className="live-test-consent">
              <input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} />
              <span>I confirm I own this target or have explicit permission to test it.{requestMethod === 'POST' ? ' I understand each probe may change target data.' : ''}</span>
            </label>
            <button type="submit" disabled={!token || !targetUrl || (tokenDelivery === 'custom' && !customTokenParameter) || !authorized || loading} className="accent-button live-test-button">
              {loading === 'live' ? (
                <><svg className="scanner-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M21 12a9 9 0 0 0-9-9" /></svg>Running live tests…</>
              ) : (
                <><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg>Run live tests</>
              )}
            </button>
          </form>
        </section>
      </div>

      {liveResults && (
        <section className="workspace-card live-results-card" aria-live="polite">
          <div className="live-results-head">
            <div>
              <span className="scanner-eyebrow">LIVE TEST COMPLETE</span>
              <h2>Endpoint validation results</h2>
              <p><code>{liveResults.method} {liveResults.target}</code> using <code>{liveResults.delivery}</code></p>
            </div>
            <div className="live-results-totals">
              <span className="status-pill status-pill-ok">{liveResults.passed} passed</span>
              <span className={`status-pill ${liveResults.failed ? 'status-pill-danger' : 'status-pill-ok'}`}>{liveResults.failed} failed</span>
            </div>
          </div>
          <div className="live-results-table-wrap">
            <table className="live-results-table">
              <thead><tr><th>Test</th><th>Expected</th><th>Response</th><th>Time</th><th>Result</th><th><span className="sr-only">Copy token</span></th></tr></thead>
              <tbody>
                {liveResults.results.map(result => (
                  <tr key={result.id}>
                    <td><strong>{result.title}</strong><span>{result.kind === 'control' ? 'Baseline control' : 'Security probe'}</span></td>
                    <td>{result.kind === 'control' ? 'Accepted' : 'Rejected'}</td>
                    <td><span>{result.status ? `HTTP ${result.status}` : result.outcome}</span>{result.error && <small>{result.error}</small>}</td>
                    <td>{result.duration_ms} ms</td>
                    <td><span className={`live-result ${result.passed ? 'live-result-pass' : 'live-result-fail'}`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">{result.passed ? <path d="m5 12 4 4L19 6" /> : <path d="m6 6 12 12M18 6 6 18" />}</svg>
                      {result.passed ? 'Pass' : 'Fail'}
                    </span></td>
                    <td>
                      <button
                        type="button"
                        onClick={() => copyLiveToken(result)}
                        className={`live-result-copy ${copiedLiveResultId === result.id ? 'live-result-copy-success' : ''}`}
                        title={copiedLiveResultId === result.id ? 'Copied' : `Copy token used for ${result.title}`}
                        aria-label={copiedLiveResultId === result.id ? 'Token copied' : `Copy token used for ${result.title}`}
                        aria-live="polite"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          {copiedLiveResultId === result.id
                            ? <path d="m5 12 4 4L19 6" />
                            : <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>}
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="live-test-notices">
        <aside className="live-test-notice live-test-notice-privacy">
          <span className="live-test-notice-kicker">PRIVATE BY DESIGN</span>
          <h3>Your request data is not stored.</h3>
          <p>xJWT does not persist your token, target URL, request body, or target response. Server-side data is held only for the active test and released afterward. Results remain in this browser page until replaced or reloaded.</p>
          <span className="live-test-notice-tag">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>
            Ephemeral processing
          </span>
        </aside>
        <aside className="live-test-notice live-test-notice-warning">
          <span className="live-test-notice-kicker">AUTHORIZED TESTING</span>
          <h3>Test only what you are allowed to.</h3>
          <p>Use this feature only on systems you own or are explicitly permitted to test. Live requests—especially POST requests—may change target data. You are responsible for scope, authorization, and applicable laws.</p>
          <span className="live-test-notice-tag">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4M12 16.5h.01" /></svg>
            Authorized use only
          </span>
        </aside>
      </div>

    </div>
  )
}

export default AdvancedSecurity
