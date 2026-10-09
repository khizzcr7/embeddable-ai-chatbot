"""Embeddable AI Chatbot - FastAPI backend.

Serves:
  GET  /            -> demo site (fake dental clinic with widget embedded)
  GET  /widget.js  -> the embeddable vanilla-JS widget
  POST /api/chat   -> chat endpoint (Gemini-powered, knowledge-base grounded)
  GET  /health     -> health check

The LLM is Google Gemini (free tier). Set GEMINI_API_KEY env var.
Get a free key at https://aistudio.google.com/app/apikey
"""

import os
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash").strip()
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

FALLBACK_REPLY = (
    "I don't have that detail on hand, but I'll have someone from the team "
    "contact you shortly - what's the best number to reach you?"
)

app = FastAPI(title="Embeddable AI Chatbot")


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    business_name: str = Field(default="our business", max_length=200)
    knowledge: str = Field(default="", max_length=20000)
    history: List[ChatMessage] = Field(default_factory=list, max_length=12)


class ChatResponse(BaseModel):
    reply: str


def build_prompt(req: ChatRequest) -> str:
    knowledge = req.knowledge.strip() or "No specific business information provided."
    history_lines = []
    for m in req.history[-6:]:
        who = "Visitor" if m.role == "user" else "Assistant"
        history_lines.append(f"{who}: {m.content}")
    history_block = "\n".join(history_lines) or "(no prior messages)"

    return (
        f"You are the friendly website chat assistant for {req.business_name}.\n"
        "Answer the visitor's question using ONLY the business information below. "
        "Keep answers short (2-3 sentences), warm and conversational. "
        "Never invent prices, hours, addresses or services that are not listed. "
        f"If the information does not contain the answer, reply with exactly: \"{FALLBACK_REPLY}\"\n"
        "\n"
        "BUSINESS INFORMATION:\n"
        f"{knowledge}\n"
        "\n"
        "CONVERSATION SO FAR:\n"
        f"{history_block}\n"
        "\n"
        f"VISITOR: {req.message}\n"
        "ASSISTANT:"
    )


async def ask_gemini(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 300,
                },
            },
        )
    if resp.status_code != 200:
        raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text[:200]}")
    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Gemini response shape: {exc}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
        "model": GEMINI_MODEL,
    }


@app.get("/widget.js", response_class=PlainTextResponse)
def widget_js():
    path = BASE_DIR / "widget" / "chatbot.js"
    if not path.exists():
        raise HTTPException(status_code=500, detail="widget file missing")
    return PlainTextResponse(
        path.read_text(encoding="utf-8"),
        media_type="application/javascript",
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "Chat service is not configured: GEMINI_API_KEY is missing. "
                "Set it as an environment variable to enable AI replies."
            ),
        )
    try:
        reply = await ask_gemini(build_prompt(req))
    except Exception as exc:  # network / quota / bad key -> graceful fallback
        print(f"[chat] Gemini call failed: {exc}")
        reply = FALLBACK_REPLY
    return ChatResponse(reply=reply)


@app.get("/", response_class=HTMLResponse)
def demo():
    path = BASE_DIR / "demo" / "index.html"
    if not path.exists():
        raise HTTPException(status_code=500, detail="demo page missing")
    return HTMLResponse(path.read_text(encoding="utf-8"))
