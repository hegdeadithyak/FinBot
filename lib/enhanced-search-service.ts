/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-04
 */
import { PineconeService } from "./pinecone-service"
import { SerpService } from "./serp-service"
import { Mem0Service } from "./mem0-service"
import { MistralService } from "./mistral-service"
import { prisma } from "./prisma"

interface SearchContext {
  vectorResults: any[]
  webResults: any[]
  memoryResults: any[]
  bankingData: any[]
  sources: any[]
  confidence: number
}

interface SearchOptions {
  includeVector?: boolean
  includeWeb?: boolean
  includeMemory?: boolean
  includeBanking?: boolean
  maxResults?: number
  fallbackToWeb?: boolean
}

export class EnhancedSearchService {
  private pineconeService: PineconeService
  private serpService: SerpService
  private mem0Service: Mem0Service
  private mistralService: MistralService

  constructor() {
    this.pineconeService = new PineconeService({
      apiKey: process.env.PINECONE_API_KEY || "",
      environment: process.env.PINECONE_ENVIRONMENT || "",
      indexName: process.env.PINECONE_INDEX_NAME || "finbot-index",
      namespace: process.env.PINECONE_NAMESPACE || "default",
    })

    this.serpService = new SerpService({
      apiKey: process.env.SERP_API_KEY || "",
    })

    this.mem0Service = new Mem0Service({
      apiKey: process.env.MEM0_API_KEY || "",
    })

    this.mistralService = new MistralService({
      apiKey: process.env.MISTRAL_API_KEY || "",
      model: "mistral-large-latest",
    })
  }

