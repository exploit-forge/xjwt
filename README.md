# JWT Pentest Studio Backend

This directory contains a simple Express-based API providing JWT utilities.

## Available Routes

- `POST /decode` – Decode a JWT. Body requires `token`.
- `POST /encode` – Encode a JWT. Body requires `header`, `payload`, optional `secret`.
- `POST /verify` – Verify a token with a secret key. Body requires `token`, `secret`.
- `POST /crack` – Start a cracking job using `jwttool-worker` and stream progress via Server-Sent Events. Body requires `token`, optional `wordlist` path.

## Development

Install dependencies:

```bash
cd backend
npm install
```

Run the server:

```bash
node index.js
```

Tests are not yet implemented.
