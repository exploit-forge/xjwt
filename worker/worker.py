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
    async with httpx.AsyncClient() as client:
        async for line_bytes in process.stdout:
            line = line_bytes.decode()
            await client.post(f"{BACKEND_URL}/worker/results", json={"line": line})
            text = line.strip()
            if expect_next and text:
                secret = text
                expect_next = False
            if "CORRECT key" in text:
                m = re.search(r"CORRECT key(?: found:)?\s*(.*)", text)
                if m and m.group(1):
                    secret = m.group(1).strip()
                else:
                    expect_next = True
            if secret:
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
        })
    return result
