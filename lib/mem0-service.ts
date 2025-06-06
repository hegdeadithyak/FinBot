/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import axios from "axios"
import { prisma } from "./prisma"

interface Mem0Config {
  apiKey: string
  baseUrl?: string
}

interface MemoryEntry {
  id: string
  content: string
  metadata?: Record<string, any>
  score?: number
}

interface SearchOptions {
  limit?: number
  threshold?: number
  filters?: Record<string, any>
}

export class Mem0Service {
  private apiKey: string
  private baseUrl: string

  constructor(config: Mem0Config) {
    this.apiKey = "m0-Fm2JAB9n9b1GwWsU7CPxo5FzQjvjvjCb85n8OcoI"
    this.baseUrl = config.baseUrl || "https://api.mem0.ai/v1"
  }

  // Store memory in Mem0 and sync with database
  async storeMemory(
    userId: string,
    content: string,
    category: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    try {
      // Store in Mem0
      const response = await axios.post(
        `${this.baseUrl}/memories`,
        {
          content,
          user_id: userId,
          metadata: {
            category,
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      const memoryId = response.data.id

      // Store reference in database
      await prisma.contextEntry.create({
        data: {
          userId,
          memoryId,
          content,
          category,
          metadata,
          importance: this.calculateImportance(content, category),
        },
      })

      return memoryId
    } catch (error) {
      console.error("Error storing memory:", error)
      throw new Error("Failed to store memory")
    }
  }

  async retrieveMemories(userId: string, query: string, options: SearchOptions = {}): Promise<MemoryEntry[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/memories/search`,
        {
          query,
          user_id: userId,
          limit: options.limit || 10,
          threshold: options.threshold || 0.7,
          filters: options.filters,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      return response.data.memories || []
    } catch (error) {
      console.error("Error retrieving memories:", error)
      return []
    }
  }

  // Get user context for chat
  async getUserContext(
    userId: string,
    query: string,
  ): Promise<{
    memories: MemoryEntry[]
    bankingInfo: any
    recentTransactions: any[]
  }> {
    try {
      // Get relevant memories
      const memories = await this.retrieveMemories(userId, query, {
        limit: 5,
        threshold: 0.6,
      })

      // Get banking profile
      const bankingProfiles = await prisma.bankingProfile.findMany({
        where: { userId, isActive: true },
        include: {
          transactions: {
            orderBy: { transactionDate: "desc" },
            take: 10,
          },
        },
      })

      // Get recent chat context
      const recentMessages = await prisma.message.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          chatSession: true,
        },
      })

      return {
        memories,
        bankingInfo: bankingProfiles,
        recentTransactions: bankingProfiles.flatMap((profile) => profile.transactions),
      }
    } catch (error) {
      console.error("Error getting user context:", error)
      return {
        memories: [],
        bankingInfo: [],
        recentTransactions: [],
      }
    }
  }

  // Store chat message and extract important information
  async processChatMessage(
    userId: string,
    chatSessionId: string,
    role: "USER" | "ASSISTANT",
    content: string,
    language?: string,
  ): Promise<void> {
    try {
      // Store message in database
      const message = await prisma.message.create({
        data: {
          userId,
          chatSessionId,
          role,
          content,
          language,
        },
      })

      // Extract and store important information
      if (role === "USER") {
        await this.extractAndStoreContext(userId, content)
      }

      // Update chat session
      await prisma.chatSession.update({
        where: { id: chatSessionId },
        data: { updatedAt: new Date() },
      })
    } catch (error) {
      console.error("Error processing chat message:", error)
    }
  }

  // Extract important context from user messages
  private async extractAndStoreContext(userId: string, content: string): Promise<void> {
    const lowerContent = content.toLowerCase()

    // Banking-specific context extraction
    const contextPatterns = [
      {
        pattern: /account.*balance|balance.*account|how much.*have/i,
        category: "account_inquiry",
      },
      {
        pattern: /transfer.*money|send.*money|wire.*transfer/i,
        category: "transfer_intent",
      },
      {
        pattern: /loan.*application|apply.*loan|need.*loan/i,
        category: "loan_interest",
      },
      {
        pattern: /credit.*card|card.*payment|card.*help/i,
        category: "credit_card",
      },
      {
        pattern: /investment|invest|portfolio|stocks|bonds/i,
        category: "investment",
      },
      {
        pattern: /mortgage|home.*loan|property.*loan/i,
        category: "mortgage",
      },
    ]

    for (const { pattern, category } of contextPatterns) {
      if (pattern.test(content)) {
        await this.storeMemory(userId, content, category, {
          extractedAt: new Date().toISOString(),
          confidence: 0.8,
        })
        break
      }
    }

    // Store general conversation context
    if (content.length > 50) {
      await this.storeMemory(userId, content, "general_conversation", {
        length: content.length,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // Calculate importance score for memory
  private calculateImportance(content: string, category: string): number {
    let importance = 1.0

    // Category-based importance
    const categoryWeights: Record<string, number> = {
      account_inquiry: 1.5,
      transfer_intent: 1.8,
      loan_interest: 1.7,
      credit_card: 1.4,
      investment: 1.6,
      mortgage: 1.9,
      general_conversation: 1.0,
    }

    importance *= categoryWeights[category] || 1.0

    // Content-based importance
    const importantKeywords = [
      "urgent",
      "important",
      "help",
      "problem",
      "issue",
      "money",
      "payment",
      "transfer",
      "loan",
      "credit",
    ]

    const keywordCount = importantKeywords.filter((keyword) => content.toLowerCase().includes(keyword)).length

    importance += keywordCount * 0.1

    // Length-based importance (longer messages might be more detailed)
    if (content.length > 100) {
      importance += 0.2
    }

    return Math.min(importance, 2.0) // Cap at 2.0
  }

  // Delete memory
  async deleteMemory(userId: string, memoryId: string): Promise<void> {
    try {
      // Delete from Mem0
      await axios.delete(`${this.baseUrl}/memories/${memoryId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      // Delete from database
      await prisma.contextEntry.delete({
        where: { memoryId },
      })
    } catch (error) {
      console.error("Error deleting memory:", error)
    }
  }

  // Update memory
  async updateMemory(memoryId: string, content: string, metadata?: Record<string, any>): Promise<void> {
    try {
      // Update in Mem0
      await axios.put(
        `${this.baseUrl}/memories/${memoryId}`,
        {
          content,
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      )

      // Update in database
      await prisma.contextEntry.update({
        where: { memoryId },
        data: {
          content,
          metadata,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error("Error updating memory:", error)
    }
  }
}
