# Lorealchatbot

L'Oreal-inspired beauty chatbot UI with requests routed through Cloudflare Worker instead of sending the OpenAI API key from the browser. The chat also preserves prior messages locally so follow-up prompts stay context-aware.

## Files

- `index.html`: branded front-end, persistent chat transcript, and chat interface
- `worker.js`: Cloudflare Worker that proxies requests to OpenAI and forwards recent conversation context
- `wrangler.toml`: Worker configuration

## Deploy the Worker

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Set the OpenAI secret: `wrangler secret put OPENAI_API_KEY`
4. Update `ALLOWED_ORIGIN` in `wrangler.toml` to your site URL
5. Deploy: `wrangler deploy`

## Connect the Front-End

Use the deployed Worker URL in the `Worker Endpoint` field in `index.html`, or route the Worker to `/api/chat` on the same domain.

## Conversation Memory

The page stores the current conversation, Worker URL, model, and system prompt in local browser storage. On the next load, the transcript is restored and the Worker receives recent messages so the assistant can respond with awareness of earlier details. The Worker keeps the system prompt and trims the rolling context to `MAX_CONTEXT_MESSAGES` before forwarding to OpenAI.

## Local Development

Run the Worker locally with `wrangler dev`. If you keep the default `ALLOWED_ORIGIN`, the page can post to `http://127.0.0.1:8787` during local testing.