"""Public synthetic GET/POST connectivity probe. NOT the ZENIX production app."""
from pathlib import Path
from typing import Literal

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
app = FastAPI(
    title="ZENIX Backend Connectivity Test",
    description="Stateless synthetic network diagnostics only; no accounts or personal data.",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


class Probe(BaseModel):
    probe: Literal["zenix-backend-v1"]
    payload: str = Field(min_length=0, max_length=32768, pattern=r"^X*$")


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(ROOT / "index.html", media_type="text/html", headers={"Cache-Control": "no-store"})


@app.get("/api/health")
def health():
    return {"ok": True, "service": "zenix-backend-test", "version": 1}


@app.post("/api/probe")
def probe(body: Probe):
    # No storage, no database, no user text; send back only a fixed marker and byte count.
    return {"ok": True, "ack": "ZENIX_BACKEND_OK", "received_bytes": len(body.payload.encode("ascii"))}
