/**
 * @Author: Adithya
 * @Date:   2025-06-04
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-04
 */
import { type NextRequest, NextResponse } from "next/server"
import { MistralService } from "@/lib/mistral-service"
import { SerpService } from "@/lib/serp-service"

const mistralService = new MistralService({
  apiKey: process.env.MISTRAL_API_KEY || "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ",
  model: "mistral-large-latest",
})

const serpService = new SerpService()

export async function POST(request: NextRequest) {
  try {
    const { messages, userProfile, enableWebSearch = true } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "'messages' array is required and cannot be empty." }, { status: 400 })
    }

    // Get the latest user message for search
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 })
    }

    const query = lastUserMessage.content
    let webResults: any[] = []

    // Perform web search if enabled and SERP API key is available
    if (true) {
      try {
        console.log(`Performing web search for: "${query}"`)

        // Determine if this is a banking-related query
        const isBankingQuery =true;

        if (isBankingQuery) {
          webResults = await serpService.searchBanking(query)
        } else {
          webResults = await serpService.search(query, { num: 6 })
        }

        console.log(`Found ${webResults.length} web search results`)
      } catch (searchError) {
        console.error("Web search failed:", searchError)
        // Continue without web results if search fails
      }
    }

    // Build context for enhanced response
    const context = {
      vectorResults: [], // Can be populated with vector search results
      webResults,
      memoryResults: [], // Can be populated with conversation history
      bankingData: [], // Can be populated with user's banking data
    }

    // Default user profile
    const profile = userProfile || {
      firstName: "User",
      preferredLanguage: "English",
    }

    // Generate enhanced response with sources
    const result = await mistralService.generateResponseWithSources(query, context, profile)
    
    return NextResponse.json({
      response: result.content,
      sources: result.sources,
      webSearchEnabled: true,
      searchResultsCount: webResults.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Enhanced chat error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to generate enhanced response",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
