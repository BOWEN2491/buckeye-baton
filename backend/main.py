"""Generic connectivity rehearsal, created before the competition."""

from fastapi import FastAPI
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="HackOHI/O environment rehearsal", version="0.1.0")


class EchoRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

    @field_validator("text")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Please enter some text.")
        return value.strip()


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": "pre-event practice"}


@app.post("/api/echo")
def echo(payload: EchoRequest):
    return {"result": payload.text, "characters": len(payload.text), "mode": "practice"}
