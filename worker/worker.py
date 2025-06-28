import os
import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
import hashlib
import re
import httpx

JWT_TOOL_PATH = "/opt/jwt_tool/jwt_tool.py"
DEFAULT_WORDLIST = "/opt/app/common_secrets.txt"
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")

app = FastAPI()

class CrackRequest(BaseModel):
    token: str
    wordlist: str | None = None

@app.post("/crack")
async def crack(req: CrackRequest):
    wordlist = req.wordlist or DEFAULT_WORDLIST
    cmd = [
        "python",
        JWT_TOOL_PATH,
        # "-b",
        "-C",
        "-d",
        wordlist,
        req.token,
    ]
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    secret = None
    expect_next = False
    ansi_escape = re.compile(r'\x1B\[[0-?]*[ -/]*[@-~]')
    async with httpx.AsyncClient() as client:
        async for line_bytes in process.stdout:
            line = line_bytes.decode()
            clean_line = ansi_escape.sub('', line).strip()

            # Filter out unwanted lines
            if clean_line in ("", "/root/.jwt_tool/jwtconf.ini"):
                continue

            await client.post(f"{BACKEND_URL}/worker/results", json={"line": clean_line})
            text = clean_line
            if expect_next and text:
                secret = text
                expect_next = False
            if "CORRECT key" in text:
                m = re.search(r"\[\+\]\s*(.+?)\s+is the CORRECT key!", text)
                if m:
                    secret = m.group(1).strip()
            if secret:
                # await client.post(
                #     f"{BACKEND_URL}/worker/results",
                #     json={"line": f"Token successfully cracked, here is the correct key: {secret}"},
                # )
                process.kill()
                await process.wait()
                break
        else:
            await process.wait()
    # await process.wait()

    result = {"status": "completed"}
    if secret:
        result.update({
            "secret": secret,
            "hash": hashlib.sha256(secret.encode()).hexdigest(),
            "message": f"JWT Key successfully cracked: {secret}"
        })
    return result
