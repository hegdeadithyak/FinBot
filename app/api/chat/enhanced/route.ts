/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { Mem0Service } from "@/lib/mem0-service"
import { prisma } from "@/lib/prisma"
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

// Initialize Mem0 service
const mem0Service = new Mem0Service({
  apiKey: process.env.MEM0_API_KEY || "",
})

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const sessionToken = request.cookies.get("session-token")?.value
    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 },
      )
    }

    const user = await AuthService.getUserBySession(sessionToken)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid session",
        },
        { status: 401 },
      )
    }

    const { messages, chatSessionId } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Messages array is required",
        },
        { status: 400 },
      )
    }

    // Get or create chat session
    let chatSession
    if (chatSessionId) {
      chatSession = await prisma.chatSession.findUnique({
        where: { id: chatSessionId, userId: user.id },
      })
    }

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId: user.id,
          title: messages[0]?.content?.substring(0, 50) + "..." || "New Chat",
          language: user.preferredLanguage,
        },
      })
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1]
    if (latestMessage.role === "user") {
      // Store user message
      await mem0Service.processChatMessage(
        user.id,
        chatSession.id,
        "USER",
        latestMessage.content,
        user.preferredLanguage,
      )
    }

    // Get user context from Mem0
    const context = await mem0Service.getUserContext(user.id, latestMessage.content)

    // Build enhanced system prompt with context
    const systemPrompt = `You are FinBot, an intelligent banking assistant. Here's what you know about the user:

User Profile:
- Name: ${user.firstName || "User"}
- Preferred Language: ${user.preferredLanguage}
- Banking Customer

Recent Context:
${context.memories.map((memory) => `- ${memory.content}`).join("\n")}

Banking Information:
${context.bankingInfo
  .map(
    (profile: any) =>
      `- Account: ${profile.accountType} (${profile.accountNumber}) - Balance: ${profile.balance} ${profile.currency}`,
  )
  .join("\n")}

Recent Transactions:
${context.recentTransactions
  .slice(0, 5)
  .map((tx: any) => `- ${tx.type}: ${tx.amount} ${tx.currency} - ${tx.description} (${tx.transactionDate})`)
  .join("\n")}

Instructions:
1. Use the context above to provide personalized responses
2. Be helpful, professional, and secure
3. Never share sensitive information unless specifically requested
4. If you need more information, ask clarifying questions
5. Respond in ${user.preferredLanguage} if it's not English
6. Remember previous conversations and user preferences`

    // Prepare messages with system prompt
    const enhancedMessages = [{ role: "system", content: systemPrompt }, ...messages]

    // Generate response with AI SDK
    const result = streamText({
      model: openai("gpt-4o"),
      messages: enhancedMessages,
      maxSteps: 5,
      temperature: 0.7,
    })

    // Store the response when streaming is complete
    result.text.then(async (responseText:any) => {
        //@ts-ignore
      await mem0Service.processChatMessage(user.id, chatSession.id, "ASSISTANT", responseText, user.preferredLanguage)
    })

    return result.toDataStreamResponse({
      sendReasoning: false,
      headers: {
        "X-Chat-Session-Id": chatSession.id,
      },
    })
  } catch (error) {
    console.error("Enhanced chat error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Chat processing failed",
      },
      { status: 500 },
    )
  }
}
