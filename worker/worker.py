import os
import asyncio
from fastapi import FastAPI
from pydantic import BaseModel
import httpx

JWT_TOOL_PATH = "/opt/jwt_tool/jwt_tool.py"
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")

app = FastAPI()

class CrackRequest(BaseModel):
    token: str
    wordlist: str | None = None

@app.post("/crack")
async def crack(req: CrackRequest):
    cmd = ["python", JWT_TOOL_PATH, "-C"]
    if req.wordlist:
        cmd += ["-d", req.wordlist]
    cmd.append(req.token)
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    async with httpx.AsyncClient() as client:
        async for line in process.stdout:
            await client.post(f"{BACKEND_URL}/worker/results", json={"line": line.decode()})
    await process.wait()
    return {"status": "completed"}
