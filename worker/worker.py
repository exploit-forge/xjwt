import os
import asyncio
import tempfile
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
    wordlist_path = DEFAULT_WORDLIST
    temp_wordlist = None
    
    try:
        # If wordlist content is provided, create a temporary file
        if req.wordlist and req.wordlist.strip():
            # Create a temporary file for the custom wordlist
            temp_wordlist = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
            temp_wordlist.write(req.wordlist)
            temp_wordlist.flush()
            temp_wordlist.close()
            wordlist_path = temp_wordlist.name
            
            # Log that we're using a custom wordlist
            async with httpx.AsyncClient() as client:
                await client.post(f"{BACKEND_URL}/worker/results", 
                                json={"line": f"Using custom wordlist with {len(req.wordlist.splitlines())} entries"})
        else:
            # Log that we're using the default wordlist
            async with httpx.AsyncClient() as client:
                await client.post(f"{BACKEND_URL}/worker/results", 
                                json={"line": "Using default wordlist with 100+ common secrets"})

        cmd = [
            "python",
            JWT_TOOL_PATH,
            # "-b",
            "-C",
            "-d",
            wordlist_path,
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
                    try:
                        process.kill()
                    except ProcessLookupError:
                        pass
                    await process.wait()
                    break
            else:
                await process.wait()

        result = {"status": "completed"}
        if secret:
            result.update({
                "secret": secret,
                "hash": hashlib.sha256(secret.encode()).hexdigest(),
                "message": f"JWT Key successfully cracked: {secret}"
            })
        return result
        
    finally:
        # Clean up temporary wordlist file if it was created
        if temp_wordlist and os.path.exists(temp_wordlist.name):
            try:
                os.unlink(temp_wordlist.name)
            except OSError:
                pass  # Ignore cleanup errors
