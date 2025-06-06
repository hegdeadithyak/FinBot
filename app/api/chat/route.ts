/**
 * @Author: Adithya
 * @Date:   2025-06-04
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-04
 */
import type { NextRequest } from "next/server"
import { MistralAgent } from "@/lib/mistral-agent"

const agent = new MistralAgent(process.env.MISTRAL_API_KEY || "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ")

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "'messages' array is required and cannot be empty." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const stream = await agent.stream(messages)

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }

          const doneData = `data: [DONE]\n\n`
          controller.enqueue(encoder.encode(doneData))
          controller.close()
        } catch (error) {
          console.error("Streaming error:", error)
          const errorData = `data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error: any) {
    console.error("Streaming setup error:", error)
    return new Response(JSON.stringify({ error: "Failed to setup streaming" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
