# Findatalab Frontend

Frontend for Findatalab projects, built with Next.js (App Router).

## Stack

- Next.js 15
- React 19
- App Router API routes (`app/api/**`)
- Markdown rendering (`marked`) + sanitization (`isomorphic-dompurify`)

## Features

- `/` — project landing page
- `/fingpt` — chat UI for admissions assistant
- `/llmcity` — news sentiment analysis + generated comments
- Server-side proxy routes for LLM calls:
	- `/api/chat`
	- `/api/llmcity/chat`

## Prerequisites

- Node.js 20+
- npm 10+
- Running LLM backend (for local usage), e.g. Ollama or compatible API

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

If `.env.example` does not exist yet, create `.env.local` manually from the section below.

3. Start development server:

```bash
npm run dev
```

4. Open app:

- `http://localhost:3000`

If port `3000` is busy, Next.js may use `3001` automatically.

## Environment Variables

Use `.env.local` for local development.

```bash
# Common chat endpoint (used by /api/chat as fallback)
CHAT_ENDPOINT=http://localhost:1416/chat/completions

# LLM model for /fingpt requests
NEXT_PUBLIC_CHAT_MODEL=

# Optional fixed chat history id in /fingpt
NEXT_PUBLIC_CHAT_HISTORY_ID=

# LLM City specific endpoint/model (optional)
LLMCITY_ENDPOINT=http://localhost:11434/api/chat
LLMCITY_MODEL=qwen3.5
```

### Important

- Do not put secrets into `NEXT_PUBLIC_*` variables.
- Browser pages call internal routes (`/api/...`), and server routes call upstream LLM APIs.

## Available Scripts

- `npm run dev` — start development server
- `npm run build` — create production build
- `npm run start` — start production server
- `npm run lint` — run lint checks

## Production Run (PM2)

Build first:

```bash
npm run build
```

Start with PM2 on custom port:

```bash
pm2 start npm --name "findatalab-frontend" -- run start -- -p 33000
```

Check status/logs:

```bash
pm2 status
pm2 logs findatalab-frontend
```

## API Flow

### `/fingpt`

Client page sends request to `/api/chat` → server route forwards to `CHAT_ENDPOINT`.

### `/llmcity`

Client page sends `{ news, commentCount }` to `/api/llmcity/chat` → server route builds prompt, calls LLM endpoint, parses model response, returns structured JSON:

```json
{
	"sentiment": {
		"label": "positive|negative|neutral|mixed",
		"score": 0.32,
		"explanation": "..."
	},
	"comments": ["...", "..."]
}
```

## Troubleshooting

### `POST /api/llmcity/chat 404`

- Restart dev server (`npm run dev`) after adding/changing route files.
- If needed, clear cache and restart:

```bash
rm -rf .next && npm run dev
```

### `Unexpected token '<' ... is not valid JSON`

- Usually means HTML was returned instead of JSON (wrong URL, 404 page, proxy issue).
- Verify frontend is calling `/api/llmcity/chat` on the same host/port as the app.

### `502` from `/api/llmcity/chat`

- Upstream LLM responded in unexpected format or could not be parsed.
- Check server logs for `[llmcity/chat] response_parse_error` or `upstream_error`.

## Development Notes

- Keep all external LLM calls on server-side routes.
- Keep client error messages user-friendly; keep technical details in server logs.
- Validate and sanitize all user-visible model output.
