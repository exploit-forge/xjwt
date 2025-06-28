import { useEffect, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''

function TextArea({ value, onChange }) {
  return (
    <textarea
      className="textarea textarea-bordered w-full font-mono min-h-[8rem]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function JWTEditor({ token, setToken }) {
  const [header, setHeader] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}')
  const [payload, setPayload] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}')
  const [signature, setSignature] = useState('')
  const [algorithm, setAlgorithm] = useState('HS256')

  const encode = () => {
    try {
      const headerObj = JSON.parse(header)
      headerObj.alg = algorithm
      const updatedHeader = JSON.stringify(headerObj, null, 2)
      setHeader(updatedHeader)
      const encHead = btoa(unescape(encodeURIComponent(updatedHeader)))
      const encPay = btoa(unescape(encodeURIComponent(payload)))
      const unsigned = `${encHead}.${encPay}`
      setToken(`${unsigned}.${signature}`)
    } catch (err) {
      alert('Invalid JSON')
      console.error(err)
    }
  }

  const decode = () => {
    try {
      const parts = token.split('.')
      if (parts.length >= 2) {
        setHeader(decodeURIComponent(escape(atob(parts[0]))))
        setPayload(decodeURIComponent(escape(atob(parts[1]))))
        setSignature(parts[2] || '')
      }
    } catch (err) {
      alert('Invalid token')
      console.error(err)
    }
  }

  const copyToken = () => navigator.clipboard.writeText(token)
  const copyJSON = () => {
    try {
      const json = JSON.stringify(
        { header: JSON.parse(header), payload: JSON.parse(payload), signature },
        null,
        2
      )
      navigator.clipboard.writeText(json)
    } catch {
      alert('Invalid JSON')
    }
  }

  const [parts, setParts] = useState(['', '', ''])

  useEffect(() => {
    const split = token.split('.')
    setParts([split[0] || '', split[1] || '', split[2] || ''])
  }, [token])

  return (
    <div className="card bg-base-200 shadow">
      <div className="card-body space-y-4">
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="JWT token"
          className="input input-bordered w-full font-mono"
        />
        <div className="font-mono break-all text-sm">
          <span className="text-error">{parts[0]}</span>
          {parts[0] && <span className="text-gray-500">.</span>}
          <span className="text-success">{parts[1]}</span>
          {parts[1] && <span className="text-gray-500">.</span>}
          <span className="text-primary">{parts[2]}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={decode} className="btn btn-primary">
            Decode
          </button>
          <button onClick={encode} className="btn btn-secondary">
            Encode
          </button>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            className="select select-bordered"
          >
            <option value="HS256">HS256</option>
            <option value="RS256">RS256</option>
            <option value="none">none</option>
          </select>
          <button onClick={copyToken} className="btn">
            Copy Token
          </button>
          <button onClick={copyJSON} className="btn">
            Copy JSON
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="font-semibold mb-1">Header</div>
            <TextArea value={header} onChange={setHeader} />
          </div>
          <div>
            <div className="font-semibold mb-1">Payload</div>
            <TextArea value={payload} onChange={setPayload} />
          </div>
          <div>
            <div className="font-semibold mb-1">Signature</div>
            <TextArea value={signature} onChange={setSignature} />
          </div>
        </div>
      </div>
    </div>
  )
}

function CrackJWT({ token }) {
  const [_file, setFile] = useState(null)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState('')

  const [source, setSource] = useState(null)
  const [secret, setSecret] = useState(null)

  const start = () => {
    setRunning(true)
    setLogs('')
    const es = new EventSource(`${API_BASE}/crack?token=${encodeURIComponent(token)}`)
    setSource(es)
    es.onmessage = (e) => {
      if (e.data.startsWith('RESULT ')) {
        const data = JSON.parse(e.data.replace('RESULT ', ''))
        setSecret(data)
      } else if (e.data !== 'DONE') {
        setLogs((prev) => prev + e.data + '\n')
      }
    }
    es.onerror = () => {
      es.close()
      setRunning(false)
    }
  }

  const stop = () => {
    if (source) source.close()
    setSource(null)
    setRunning(false)
    setLogs((prev) => prev + 'Stopped.\n')
  }

  return (
    <div className="card bg-base-200 shadow mt-8">
      <div className="card-body space-y-4">
        <h2 className="card-title">Crack JWT</h2>
        <input type="file" className="file-input file-input-bordered" onChange={(e) => setFile(e.target.files[0])} />
        <div className="space-x-2">
          <button
            onClick={start}
            disabled={running}
            className="btn btn-error"
          >
            Start
          </button>
          <button
            onClick={stop}
            disabled={!running}
            className="btn"
          >
            Stop
          </button>
        </div>
        <textarea
          value={logs}
          readOnly
          className="textarea textarea-bordered w-full h-32 font-mono"
        />
        {secret && (
          <div className="alert alert-success">
            {secret.message || `JWT Key successfully cracked: ${secret.secret}`}
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState('light')
  const [token, setToken] = useState('')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="min-h-screen bg-base-100">
      <header className="navbar bg-base-200 shadow mb-4">
        <div className="flex-1">
          <span className="text-xl font-bold">JWT Pentest Studio</span>
        </div>
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="btn btn-ghost"
        >
          {theme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </header>
      <div className="space-y-8 p-4">
        <JWTEditor token={token} setToken={setToken} />
        <CrackJWT token={token} />
      </div>
    </div>
  )
}

export default App
