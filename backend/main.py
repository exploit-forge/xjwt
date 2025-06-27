from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "JWT Pentest Studio backend"}

@app.post("/verify")
async def verify_token(token: str):
    # Placeholder verification logic
    return {"valid": False, "token": token}
