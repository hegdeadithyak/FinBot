/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-03
 */
import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { EnhancedSearchService } from "@/lib/enhanced-search-service"

const searchService = new EnhancedSearchService()

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session-token")?.value
    if (!sessionToken) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    const user = await AuthService.getUserBySession(sessionToken)
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid session" }, { status: 401 })
    }

    const { query, options = {} } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ success: false, message: "Query is required" }, { status: 400 })
    }

    console.log(`Processing search query for user ${user.id}: ${query}`)

    const result = await searchService.searchWithFallback(query, user.id, {
      includeVector: options.includeVector !== false,
      includeWeb: options.includeWeb !== false,
      includeMemory: options.includeMemory !== false,
      includeBanking: options.includeBanking !== false,
      maxResults: options.maxResults || 10,
      fallbackToWeb: options.fallbackToWeb !== false,
    })

    console.log(`Search completed. Strategy: ${result.searchStrategy.join(" -> ")}`)
    console.log(`Sources found: ${result.sources.length}, Confidence: ${(result.context.confidence * 100).toFixed(1)}%`)

    return NextResponse.json({
      success: true,
      response: result.response,
      sources: result.sources,
      metadata: {
        confidence: result.context.confidence,
        searchStrategy: result.searchStrategy,
        sourceCount: {
          vector: result.context.vectorResults.length,
          web: result.context.webResults.length,
          memory: result.context.memoryResults.length,
          banking: result.context.bankingData.length,
        },
      },
    })
  } catch (error) {
    console.error("Enhanced search API error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Search failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
