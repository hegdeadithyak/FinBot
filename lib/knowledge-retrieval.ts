/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import { SerpService } from "./serp-service"
import { PineconeService } from "./pinecone-service"
import { Mem0Service } from "./mem0-service"
import { prisma } from "./prisma"

interface RetrievalContext {
  webResults: any[]
  vectorResults: any[]
  memoryResults: any[]
  bankingData: any[]
  confidence: number
}

interface KnowledgeQuery {
  query: string
  userId: string
  category?: string
  includeWeb?: boolean
  includeVector?: boolean
  includeMemory?: boolean
  maxResults?: number
}

export class KnowledgeRetrievalService {
  private serpService: SerpService
  private pineconeService: PineconeService
  private mem0Service: Mem0Service

  constructor() {
    this.serpService = new SerpService({
      apiKey: process.env.SERP_API_KEY || "",
    })

    this.pineconeService = new PineconeService({
      apiKey: process.env.PINECONE_API_KEY || "",
      environment: process.env.PINECONE_ENVIRONMENT || "",
      indexName: process.env.PINECONE_INDEX_NAME || "finbot-index",
      namespace: process.env.PINECONE_NAMESPACE || "default",
      dimension: Number(process.env.PINECONE_DIMENSION || "1536"),
    })

    this.mem0Service = new Mem0Service({
      apiKey: process.env.MEM0_API_KEY || "",
    })
  }

  // Initialize all services
  async initialize(): Promise<void> {
    try {
      await this.pineconeService.createIndexIfNotExists()
      console.log("Knowledge retrieval service initialized")
    } catch (error) {
      console.error("Error initializing knowledge retrieval:", error)
    }
  }

  // Comprehensive knowledge retrieval
  async retrieveKnowledge(query: KnowledgeQuery): Promise<RetrievalContext> {
    const {
      query: searchQuery,
      userId,
      category = "general",
      includeWeb = true,
      includeVector = true,
      includeMemory = true,
      maxResults = 10,
    } = query

    const context: RetrievalContext = {
      webResults: [],
      vectorResults: [],
      memoryResults: [],
      bankingData: [],
      confidence: 0,
    }

    try {
      // Parallel retrieval from all sources
      const retrievalPromises: Promise<any>[] = []

      // 1. Web search (SERP API)
      if (includeWeb) {
        retrievalPromises.push(this.retrieveWebKnowledge(searchQuery, category))
      }

      // 2. Vector search (Pinecone)
      if (includeVector) {
        retrievalPromises.push(this.retrieveVectorKnowledge(userId, searchQuery, maxResults))
      }

      // 3. Memory retrieval (Mem0)
      if (includeMemory) {
        retrievalPromises.push(this.retrieveMemoryKnowledge(userId, searchQuery))
      }

      // 4. Banking data
      retrievalPromises.push(this.retrieveBankingData(userId, searchQuery))

      const results = await Promise.allSettled(retrievalPromises)

      // Process results
      let resultIndex = 0

      if (includeWeb && results[resultIndex]) {
        const webResult = results[resultIndex].status === "fulfilled" ? results[resultIndex].value : []
        context.webResults = webResult
        resultIndex++
      }

      if (includeVector && results[resultIndex]) {
        const vectorResult = results[resultIndex].status === "fulfilled" ? results[resultIndex].value : []
        context.vectorResults = vectorResult
        resultIndex++
      }

      if (includeMemory && results[resultIndex]) {
        const memoryResult = results[resultIndex].status === "fulfilled" ? results[resultIndex].value : []
        context.memoryResults = memoryResult
        resultIndex++
      }

      if (results[resultIndex]) {
        const bankingResult = results[resultIndex].status === "fulfilled" ? results[resultIndex].value : []
        context.bankingData = bankingResult
      }

      // Calculate confidence score
      context.confidence = this.calculateConfidence(context)

      // Store retrieval for analytics
      await this.storeRetrievalAnalytics(userId, searchQuery, context)

      return context
    } catch (error) {
      console.error("Error in knowledge retrieval:", error)
      return context
    }
  }

  // Retrieve web knowledge using SERP API
  private async retrieveWebKnowledge(query: string, category: string): Promise<any[]> {
    try {
      // Determine search strategy based on category
      let searchResults: any[] = []

      if (category === "financial" || category === "banking") {
        // Search for financial information
        const bankingInfo = await this.serpService.searchBankingInfo(query)
        const newsResults = await this.serpService.searchFinancialNews(query)

        searchResults = [
          ...bankingInfo.results.map((r) => ({ ...r, type: "banking_info" })),
          ...newsResults.map((r) => ({ ...r, type: "financial_news" })),
        ]

        // Add answer box if available
        if (bankingInfo.answerBox) {
          searchResults.unshift({
            ...bankingInfo.answerBox,
            type: "answer_box",
            position: 0,
          })
        }
      } else {
        // General web search
        const response = await this.serpService.search(query)
        searchResults = response.organicResults?.map((r) => ({ ...r, type: "web_result" })) || []
      }

      return searchResults.slice(0, 5) // Limit results
    } catch (error) {
      console.error("Error retrieving web knowledge:", error)
      return []
    }
  }

