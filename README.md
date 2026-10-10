# xJWT — JWT Security Checker

xJWT is a browser-based workspace for decoding, editing, signing, verifying, scanning, and testing JSON Web Tokens. It combines local JWT tooling with an optional backend security worker for dictionary cracking, probe generation, and explicitly authorized endpoint tests.

> Use xJWT only with tokens and systems you own or have explicit permission to test.

## Features

### Decoder and editor

- Decode JWT headers and payloads in real time.
- Edit JSON and regenerate the encoded token.
- Inspect claims in JSON or a detailed claims breakdown.
- Show human-readable values for NumericDate claims such as `iat`, `nbf`, and `exp`.
- Copy tokens and decoded data with visual confirmation.
- Sign and verify HMAC tokens with HS256, HS384, and HS512.
- Sign and verify RSA, RSA-PSS, and ECDSA tokens with supported browser Web Crypto key formats.
- Use light or dark mode on desktop and mobile layouts.

Decoder, editor, signing, and verification operations run in the browser. Tokens and keys used there are not persisted by xJWT.

### Security scanner

- Check algorithms, signatures, key-selection headers, timestamps, token size, and claim hygiene.
- Detect potentially sensitive claims and suspicious JWT header values.
- Attempt a bounded weak-secret check for HMAC tokens.
- Present severity-ranked findings, remediation guidance, security posture, and exposure scores.

Scanner secret checks call the backend worker. They are not browser-only operations.

### HMAC secret cracker

- Dictionary-test HS256, HS384, and HS512 signatures with the native Python worker.
- Use the bundled wordlist of more than 100,000 common candidates.
- Upload custom plain-text wordlists in `.txt`, `.list`, or `.dic` format.
- Enforce a 2 MB custom-wordlist limit and a maximum of 1,000,000 candidates per request.
- Stream attack status and return a recovered secret when a candidate matches.

Custom wordlists are read as one candidate per line. xJWT does not depend on `jwt_tool` for cracking.

### Advanced testing

- Generate a bounded offline playbook of unsigned and claim-validation probe tokens without contacting a target.
- Optionally run the original token and generated probes against an authorized HTTP(S) endpoint.
- Send GET or POST requests with JSON or form-encoded bodies.
- Deliver tokens through `Authorization: Bearer`, common query parameters, or a custom query parameter.
- Add up to ten custom request headers; transport-controlled headers cannot be overridden.
- View response status, timing, and pass/fail results, and copy the exact token used for each test.

Live testing occurs only after the user provides a target, confirms authorization, and starts the test. Redirects are not followed, requests time out after five seconds, and private/internal destinations are blocked by default. Set `LIVE_TEST_ALLOW_PRIVATE_TARGETS=true` on the backend only when an authorized local testing environment requires it.

### Reference library

The Libraries page contains links and usage notes for third-party JWT and web-security tools. These are references, not bundled integrations or dependencies of xJWT.

## Privacy and data handling

- xJWT has no database and does not intentionally persist JWTs, keys, wordlists, request bodies, or target responses.
- Decoder, editor, signing, and verification data remains in the browser.
- Cracking, playbook generation, scanner secret checks, and live tests send the required input to the xJWT backend and worker for in-memory processing.
- Live target responses are classified by status code; response bodies are not stored or returned by the live-test API.
- Results remain in the current browser page until replaced or the page is reloaded.

Do not submit production secrets to an xJWT deployment you do not control or trust.

## Quick start with Docker

### Requirements

- Docker
- Docker Compose
- Git

```bash
git clone https://github.com/exploit-forge/xjwt.git
cd xjwt
docker compose up --build
```

Open:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)

The Compose stack starts the React frontend, Express API, and Python security worker.

## Local development

Run the three services separately.

### Security worker

```bash
cd worker
python3 -m pip install -r requirements.txt
XJWT_WORDLIST_PATH=../backend/jwt/common_secrets.txt \
BACKEND_URL=http://127.0.0.1:8012 \
uvicorn worker:app --host 127.0.0.1 --port 8001
```

### Backend

```bash
cd backend
npm install
PORT=8012 WORKER_URL=http://127.0.0.1:8001 node index.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

Vite proxies `/api` to `http://127.0.0.1:8012` by default. Set `VITE_BACKEND_URL` when the API is hosted elsewhere.

## Testing

```bash
cd frontend
npm test -- --run
npm run build

cd ../backend
npm test -- --runInBand

cd ../worker
python3 -m unittest test_security_engine.py
```

## Architecture

- `frontend/` — React 19, Vite, Tailwind CSS, and browser Web Crypto.
- `backend/` — Express API, validation, live-test request controls, and server-sent events.
- `worker/` — FastAPI security engine for HMAC cracking, static analysis, and probe generation.
- `backend/jwt/common_secrets.txt` — bundled common-secret wordlist.

## Security boundaries

- Live endpoint testing accepts only HTTP(S) URLs without embedded credentials or fragments.
- DNS results are checked and pinned for each live test to reduce SSRF and DNS-rebinding risk.
- Loopback, private, link-local, multicast, and other internal addresses are blocked by default.
- Live tests do not follow redirects.
- User-supplied `Authorization`, `Host`, `Content-Type`, `Content-Length`, connection, proxy, transfer, and upgrade headers are blocked because xJWT manages them.
- A successful probe result is based on HTTP behavior: the original control is expected to be accepted, while intentionally invalid mutations are expected to be rejected.

These checks assist authorized testing; they do not prove that an implementation is secure.

## License

Licensed under the [MIT License](LICENSE).

## Links

- [xJWT](https://xjwt.io)
- [Exploit Forge](https://www.exploit-forge.com)
- [Issue tracker](https://github.com/exploit-forge/xjwt/issues)
