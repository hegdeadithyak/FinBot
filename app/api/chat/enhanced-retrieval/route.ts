/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { KnowledgeRetrievalService } from "@/lib/knowledge-retrieval"
import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

// Initialize knowledge retrieval service
const knowledgeService = new KnowledgeRetrievalService()

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const sessionToken = request.cookies.get("session-token")?.value
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    const user = await AuthService.getUserBySession(sessionToken)
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid session" }, { status: 401 })
    }

    const { messages, chatSessionId, includeWeb = true, includeVector = true } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, message: "Messages array is required" }, { status: 400 })
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1]
    if (latestMessage.role !== "user") {
      return NextResponse.json({ success: false, message: "Last message must be from user" }, { status: 400 })
    }

    // Determine query category
    const query = latestMessage.content
    const category = this.categorizeQuery(query)

    // Retrieve comprehensive knowledge
    const context = await knowledgeService.retrieveKnowledge({
      query,
      userId: user.id,
      category,
      includeWeb,
      includeVector,
      includeMemory: true,
      maxResults: 10,
    })

    // Build enhanced system prompt with all retrieved context
    const systemPrompt = this.buildEnhancedPrompt(user, context, category)

    // Prepare messages with enhanced context
    const enhancedMessages = [{ role: "system", content: systemPrompt }, ...messages]

    // Generate response with AI SDK
    const result = streamText({
      model: openai("gpt-4o"),
      messages: enhancedMessages,
      maxSteps: 5,
      temperature: 0.7,
    })

    // Index web content for future use (async)
    if (context.webResults.length > 0) {
      knowledgeService.indexWebContent(user.id, context.webResults).catch(console.error)
    }

    return result.toDataStreamResponse({
      headers: {
        "X-Chat-Session-Id": chatSessionId || "new",
        "X-Context-Confidence": context.confidence.toString(),
        "X-Sources-Used": JSON.stringify({
          web: context.webResults.length,
          vector: context.vectorResults.length,
          memory: context.memoryResults.length,
          banking: context.bankingData.length,
        }),
      },
    })
  } catch (error) {
    console.error("Enhanced retrieval chat error:", error)
    return NextResponse.json({ success: false, message: "Chat processing failed" }, { status: 500 })
  }
}

// Helper method to categorize queries
function categorizeQuery(query: string): string {
  const lowerQuery = query.toLowerCase()

  if (
    lowerQuery.includes("account") ||
    lowerQuery.includes("balance") ||
    lowerQuery.includes("transaction") ||
    lowerQuery.includes("transfer")
  ) {
    return "banking"
  }

  if (
    lowerQuery.includes("loan") ||
    lowerQuery.includes("credit") ||
    lowerQuery.includes("mortgage") ||
    lowerQuery.includes("investment")
  ) {
    return "financial"
  }

  if (
    lowerQuery.includes("news") ||
    lowerQuery.includes("market") ||
    lowerQuery.includes("stock") ||
    lowerQuery.includes("economy")
  ) {
    return "financial_news"
  }

  return "general"
}

// Helper method to build enhanced prompt
function buildEnhancedPrompt(user: any, context: any, category: string): string {
  let prompt = `You are FinBot, an intelligent banking assistant with access to comprehensive knowledge sources.

User Profile:
- Name: ${user.firstName || "User"}
- Preferred Language: ${user.preferredLanguage}
- Query Category: ${category}

RETRIEVED CONTEXT (Confidence: ${(context.confidence * 100).toFixed(1)}%):

`

  // Add web search results
  if (context.webResults.length > 0) {
    prompt += `\nWEB SEARCH RESULTS:\n`
    context.webResults.slice(0, 3).forEach((result: any, index: number) => {
      prompt += `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.link}\n\n`
    })
  }

  // Add vector search results
  if (context.vectorResults.length > 0) {
    prompt += `\nRELEVANT DOCUMENTS:\n`
    context.vectorResults.slice(0, 3).forEach((result: any, index: number) => {
      prompt += `${index + 1}. ${result.content.substring(0, 200)}...\n   Relevance: ${(result.score * 100).toFixed(1)}%\n\n`
    })
  }

  // Add memory results
  if (context.memoryResults.length > 0) {
    prompt += `\nUSER CONVERSATION HISTORY:\n`
    context.memoryResults.slice(0, 3).forEach((memory: any, index: number) => {
      prompt += `${index + 1}. ${memory.content}\n\n`
    })
  }

  // Add banking data
  if (context.bankingData.length > 0) {
    prompt += `\nUSER BANKING DATA:\n`
    context.bankingData.forEach((data: any, index: number) => {
      if (data.type === "account_info") {
        prompt += `Account: ${data.accountType} - Balance: ${data.balance} ${data.currency}\n`
      } else if (data.type === "transaction") {
        prompt += `Transaction: ${data.description} - ${data.amount} ${data.currency} (${data.transactionDate})\n`
      }
    })
  }

  prompt += `\nINSTRUCTIONS:
    1. Use the retrieved context to provide accurate, up-to-date information
    2. Cite sources when using web search results
    3. Be specific about banking information when available
    4. If information is uncertain, clearly state the confidence level
    5. Respond in ${user.preferredLanguage} if it's not English
    6. Prioritize user's personal banking data over general information
    7. For financial advice, always recommend consulting with financial professionals

Remember: You have access to real-time web data, user's personal banking information, and conversation history. Use this comprehensive context to provide the most helpful and accurate response possible.`

  return prompt
}
