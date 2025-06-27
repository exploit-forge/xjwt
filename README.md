
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

Run tests:

```bash
npm test
```

# JWT Pentest Studio

JWT Pentest Studio is a planned web application for inspecting and attacking JSON Web Tokens (JWTs). It brings together a browser-based UI and supporting backend services to decode, modify and brute-force JWTs.

## Features (from `Instructions.md`)

- Decode and encode arbitrary JWTs in the browser with live editing.
- Verify signatures using a user-provided secret or public key.
- "Crack JWT" mode powered by the `jwttool` CLI to brute-force secrets.
- Token forging: switch `alg`, adjust claims and re-sign tokens.
- Default wordlist support if none is provided when cracking tokens.
- React or Vue front‑end styled with Tailwind CSS.
- Node/Express backend exposing verification and cracking endpoints.
- Docker Compose layout with services for the frontend, API and `jwttool` worker.
- UI modelled after JWT.io with copy buttons, a cracking section and dark/light theme.
- Automated tests covering core features.

## Setup

These instructions assume you have Docker and Node.js installed.

### Docker Compose (once provided)

```
docker compose build
```

This builds the frontend, backend and worker images. After building:

```
docker compose up
```

The services will start on a shared network and can be accessed via the defined ports.

### Building without Docker

```
# Frontend
cd frontend
npm install
npm run build

# Backend
cd ../backend
npm install
node index.js
```

### Running tests

Run frontend tests with your package manager (for example, using npm):

```
cd frontend
npm test
```

Run backend tests with npm:

```
cd backend
npm test
```

Further instructions will be added alongside the codebase and Docker configuration.

