"""Embeddable AI chatbot backend.

One FastAPI service powers every embedded widget:
  POST /api/chat  -> { message, business_name, knowledge, history }
  GET  /api/health

The widget sends the business's own knowledge text with every message, so the
model answers from that business's info instead of hallucinating. No API key is
ever committed; it comes from the GEMINI_API_KEY environment variable.

Google retired gemini-2.0/2.5/1.5-flash for new API keys (404), so we try
gemini-3.8-flash first and retry on 429/503 before falling back.
"""

import os
import time

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

FALLBACK_REPLY = (
    "I don't have that detail on hand, but I'll have someone from the team "
    "contact you shortly - what's the best number to reach you?"
)

SYSTEM_PROMPT = """You are the friendly AI receptionist for {business}. Answer ONLY from the
business information below. Keep answers short (1-3 sentences), warm and helpful.
If the information does not contain the answer, say: I don't have that detail on
hand, but I'll have someone from the team contact you shortly - what's the best
number to reach you?

Business information:
{knowledge}
"""

app = FastAPI(title="Embeddable AI Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    business_name: str = "this business"
    knowledge: str = ""
    history: list = []


class ChatResponse(BaseModel):
    reply: str


def model_candidates() -> list:
    """gemini-3.8-flash is the only model serving new API keys; try it first."""
    ordered = ["gemini-3.8-flash"]
    configured = (GEMINI_MODEL or "").strip()
    if configured and configured not in ordered:
        ordered.append(configured)
    for extra in ("gemini-2.0-flash", "gemini-1.5-flash"):
        if extra not in ordered:
            ordered.append(extra)
    return ordered


def ask_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set")
    last_error = "unknown error"
    for model in model_candidates():
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={GEMINI_API_KEY}"
        )
        for attempt in range(3):
            try:
                resp = httpx.post(
                    url,
                    timeout=25,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.3,
                            "maxOutputTokens": 1024,
                        },
                    },
                )
            except (httpx.RequestError, ValueError) as exc:
                last_error = f"Gemini request failed for {model}: {exc}"
                break
            if resp.status_code == 200:
                data = resp.json()
                try:
                    parts = data["candidates"][0]["content"]["parts"]
                    text = "".join(p.get("text", "") for p in parts).strip()
                    if text:
                        return text
                    last_error = "Gemini returned an empty response"
                except (KeyError, IndexError, TypeError) as exc:
                    last_error = f"Unexpected Gemini response shape: {exc}"
                break
            last_error = (
                f"Gemini API error {resp.status_code} for {model}: "
                f"{resp.text[:200]}"
            )
            print(f"[chat] {last_error}")
            if resp.status_code in (429, 503) and attempt < 2:
                time.sleep(4 * (attempt + 1))
                continue
            break
    raise RuntimeError(last_error)


@app.get("/api/health")
def health():
    return {"ok": True, "model": GEMINI_MODEL}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    history_txt = ""
    for turn in req.history[-6:]:
        role = turn.get("role", "user")
        content = turn.get("content", "")
        history_txt += f"{role}: {content}\n"
    prompt = SYSTEM_PROMPT.format(
        business=req.business_name, knowledge=req.knowledge or "(no info provided)"
    )
    if history_txt:
        prompt += f"\nRecent conversation:\n{history_txt}\n"
    prompt += f"\nVisitor: {req.message}\nReceptionist:"
    try:
        reply = ask_gemini(prompt)
    except Exception as exc:  # never break the widget; degrade gracefully
        print(f"[chat] Gemini call failed, using fallback: {exc}")
        reply = FALLBACK_REPLY
    return ChatResponse(reply=reply)


@app.get("/")
def demo_site():
    return FileResponse("demo/index.html")


@app.get("/widget.js")
def widget_js():
    return FileResponse("widget/chatbot.js", media_type="application/javascript")
