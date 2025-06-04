/**
 * Streaming proxy to Mistral-AI (/v1/chat/completions).
 *
 * ① Keeps your API key on the server
 * ② Accepts `POST` with a { messages: [...] } body
 * ③ Returns a text/event-stream so your React <Chat /> can read tokens incrementally
 *
 * ➜ ENV:   MISTRAL_API_KEY=6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ
 * ➜ URL:   /api/chat      (pages router)
 *          /app/api/chat  (app router)
 */

/* ---------- Type helpers ---------- */
type Role = 'system' | 'user' | 'assistant'
interface ChatMessage { role: Role; content: string }

/* ---------- Runtime hint (edge = super-low latency) ---------- */
export const runtime = 'edge'

/* ---------- POST handler ---------- */
export async function POST(req: Request): Promise<Response> {
    /* 1️⃣ parse body */
    let messages: ChatMessage[]
    try {
        ({ messages } = (await req.json()) as { messages: ChatMessage[] })
        if (!messages?.length) throw new Error()
    } catch {
        return json({ error: 'Bad request – expected { messages: [...] }' }, 400)
    }

    /* 2️⃣ forward to Mistral */
    const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method : 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization : `Bearer ${process.env.MISTRAL_API_KEY ?? ''}`,
        },
        body: JSON.stringify({
            model : 'mistral-large-latest',   // pick any supported model
            stream: true,                     // ← SSE
            messages,
        }),
    })

    if (!upstream.ok || !upstream.body)
        return json({ error: 'Mistral upstream error' }, upstream.status)

    /* 3️⃣ pipe the SSE stream directly back */
    return new Response(upstream.body, {
        status : 200,
        headers: {
            'Content-Type'              : 'text/event-stream; charset=utf-8',
            'Cache-Control'             : 'no-cache, no-transform',
            Connection                  : 'keep-alive',
            'Access-Control-Allow-Origin': '*', // relax CORS if you need
        },
    })
}

/* ---------- helper for small JSON errors ---------- */
function json(obj: unknown, status = 200): Response {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}