  // Retrieve vector knowledge using Pinecone
  private async retrieveVectorKnowledge(userId: string, query: string, maxResults: number): Promise<any[]> {
    try {
      // Search user's indexed documents
      const userResults = await this.pineconeService.searchUserDocuments(userId, query, maxResults)

      // Also search general knowledge base
      const [queryEmbedding] = await this.pineconeService.getEmbeddings([query])
      const generalResults = await this.pineconeService.search(queryEmbedding, {
        k: maxResults,
        filter: { type: "general_knowledge" },
      })

      // Combine and deduplicate results
      const allResults = [...userResults, ...generalResults]
      const uniqueResults = allResults.filter(
        (result, index, self) => index === self.findIndex((r) => r.id === result.id),
      )

      return uniqueResults.slice(0, maxResults)
    } catch (error) {
      console.error("Error retrieving vector knowledge:", error)
      return []
    }
  }

  // Retrieve memory knowledge using Mem0
  private async retrieveMemoryKnowledge(userId: string, query: string): Promise<any[]> {
    try {
      const memories = await this.mem0Service.retrieveMemories(userId, query, {
        limit: 5,
        threshold: 0.6,
      })

      return memories.map((memory) => ({
        ...memory,
        type: "memory",
      }))
    } catch (error) {
      console.error("Error retrieving memory knowledge:", error)
      return []
    }
  }

  // Retrieve banking data
  private async retrieveBankingData(userId: string, query: string): Promise<any[]> {
    try {
      const lowerQuery = query.toLowerCase()
      const results: any[] = []

      // Search banking profiles
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
      console.error("Error retrieving banking data:", error)
      return []
    }
  }

  // Calculate confidence score based on retrieval results
  private calculateConfidence(context: RetrievalContext): number {
    let confidence = 0
    let sources = 0

    // Web results confidence
    if (context.webResults.length > 0) {
      confidence += 0.3
      sources++
    }

    // Vector results confidence
    if (context.vectorResults.length > 0) {
      const avgScore = context.vectorResults.reduce((sum, r) => sum + (r.score || 0), 0) / context.vectorResults.length
      confidence += avgScore * 0.4
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

    // Normalize by number of sources
    return sources > 0 ? Math.min(confidence / sources, 1.0) : 0
  }

  // Store retrieval analytics
  private async storeRetrievalAnalytics(userId: string, query: string, context: RetrievalContext): Promise<void> {
    try {
      await prisma.retrievalAnalytics.create({
        data: {
          userId,
          query,
          webResultCount: context.webResults.length,
          vectorResultCount: context.vectorResults.length,
          memoryResultCount: context.memoryResults.length,
          bankingResultCount: context.bankingData.length,
          confidence: context.confidence,
          retrievalTime: new Date(),
        },
      })
    } catch (error) {
      console.error("Error storing retrieval analytics:", error)
    }
  }

  // Index web content for future retrieval
  async indexWebContent(userId: string, webResults: any[]): Promise<void> {
    try {
      const documents = webResults.map((result) => ({
        content: `${result.title}\n${result.snippet}`,
        metadata: {
          type: "web_content",
          url: result.link,
          title: result.title,
          source: result.source || "web",
          indexedAt: new Date().toISOString(),
          userId,
        },
      }))

      await this.pineconeService.indexUserDocuments(userId, documents)
    } catch (error) {
      console.error("Error indexing web content:", error)
    }
  }

  // Get personalized recommendations
  async getPersonalizedRecommendations(userId: string): Promise<any[]> {
    try {
      // Get user's recent queries and interests
      const recentQueries = await prisma.retrievalAnalytics.findMany({
        where: { userId },
        orderBy: { retrievalTime: "desc" },
        take: 10,
      })

      const interests = recentQueries.map((q) => q.query).join(" ")

      // Search for related financial news and information
      const recommendations = await this.serpService.searchFinancialNews(interests, {
        num: 5,
        timeRange: "qdr:d", // Past day
      })

      return recommendations.map((rec) => ({
        ...rec,
        type: "recommendation",
        relevance: "high",
      }))
    } catch (error) {
      console.error("Error getting recommendations:", error)
      return []
    }
  }
}
