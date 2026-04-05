const corsHeaders = {
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...extraHeaders
        }
    });
}

async function parseJsonBody(response) {
    const rawBody = await response.text();

    if (!rawBody.trim()) {
        return {
            data: null,
            rawBody,
            isEmpty: true
        };
    }

    try {
        return {
            data: JSON.parse(rawBody),
            rawBody,
            isEmpty: false
        };
    } catch {
        return {
            data: null,
            rawBody,
            isEmpty: false
        };
    }
}

function buildCorsHeaders(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "";

    if (!allowedOrigin) {
        return corsHeaders;
    }

    if (origin === allowedOrigin) {
        return {
            ...corsHeaders,
            "Access-Control-Allow-Origin": origin,
            Vary: "Origin"
        };
    }

    return corsHeaders;
}

function toResponsesInput(messages) {
    return messages.map((message) => ({
        role: message.role,
        content: [
            {
                type: "input_text",
                text: message.content
            }
        ]
    }));
}

function trimMessages(messages, maxMessages) {
    if (messages.length <= maxMessages) {
        return messages;
    }

    const systemMessages = messages.filter((message) => message.role === "system");
    const conversationalMessages = messages.filter((message) => message.role !== "system");
    const remainingSlots = Math.max(maxMessages - systemMessages.length, 0);

    return [...systemMessages, ...conversationalMessages.slice(-remainingSlots)];
}

export default {
    async fetch(request, env) {
        const headers = buildCorsHeaders(request, env);

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers });
        }

        if (request.method !== "POST") {
            return jsonResponse({ error: "Method not allowed." }, 405, headers);
        }

        if (!env.OPENAI_API_KEY) {
            return jsonResponse({ error: "Missing OPENAI_API_KEY secret." }, 500, headers);
        }

        if (env.ALLOWED_ORIGIN) {
            const origin = request.headers.get("Origin") || "";
            if (origin !== env.ALLOWED_ORIGIN) {
                return jsonResponse({ error: "Origin not allowed." }, 403, headers);
            }
        }

        let payload;
        try {
            payload = await request.json();
        } catch {
            return jsonResponse({ error: "Invalid JSON payload." }, 400, headers);
        }

        const model = payload.model || env.OPENAI_MODEL || "gpt-4.1-mini";
        const messages = Array.isArray(payload.messages) ? payload.messages : [];
        const maxMessages = Number(env.MAX_CONTEXT_MESSAGES || 24);

        if (!messages.length) {
            return jsonResponse({ error: "At least one message is required." }, 400, headers);
        }

        const invalidMessage = messages.find((message) => {
            return !message || typeof message.role !== "string" || typeof message.content !== "string";
        });

        if (invalidMessage) {
            return jsonResponse({ error: "Each message must include string role and content fields." }, 400, headers);
        }

        const trimmedMessages = trimMessages(messages, maxMessages);

        try {
            const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model,
                    input: toResponsesInput(trimmedMessages)
                })
            });

            const { data, rawBody, isEmpty } = await parseJsonBody(openAIResponse);

            if (isEmpty) {
                return jsonResponse({ error: "OpenAI returned an empty response body." }, 502, headers);
            }

            if (!openAIResponse.ok) {
                const message = data?.error?.message || data?.error || "OpenAI request failed.";
                return jsonResponse({ error: message }, openAIResponse.status, headers);
            }

            if (!data) {
                return jsonResponse({ error: `OpenAI returned invalid JSON: ${rawBody.slice(0, 200)}` }, 502, headers);
            }

            return jsonResponse(data, 200, headers);
        } catch (error) {
            return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected worker failure." }, 502, headers);
        }
    }
};