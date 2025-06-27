function JSONEditor({value, onChange}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cm = CodeMirror.fromTextArea(ref.current, {
      mode: {name: 'javascript', json: true},
      lineNumbers: true,
      theme: 'default'
    });
    cm.on('change', (editor) => onChange(editor.getValue()));
    cm.setValue(value);
    return () => cm.toTextArea();
  }, []);
  React.useEffect(() => {
    if(ref.current && ref.current.nextSibling && ref.current.nextSibling.CodeMirror){
      const cm = ref.current.nextSibling.CodeMirror;
      if(cm.getValue() !== value) cm.setValue(value);
    }
  }, [value]);
  return <textarea ref={ref}/>;
}

function JWTEditor() {
  const [header, setHeader] = React.useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  const [payload, setPayload] = React.useState('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}');
  const [signature, setSignature] = React.useState('');
  const [algorithm, setAlgorithm] = React.useState('HS256');
  const [token, setToken] = React.useState('');

  const encode = () => {
    try {
      const encHead = btoa(unescape(encodeURIComponent(header)));
      const encPay = btoa(unescape(encodeURIComponent(payload)));
      const unsigned = `${encHead}.${encPay}`;
      setToken(unsigned + '.' + signature);
    } catch(e) {
      alert('Invalid JSON');
    }
  };

  const decode = () => {
    try {
      const parts = token.split('.');
      if(parts.length >= 2){
        setHeader(decodeURIComponent(escape(atob(parts[0]))));
        setPayload(decodeURIComponent(escape(atob(parts[1]))));
        setSignature(parts[2] || '');
      }
    } catch(e) {
      alert('Invalid token');
    }
  };

  const copyToken = () => navigator.clipboard.writeText(token);
  const copyJSON = () => {
    try {
      const json = JSON.stringify({header: JSON.parse(header), payload: JSON.parse(payload), signature}, null, 2);
      navigator.clipboard.writeText(json);
    } catch(e) {
      alert('Invalid JSON');
    }
  };

  return (
    <div className="mb-8">
      <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="JWT token" className="w-full p-2 border rounded mb-2" />
      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={decode} className="px-3 py-1 bg-blue-500 text-white rounded">Decode</button>
        <button onClick={encode} className="px-3 py-1 bg-green-500 text-white rounded">Encode</button>
        <select value={algorithm} onChange={e=>setAlgorithm(e.target.value)} className="p-1 border rounded">
          <option value="HS256">HS256</option>
          <option value="RS256">RS256</option>
          <option value="none">none</option>
        </select>
        <button onClick={copyToken} className="px-3 py-1 bg-gray-500 text-white rounded">Copy Token</button>
        <button onClick={copyJSON} className="px-3 py-1 bg-gray-500 text-white rounded">Copy JSON</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="font-bold mb-1">Header</div>
          <JSONEditor value={header} onChange={setHeader} />
        </div>
        <div>
          <div className="font-bold mb-1">Payload</div>
          <JSONEditor value={payload} onChange={setPayload} />
        </div>
        <div>
          <div className="font-bold mb-1">Signature</div>
          <JSONEditor value={signature} onChange={setSignature} />
        </div>
      </div>
    </div>
  );
}

function CrackJWT(){
  const [file, setFile] = React.useState(null);
  const [running, setRunning] = React.useState(false);
  const [logs, setLogs] = React.useState('');

  const start = () => {
    setRunning(true);
    setLogs('Starting crack...\n');
    // Placeholder: integrate backend call
  };

  const stop = () => {
    setRunning(false);
    setLogs(prev => prev + 'Stopped.\n');
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Crack JWT</h2>
      <input type="file" onChange={e => setFile(e.target.files[0])} className="mb-2" />
      <div className="space-x-2 mb-2">
        <button onClick={start} disabled={running} className="px-3 py-1 bg-red-500 text-white rounded">Start</button>
        <button onClick={stop} disabled={!running} className="px-3 py-1 bg-gray-500 text-white rounded">Stop</button>
      </div>
      <textarea value={logs} readOnly className="w-full p-2 border rounded h-32 font-mono"></textarea>
    </div>
  );
}

function App(){
  const [theme, setTheme] = React.useState('light');
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="min-h-screen p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">JWT Pentest Studio</h1>
        <button onClick={()=>setTheme(theme==='light'?'dark':'light')} className="bg-gray-200 dark:bg-gray-700 p-2 rounded">
          {theme==='light'?'Dark':'Light'} Mode
        </button>
      </header>
      <JWTEditor />
      <CrackJWT />
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
