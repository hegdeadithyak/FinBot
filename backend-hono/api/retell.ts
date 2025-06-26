import { Hono } from 'hono'
import { websocket } from 'hono/ws'
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

retell.get(
  '/llm-websocket/:call_id',
  websocket(async (ws, ctx) => {
    const callId = ctx.req.param('call_id')
    console.log('Retell websocket connected:', callId)
    const config: CustomLlmResponse = {
      response_type: 'config',
      config: { auto_reconnect: true, call_details: true },
    }
    ws.send(JSON.stringify(config))

    ws.on('message', async (data: string) => {
      try {
        const req = JSON.parse(data) as CustomLlmRequest
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
    })
  })
)

export default retell
