/**
 * @Author: Adithya
 * @Date:   2025-06-04
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-04
 */
import { type NextRequest, NextResponse } from "next/server"
import { SerpService } from "@/lib/serp-service"

const serpService = new SerpService(process.env.SERP_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { query, type = "web", options = {} } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    if (!process.env.SERP_API_KEY) {
      return NextResponse.json({ error: "SERP API key not configured" }, { status: 500 })
    }

    let results: any[] = []

    switch (type) {
      case "banking":
        results = await serpService.searchBanking(query)
        break
      case "news":
        results = await serpService.searchNews(query)
        break
      case "web":
      default:
        results = await serpService.search(query, options)
        break
    }

    return NextResponse.json({
      query,
      type,
      results,
      count: results.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Search API error:", error)
    return NextResponse.json(
      {
        error: error.message || "Search failed",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const type = searchParams.get("type") || "web"

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
  }

  try {
    const results = await serpService.search(query, {
      num: Number.parseInt(searchParams.get("num") || "10"),
      location: searchParams.get("location") || "United States",
      language: searchParams.get("hl") || "en",
    })

    return NextResponse.json({
      query,
      results,
      count: results.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Search GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
