# Findatalab frontend

Next.js frontend for the findatalab projects.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

App will be available at `http://localhost:3000`.

## Chat endpoint

The chat page (`/fingpt`) sends messages to:

`http://localhost/chat`

You can override it with:

```bash
NEXT_PUBLIC_CHAT_ENDPOINT=http://localhost/chat
```
