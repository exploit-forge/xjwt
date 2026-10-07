import { useState } from 'react'
import TokenInput from './TokenInput'

const API_BASE = import.meta.env.VITE_BACKEND_URL || '/api'
const severityStyles = {
  critical: 'status-pill-danger',
  high: 'status-pill-danger',
  medium: 'status-pill-warn',
  low: 'status-pill-info',
  info: 'status-pill-info',
}

function AdvancedSecurity({ token, setToken }) {
  const [analysis, setAnalysis] = useState(null)
  const [playbook, setPlaybook] = useState(null)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [copiedMutationId, setCopiedMutationId] = useState('')

  const copyMutation = async (mutation) => {
    await navigator.clipboard.writeText(mutation.token)
    setCopiedMutationId(mutation.id)
    window.setTimeout(() => setCopiedMutationId((current) => current === mutation.id ? '' : current), 1800)
  }

  const request = async (path, body) => {
    setError('')
    const response = await fetch(`${API_BASE}/security/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Security check failed')
    return result
  }

  const runAnalysis = async () => {
    setLoading('analysis')
    try {
      setAnalysis(await request('analyze', { token }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading('')
    }
  }

  const runPlaybook = async () => {
    setLoading('playbook')
    try {
      const result = await request('playbook', { token })
      setPlaybook(result)
      setAnalysis(result.analysis)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-hero pt-8 pb-4 text-center">
        <h1 className="mb-5 text-white">Advanced JWT Security Testing</h1>
        <p className="text-base leading-relaxed">Run offline checks and generate validation probes without sending your JWT to a target system.</p>
      </div>

      <div className="workspace-intro">
        <div>
          <p className="text-sm font-medium text-white">Analyse a token, then generate probes for an authorized target.</p>
          <p className="mt-1 text-xs text-gray-400">Every check runs locally on our server — no request is made to any system you name.</p>
        </div>
        <span className="workspace-badge"><span className="workspace-badge-dot" /> No outbound probes</span>
      </div>

      <TokenInput token={token} setToken={setToken} />

      {error && <div role="alert" className="workspace-callout workspace-callout-danger text-red-300">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="workspace-card flex flex-col p-6">
          <h2 className="text-base font-semibold">Offline security analysis</h2>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-gray-400">Checks algorithms, signatures, timestamps, key references, and claim hygiene without contacting a target.</p>
          <button disabled={!token || loading} onClick={runAnalysis} className="accent-button mt-5 self-start rounded-xl px-4 py-2 text-sm">{loading === 'analysis' ? 'Analyzing…' : 'Analyze token'}</button>
        </section>

        <section className="workspace-card flex flex-col p-6">
          <h2 className="text-base font-semibold">Offline probe playbook</h2>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-gray-400">Generates a bounded set of unsigned and claim-validation probes. Nothing is sent automatically.</p>
          <button disabled={!token || loading} onClick={runPlaybook} className="ghost-button mt-5 self-start px-4 py-2 text-sm">{loading === 'playbook' ? 'Generating…' : 'Generate playbook'}</button>
        </section>
      </div>

      {analysis && (
        <div>
          <div className="workspace-section-head">
            <div>
              <h2>Findings</h2>
              <p>Offline analysis results</p>
            </div>
            <span className={`status-pill ${analysis.finding_count ? 'status-pill-warn' : 'status-pill-ok'}`}>
              {analysis.finding_count} found
            </span>
          </div>
          <section className="workspace-card p-6">
            <div className="space-y-3">
              {analysis.findings.length === 0 && <p className="text-sm text-green-400">No issues were identified by the offline checks.</p>}
              {analysis.findings.map(finding => (
                <article key={finding.id} className="workspace-subpanel p-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`status-pill uppercase ${severityStyles[finding.severity] || 'status-pill-info'}`}>{finding.severity}</span>
                    <h3 className="font-medium text-white">{finding.title}</h3>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-gray-300">{finding.detail}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500"><strong className="font-semibold text-gray-400">Remediation:</strong> {finding.remediation}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

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
                    <span className="text-sm font-medium text-gray-200">{mutation.title}</span>
                    <button
                      onClick={() => copyMutation(mutation)}
                      className={`ghost-button min-w-[4.5rem] px-2.5 py-1 text-xs ${copiedMutationId === mutation.id ? 'copy-button-success' : ''}`}
                      aria-live="polite"
                    >
                      {copiedMutationId === mutation.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <code className="mt-2.5 block break-all font-mono text-xs leading-relaxed text-gray-500">{mutation.token}</code>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

    </div>
  )
}

export default AdvancedSecurity
