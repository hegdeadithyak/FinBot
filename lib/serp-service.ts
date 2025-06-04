/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-04
 */
interface SerpResult {
  title: string
  snippet: string
  link: string
  source?: string
  position?: number
}

interface SerpResponse {
  results: SerpResult[]
  searchParameters: {
    query: string
    location?: string
    language?: string
  }
}

export class SerpService {
  private apiKey: string
  private baseUrl = "https://serpapi.com/search"

  constructor() {
    this.apiKey = "0e2d204db305a2f0fb94dc6964dbc82412f5fe7a7837a17f44f3376709307217"
    this.baseUrl = "https://serpapi.com/search"
  }

  async search(
    query: string,
    options: {
      location?: string
      language?: string
      num?: number
      country?: string
    } = {},
  ): Promise<SerpResult[]> {
    try {
      const { location = "United States", language = "en", num = 10, country = "us" } = options

      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        engine: "google",
        location,
        hl: language,
        gl: country,
        num: num.toString(),
      })

      console.log(`Searching SERP API for: "${query}"`)

      const response = await fetch(`${this.baseUrl}?${params}`)

      if (!response.ok) {
        throw new Error(`SERP API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Extract organic results
      const organicResults = data.organic_results || []

      const results: SerpResult[] = organicResults.map((result: any, index: number) => ({
        title: result.title || "No title",
        snippet: result.snippet || result.description || "No description available",
        link: result.link || result.url || "#",
        source: this.extractDomain(result.link || result.url || ""),
        position: index + 1,
      }))

      console.log(`Found ${results.length} search results`)
      return results
    } catch (error) {
      console.error("SERP API search error:", error)
      throw new Error(`Failed to search: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Enhanced search for banking/financial queries
  async searchBanking(query: string): Promise<SerpResult[]> {
    const bankingQuery = `${query} banking finance financial services`
    return this.search(bankingQuery, {
      location: "United States",
      language: "en",
      num: 8,
    })
  }

  // Search for news related to banking/finance
  async searchNews(query: string): Promise<SerpResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        engine: "google_news",
        hl: "en",
        gl: "us",
        num: "5",
      })

      const response = await fetch(`${this.baseUrl}?${params}`)

      if (!response.ok) {
        throw new Error(`SERP News API error: ${response.status}`)
      }

      const data = await response.json()
      const newsResults = data.news_results || []

      return newsResults.map((result: any, index: number) => ({
        title: result.title || "No title",
        snippet: result.snippet || result.summary || "No summary available",
        link: result.link || "#",
        source: result.source || this.extractDomain(result.link || ""),
        position: index + 1,
      }))
    } catch (error) {
      console.error("SERP News search error:", error)
      return [] // Return empty array for news failures
    }
  }

  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname
      return domain.replace(/^www\./, "")
    } catch {
      return "Unknown source"
    }
  }
}

