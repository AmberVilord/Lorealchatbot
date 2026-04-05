# Lorealchatbot

L'Oreal-inspired beauty chatbot UI with requests routed through Cloudflare Worker instead of sending the OpenAI API key from the browser. The chat preserves prior messages locally so follow-up prompts stay context-aware and the assistant stays focused on L'Oreal products and routines.

## Files

- `index.html`: branded front-end, persistent chat transcript, and chat interface
- `worker.js`: Cloudflare Worker that serves the site, proxies chat requests to OpenAI, and forwards recent conversation context
- `wrangler.toml`: Worker configuration

## Deploy the Worker

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Set the OpenAI secret: `wrangler secret put OPENAI_API_KEY`
4. Optionally update `ALLOWED_ORIGIN` in `wrangler.toml` to your site URL if you want to restrict requests to one origin
5. Deploy: `wrangler deploy`

## Connect the Front-End

The site posts to `/api/chat` on the same Worker origin. Deploy the Worker and open its URL to load both the page and the chat endpoint from one place.

## Conversation Memory

The page stores the current conversation in local browser storage. On the next load, the transcript is restored and the Worker receives recent messages so the assistant can respond with awareness of earlier details. The Worker keeps the system prompt and trims the rolling context to `MAX_CONTEXT_MESSAGES` before forwarding to OpenAI.

## Local Development

Run the Worker locally with `wrangler dev`, then open the local Worker URL in your browser. The same origin serves the page and handles `/api/chat`.