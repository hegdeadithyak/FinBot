import { Hono } from 'hono'
import {
  defineWebSocketHelper,
  WSContext,
} from 'hono/helper/websocket'
import { MistralService } from '../../lib/mistral-service'
import {
  CustomLlmRequest,
  CustomLlmResponse,
  Utterance,
} from '../../lib/retell-types'

const mistral = new MistralService({
  apiKey: process.env.MISTRAL_API_KEY || '',
})

const SYSTEM_PROMPT =
  'You are FinBot, an intelligent banking assistant. Answer user questions clearly and concisely.'

const retell = new Hono()

/**
 * Convert Retell transcript entries to Mistral chat messages.
 */
function toChatMessages(transcript: Utterance[]) {
  return transcript.map((t) => ({
    role: t.role === 'agent' ? 'assistant' : t.role,
    content: t.content,
  }))
}

const retellSocket = defineWebSocketHelper<WebSocket>(async (c, events) => {
  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return
  }

  const pair = new WebSocketPair()
  const client = pair[0]
  const server = pair[1]

  const wsContext = new WSContext({
    raw: server,
    send: source => server.send(source),
    close: (code, reason) => server.close(code, reason),
    get readyState() {
      return server.readyState
    },
    get protocol() {
      return server.protocol
    },
    url: server.url ? new URL(server.url) : null,
  })

  if (events.onClose) {
    server.addEventListener('close', evt => events.onClose?.(evt, wsContext))
  }
  if (events.onMessage) {
    server.addEventListener('message', evt => events.onMessage?.(evt, wsContext))
  }
  if (events.onError) {
    server.addEventListener('error', evt => events.onError?.(evt, wsContext))
  }

  server.accept()
  events.onOpen?.(new Event('open'), wsContext)
  return new Response(null, { status: 101, webSocket: client })
})

retell.get('/llm-websocket/:call_id', retellSocket(c => {
  const callId = c.req.param('call_id')
  console.log('Retell websocket connected:', callId)

  const config: CustomLlmResponse = {
    response_type: 'config',
    config: { auto_reconnect: true, call_details: true },
  }

  return {
    onOpen: (_, ws) => {
      ws.send(JSON.stringify(config))
    },
    async onMessage(evt, ws) {
      try {
        const req = JSON.parse(evt.data as string) as CustomLlmRequest
        if (req.interaction_type === 'ping_pong') {
          const res: CustomLlmResponse = {
            response_type: 'ping_pong',
            timestamp: req.timestamp,
          }
          ws.send(JSON.stringify(res))
          return
        }
        if (req.interaction_type === 'call_details') {
          const res: CustomLlmResponse = {
            response_type: 'response',
            response_id: 0,
            content: 'Hello, how can I assist you today?',
            content_complete: true,
          }
          ws.send(JSON.stringify(res))
          return
        }
        if (
          req.interaction_type === 'response_required' ||
          req.interaction_type === 'reminder_required'
        ) {
          const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...toChatMessages(req.transcript),
          ]
          let full = ''
          for await (const chunk of mistral.streamResponse(messages)) {
            full += chunk
            const part: CustomLlmResponse = {
              response_type: 'response',
              response_id: req.response_id,
              content: chunk,
              content_complete: false,
            }
            ws.send(JSON.stringify(part))
          }
          const end: CustomLlmResponse = {
            response_type: 'response',
            response_id: req.response_id,
            content: full,
            content_complete: true,
          }
          ws.send(JSON.stringify(end))
        }
      } catch (err) {
        console.error('Retell ws error', err)
        ws.close(1011, 'server error')
      }
    },
    onClose: () => {
      console.log('Retell websocket closed:', callId)
    },
    onError: evt => {
      console.error('Retell ws error', evt)
    },
  }
}))

export default retell
