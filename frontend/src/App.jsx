import { useEffect, useState } from 'react'
import './App.css'

function TextArea({ value, onChange }) {
  return (
    <textarea
      className="w-full p-2 border rounded font-mono"
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

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="JWT token"
        className="w-full p-2 border rounded"
      />
      <div className="flex flex-wrap gap-2">
        <button onClick={decode} className="px-3 py-1 bg-blue-500 text-white rounded">
          Decode
        </button>
        <button onClick={encode} className="px-3 py-1 bg-green-500 text-white rounded">
          Encode
        </button>
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value)}
          className="p-1 border rounded"
        >
          <option value="HS256">HS256</option>
          <option value="RS256">RS256</option>
          <option value="none">none</option>
        </select>
        <button onClick={copyToken} className="px-3 py-1 bg-gray-500 text-white rounded">
          Copy Token
        </button>
        <button onClick={copyJSON} className="px-3 py-1 bg-gray-500 text-white rounded">
          Copy JSON
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="font-bold mb-1">Header</div>
          <TextArea value={header} onChange={setHeader} />
        </div>
        <div>
          <div className="font-bold mb-1">Payload</div>
          <TextArea value={payload} onChange={setPayload} />
        </div>
        <div>
          <div className="font-bold mb-1">Signature</div>
          <TextArea value={signature} onChange={setSignature} />
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
    const es = new EventSource(`/crack?token=${encodeURIComponent(token)}`)
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
    <div className="mt-8 space-y-2">
      <h2 className="text-lg font-bold">Crack JWT</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <div className="space-x-2">
        <button
          onClick={start}
          disabled={running}
          className="px-3 py-1 bg-red-500 text-white rounded"
        >
          Start
        </button>
        <button
          onClick={stop}
          disabled={!running}
          className="px-3 py-1 bg-gray-500 text-white rounded"
        >
          Stop
        </button>
      </div>
      <textarea
        value={logs}
        readOnly
        className="w-full p-2 border rounded h-32 font-mono"
      />
      {secret && (
        <div className="mt-2 p-2 border rounded bg-gray-100 dark:bg-gray-700">
          <div>Secret: {secret.secret}</div>
          <div>Hash: {secret.hash}</div>
        </div>
      )}
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState('light')
  const [token, setToken] = useState('')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">JWT Pentest Studio</h1>
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="bg-gray-200 dark:bg-gray-700 p-2 rounded"
        >
          {theme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </header>
      <JWTEditor token={token} setToken={setToken} />
      <CrackJWT token={token} />
    </div>
  )
}

export default App
