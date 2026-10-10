import asyncio
import hashlib
import os

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from security_engine import TokenError, analyze_token, crack_hmac_token, generate_playbook, iter_candidates


DEFAULT_WORDLIST = os.getenv("XJWT_WORDLIST_PATH", "/opt/app/common_secrets.txt")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")
MAX_CUSTOM_WORDLIST_BYTES = 2 * 1024 * 1024
app = FastAPI(title="xjwt security worker")


class CrackRequest(BaseModel):
    token: str
    wordlist: str | None = None


class TokenRequest(BaseModel):
    token: str


async def log_line(line):
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(f"{BACKEND_URL}/worker/results", json={"line": line})
    except httpx.HTTPError:
        pass


@app.post("/crack")
async def crack(req: CrackRequest):
    try:
        if req.wordlist and req.wordlist.strip():
            source = req.wordlist.encode("utf-8")
            if len(source) > MAX_CUSTOM_WORDLIST_BYTES:
                raise HTTPException(status_code=413, detail="Custom wordlist exceeds 2 MB")
            await log_line(f"Using custom wordlist with {len(req.wordlist.splitlines())} entries")
        else:
            with open(DEFAULT_WORDLIST, "rb") as wordlist_file:
                source = wordlist_file.read()
            await log_line(f"Using default wordlist with {len(source.splitlines())} entries")
        secret, tested = await asyncio.to_thread(crack_hmac_token, req.token, iter_candidates(source))
        if secret is None:
            await log_line(f"Tested {tested:,} candidates; key not found")
            return {"status": "completed", "tested": tested}
        await log_line(f"Secret found after {tested:,} candidates")
        return {"status": "completed", "secret": secret, "hash": hashlib.sha256(secret.encode()).hexdigest(), "tested": tested, "message": "JWT key successfully recovered"}
    except TokenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc


@app.post("/analyze")
async def analyze(req: TokenRequest):
    try:
        return await asyncio.to_thread(analyze_token, req.token)
    except TokenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/playbook")
async def playbook(req: TokenRequest):
    try:
        return await asyncio.wait_for(asyncio.to_thread(generate_playbook, req.token), timeout=5)
    except TokenError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=408, detail="Playbook generation timed out") from exc
