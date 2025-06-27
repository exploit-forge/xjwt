# jwt_pentest

> **You are an AI full-stack developer.**
> Build a web application called **“JWT Pentest Studio”** with the following requirements:
>
> 1. **Feature set**
>
>    * **Decode** and **encode** arbitrary JWTs in the browser:
>
>      * Show header, payload (claims) and signature separately.
>      * Allow editing and live re-encoding with a chosen algorithm (HS256, RS256, none, etc.).
>    * **Signature verification**: let the user supply a secret or public key to confirm a token’s signature.
>    * **“Crack JWT”** module:
>
>      * Integrate the Python CLI tool **jwttool** behind the scenes.
>      * Accept a token and a wordlist, then launch a brute-force attack to recover the secret.
>      * Display progress and results in the UI.
>    * **Token forging**: allow users to switch `alg`, modify claims, and re-sign with a provided key.
>    * **Token cracking**: if user doesn't supply a wordlist, it should use the wordlist in jwttool by default.
> 2. **Technical stack**
>
>    * **Frontend**: React (or Vue) with a clean, responsive UI—use Tailwind CSS or similar.
>    * **Backend**: Node.js (Express) or Python (FastAPI) to host API endpoints for cracking and verification.
>    * **CLI integration**: spawn `jwttool` commands in a Docker service to perform brute-force, then stream results back over WebSockets or Server-Sent Events.
>    * **Docker-Compose**:
>
>      * One service for the web frontend.
>      * One for the backend API.
>      * One for the `jwttool` worker (Python-based).
>      * Shared network so they can call each other by service name.
> 3. **UI/UX**
>
>    * Mirror JWT.io’s three-pane layout (Header / Payload / Signature) with syntax-highlighted JSON editors.
>    * Provide “Copy token” and “Copy JSON” buttons.
>    * A clear “Crack JWT” section with file upload for wordlist, Start/Stop buttons, and live log window.
>    * Mobile-friendly and dark/light theme toggle.
> 4. **Deliverables**
>
>    * A **complete** `docker-compose.yml` that builds and ties together all services.
>    * Source code in a single GitHub repo with clear README: how to build, run, and test.
>    * Automated tests for core features (e.g. encoding/decoding round-trip).
> 5. **Bonus**
>
>    * CI pipeline that lints, builds Docker images, and runs tests on each push.
>    * Live-reload for frontend during development.
>
> Please scaffold the project structure, generate example code for frontend and backend, and include comments guiding further customization.
