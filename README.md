# Embeddable AI Chatbot

A lightweight AI chatbot widget any business can add to its website with **one script tag**.
The business owner configures the business name, welcome message and FAQ/knowledge text;
visitors chat and the bot answers from that knowledge base using Google Gemini (free tier).
When it can't answer, it falls back to offering a callback instead of hallucinating.

## Live demo

A fake dental clinic site with the widget embedded — click the chat bubble and ask
about services, prices, hours or booking.

> The demo answers only after a free Gemini API key is configured (see below).

## Architecture

```
widget/chatbot.js   vanilla JS, zero dependencies, injected styles + UI
        |
        v  POST /api/chat  { message, business_name, knowledge, history }
main.py             FastAPI backend
        |
        v  prompt (business info + history) -> Google Gemini (free tier)
demo/index.html     demo business site embedding /widget.js
api/index.py        Vercel serverless entry (imports app from main.py)
```

## Embed it on any website

```html
<script>
  window.AIChatbotConfig = {
    business: "Your Business Name",
    welcome: "Hi! Ask me about our services and hours.",
    color: "#0ea5e9",
    apiUrl: "https://YOUR-BACKEND-URL/api/chat",
    knowledge: "We are open Mon-Fri 9am-6pm. Our services are ... Prices ..."
  };
</script>
<script src="https://YOUR-BACKEND-URL/widget.js"></script>
```

Short version with data attributes (fine for short knowledge text):

```html
<script src="https://YOUR-BACKEND-URL/widget.js"
        data-business="Your Business Name"
        data-welcome="Hi! How can I help?"
        data-color="#0ea5e9"></script>
```

`window.AIChatbotConfig` takes precedence over `data-*` attributes. If `apiUrl`
is omitted it defaults to `<widget-host>/api/chat`.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then put your free Gemini key in .env
uvicorn main:app --reload
```

Open http://localhost:8000 — the demo site. `GET /health` shows whether the
Gemini key is configured.

## Get a free Gemini API key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with a Google account, click **Create API key**
3. Copy it into `.env` as `GEMINI_API_KEY=...`, or set it as an
   environment variable on your host (Vercel: Project Settings → Environment
   Variables). Never commit the real key — `.env` is gitignored.

## Deploy to Vercel

1. Push this repo to GitHub.
2. On https://vercel.com/new, import the repo (sign in with Google).
3. Add environment variable `GEMINI_API_KEY` with your free key.
4. Deploy. `vercel.json` routes everything through the FastAPI app;
   `/widget.js` and `/` (demo) work out of the box.

## API

`POST /api/chat`

```json
{
  "message": "What are your hours?",
  "business_name": "BrightSmile Dental",
  "knowledge": "We are open Mon-Fri 9am-6pm...",
  "history": [{ "role": "user", "content": "..." }]
}
```

Response: `{ "reply": "..." }`. If `GEMINI_API_KEY` is missing the endpoint
returns `503` with a clear message instead of fake AI output.

## Notes

- The widget escapes all message HTML (no injection from chat content).
- History sent to the API is capped at the last 12 messages (6 used in prompt).
- Gemini generation is capped at 300 tokens, temperature 0.3 — short, grounded answers.