  // Enhanced search with fallback mechanism
  async searchWithFallback(
    query: string,
    userId: string,
    options: SearchOptions = {},
  ): Promise<{
    response: string
    sources: any[]
    context: SearchContext
    searchStrategy: string[]
  }> {
    const {
      includeVector = true,
      includeWeb = true,
      includeMemory = true,
      includeBanking = true,
      maxResults = 10,
      fallbackToWeb = true,
    } = options

    const context: SearchContext = {
      vectorResults: [],
      webResults: [],
      memoryResults: [],
      bankingData: [],
      sources: [],
      confidence: 0,
    }

    const searchStrategy: string[] = []

    try {
      // Get user profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error("User not found")
      }

      // 1. Try Pinecone vector search first
      if (includeVector) {
        try {
          console.log("Searching Pinecone for:", query)
          const vectorResults = await this.pineconeService.searchUserDocuments(userId, query, maxResults)
          context.vectorResults = vectorResults
          searchStrategy.push("pinecone")

          if (vectorResults.length > 0) {
            console.log(`Found ${vectorResults.length} results in Pinecone`)
          }
        } catch (error) {
          console.error("Pinecone search failed:", error)
          searchStrategy.push("pinecone_failed")
        }
      }

      // 2. Search memory (Mem0)
      if (includeMemory) {
        try {
          const memoryResults = await this.mem0Service.retrieveMemories(userId, query, {
            limit: 5,
            threshold: 0.6,
          })
          context.memoryResults = memoryResults
          searchStrategy.push("memory")
        } catch (error) {
          console.error("Memory search failed:", error)
          searchStrategy.push("memory_failed")
        }
      }

      // 3. Search banking data
      if (includeBanking) {
        try {
          const bankingData = await this.searchBankingData(userId, query)
          context.bankingData = bankingData
          searchStrategy.push("banking")
        } catch (error) {
          console.error("Banking search failed:", error)
          searchStrategy.push("banking_failed")
        }
      }

      // 4. Fallback to web search if no good results from vector search
      const hasGoodVectorResults = context.vectorResults.some((result) => result.score > 0.7)
      const shouldSearchWeb = includeWeb && (fallbackToWeb || !hasGoodVectorResults)

      if (shouldSearchWeb) {
        try {
          console.log("Searching web for:", query)
          const webResults = await this.searchWeb(query)
          context.webResults = webResults
          searchStrategy.push("web")

          if (webResults.length > 0) {
            console.log(`Found ${webResults.length} web results`)
          }
        } catch (error) {
          console.error("Web search failed:", error)
          searchStrategy.push("web_failed")
        }
      }

      // Calculate confidence
      context.confidence = this.calculateConfidence(context)

      const { content: response, sources } = await this.mistralService.generateResponseWithSources(query, context, user)
      context.sources = sources
      await this.storeSearchAnalytics(userId, query, context, searchStrategy)

      return {
        response,
        sources,
        context,
        searchStrategy,
      }
    } catch (error) {
      console.error("Enhanced search failed:", error)

      const fallbackResponse = `I apologize, but I'm having trouble accessing my knowledge sources right now. However, I can still help you with general banking questions. Could you please rephrase your question or try again?`

      return {
        response: fallbackResponse,
        sources: [],
        context,
        searchStrategy: [...searchStrategy, "fallback"],
      }
    }
  }

  private async searchWeb(query: string): Promise<any[]> {
    try {
      const isFinancialQuery = this.isFinancialQuery(query)

      if (isFinancialQuery) {
        const [bankingInfo, newsResults] = await Promise.all([
          this.serpService.searchBankingInfo(query),
          this.serpService.searchFinancialNews(query, { num: 3 }),
        ])

        const results = [
          ...bankingInfo.results.map((r) => ({ ...r, type: "banking_info" })),
          ...newsResults.map((r) => ({ ...r, type: "bank_faqs" })),
        ]

        // Add answer box if available
        if (bankingInfo.answerBox) {
          results.unshift({
            ...bankingInfo.answerBox,
            type: "answer_box",
            position: 0,
          })
        }

        return results.slice(0, 5)
      } else {
        // General web search
        const response = await this.serpService.search(query, { num: 5 })
        return response.organicResults?.map((r) => ({ ...r, type: "web_result" })) || []
      }
    } catch (error) {
      console.error("Web search error:", error)
      return []
    }
  }

  private async searchBankingData(userId: string, query: string): Promise<any[]> {
    try {
      const lowerQuery = query.toLowerCase()
      const results: any[] = []

      if (lowerQuery.includes("account") || lowerQuery.includes("balance")) {
        const accounts = await prisma.bankingProfile.findMany({
          where: { userId, isActive: true },
          include: {
            transactions: {
              orderBy: { transactionDate: "desc" },
              take: 5,
            },
          },
        })
        results.push(...accounts.map((acc) => ({ ...acc, type: "account_info" })))
      }

      // Search transactions
      if (lowerQuery.includes("transaction") || lowerQuery.includes("payment") || lowerQuery.includes("transfer")) {
        const transactions = await prisma.transaction.findMany({
          where: {
            bankingProfile: { userId },
            OR: [
              { description: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
            ],
          },
          orderBy: { transactionDate: "desc" },
          take: 10,
          include: { bankingProfile: true },
        })
        results.push(...transactions.map((tx) => ({ ...tx, type: "transaction" })))
      }

      return results
    } catch (error) {
      console.error("Banking data search error:", error)
      return []
    }
  }

  // Check if query is financial/banking related
  private isFinancialQuery(query: string): boolean {
    const financialKeywords = [
      "bank",
      "banking",
      "account",
      "balance",
      "transaction",
      "transfer",
      "loan",
      "credit",
      "debit",
      "mortgage",
      "investment",
      "finance",
      "financial",
      "money",
      "payment",
      "savings",
      "checking",
      "interest",
      "rate",
      "fee",
    ]

    const lowerQuery = query.toLowerCase()
    return true;
  }

  // Calculate confidence score
  private calculateConfidence(context: SearchContext): number {
    let confidence = 0
    let sources = 0

    // Vector results confidence
    if (context.vectorResults.length > 0) {
      const avgScore = context.vectorResults.reduce((sum, r) => sum + (r.score || 0), 0) / context.vectorResults.length
      confidence += avgScore * 0.4
      sources++
    }

    // Web results confidence
    if (context.webResults.length > 0) {
      confidence += 0.3
      sources++
    }

    // Memory results confidence
    if (context.memoryResults.length > 0) {
      confidence += 0.2
      sources++
    }

    // Banking data confidence
    if (context.bankingData.length > 0) {
      confidence += 0.3
      sources++
    }

    return sources > 0 ? Math.min(confidence / sources, 1.0) : 0
  }

  // Store search analytics
  private async storeSearchAnalytics(
    userId: string,
    query: string,
    context: SearchContext,
    searchStrategy: string[],
  ): Promise<void> {
    try {
      await prisma.searchAnalytics.create({
        data: {
          userId,
          query,
          vectorResultCount: context.vectorResults.length,
          webResultCount: context.webResults.length,
          memoryResultCount: context.memoryResults.length,
          bankingResultCount: context.bankingData.length,
          confidence: context.confidence,
          searchStrategy: searchStrategy.join(","),
          searchTime: new Date(),
        },
      })
    } catch (error) {
      console.error("Error storing search analytics:", error)
    }
  }
}
