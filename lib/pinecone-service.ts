/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-02
 */
import { PineconeClient, type RecordMetadata } from "@pinecone-database/pinecone"
import { prisma } from "./prisma"

interface VectorDocument {
  id: string
  content: string
  metadata: Record<string, any>
  embedding: number[]
}

interface SearchResult {
  id: string
  content: string
  metadata: Record<string, any>
  score: number
}

interface PineconeConfig {
  apiKey: string
  environment: string
  indexName: string
  namespace?: string
  dimension?: number
}

export class PineconeService {
  private client: PineconeClient
  private indexName: string
  private namespace: string
  private dimension: number
  private isInitialized = false

  constructor(config: PineconeConfig) {
    this.client = new PineconeClient()
    this.indexName = config.indexName
    this.namespace = config.namespace || "default"
    this.dimension = config.dimension || 1536

    // Initialize the client
    this.initialize(config.apiKey, config.environment).catch(console.error)
  }

  // Initialize Pinecone client
  private async initialize(apiKey: string, environment: string): Promise<void> {
    try {
      await this.client.init({
        apiKey,
        environment,
      })
      this.isInitialized = true
      console.log("Pinecone client initialized successfully")
    } catch (error) {
      console.error("Error initializing Pinecone client:", error)
      throw error
    }
  }

  // Ensure client is initialized
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Pinecone client not initialized")
    }
  }

  // Create index if it doesn't exist
  async createIndexIfNotExists(): Promise<void> {
    await this.ensureInitialized()

    try {
      // Check if index exists
      const indexes = await this.client.listIndexes()

      if (!indexes.includes(this.indexName)) {
        console.log(`Creating Pinecone index: ${this.indexName}`)

        // Create the index
        await this.client.createIndex({
          createRequest: {
            name: this.indexName,
            dimension: this.dimension,
            metric: "cosine",
          },
        })

        console.log(`Pinecone index ${this.indexName} created successfully`)
      } else {
        console.log(`Pinecone index ${this.indexName} already exists`)
      }
    } catch (error) {
      console.error("Error creating Pinecone index:", error)
      throw error
    }
  }

  // Add documents to Pinecone
  async addDocuments(documents: VectorDocument[]): Promise<void> {
    await this.ensureInitialized()

    try {
      // Get index
      const index = this.client.Index(this.indexName)

      // Store documents in database
      for (const doc of documents) {
        await prisma.vectorDocument.upsert({
          where: { id: doc.id },
          update: {
            content: doc.content,
            metadata: doc.metadata,
            updatedAt: new Date(),
          },
          create: {
            id: doc.id,
            content: doc.content,
            metadata: doc.metadata,
            embedding: [], // We don't need to store the embedding in the database when using Pinecone
          },
        })
      }

      // Prepare vectors for Pinecone
      const vectors = documents.map((doc) => ({
        id: doc.id,
        values: doc.embedding,
        metadata: {
          ...doc.metadata,
          content: doc.content.length > 1000 ? doc.content.substring(0, 1000) : doc.content, // Limit content size in metadata
        },
      }))

      // Upsert vectors in batches of 100
      const batchSize = 100
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize)
        await index.upsert({
          upsertRequest: {
            vectors: batch,
            namespace: this.namespace,
          },
        })
      }

      console.log(`Added ${documents.length} documents to Pinecone index ${this.indexName}`)
    } catch (error) {
      console.error("Error adding documents to Pinecone:", error)
      throw error
    }
  }

  // Search similar documents
  async search(
    queryEmbedding: number[],
    options: {
      k?: number
      threshold?: number
      filter?: Record<string, any>
      includeMetadata?: boolean
      includeValues?: boolean
    } = {},
  ): Promise<SearchResult[]> {
    await this.ensureInitialized()

    try {
      const { k = 10, threshold = 0.7, filter = {}, includeMetadata = true, includeValues = false } = options

      // Get index
      const index = this.client.Index(this.indexName)

      // Query Pinecone
      const queryResponse = await index.query({
        queryRequest: {
          vector: queryEmbedding,
          topK: k,
          includeMetadata,
          includeValues,
          filter,
          namespace: this.namespace,
        },
      })

      // Filter by threshold and format results
      const results: SearchResult[] = (queryResponse.matches || [])
        .filter((match:any) => (match.score || 0) >= threshold)
        .map((match:any) => {
          const metadata = match.metadata as RecordMetadata
          return {
            id: match.id,
            content: metadata.content as string,
            metadata: metadata,
            score: match.score || 0,
          }
        })

      return results
    } catch (error) {
      console.error("Error searching Pinecone index:", error)
      return []
    }
  }

  // Get embeddings using OpenAI
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: texts,
          model: "text-embedding-3-small",
        }),
      })

      const data = await response.json()
      return data.data.map((item: any) => item.embedding)
    } catch (error) {
      console.error("Error getting embeddings:", error)
      throw error
    }
  }

  // Index user's banking documents
  async indexUserDocuments(
    userId: string,
    documents: { content: string; metadata: Record<string, any> }[],
  ): Promise<void> {
    try {
      // Get embeddings for documents
      const contents = documents.map((doc) => doc.content)
      const embeddings = await this.getEmbeddings(contents)

      // Create vector documents
      const vectorDocs: VectorDocument[] = documents.map((doc, index) => ({
        id: `${userId}_${Date.now()}_${index}`,
        content: doc.content,
        metadata: {
          ...doc.metadata,
          userId,
          indexedAt: new Date().toISOString(),
        },
        embedding: embeddings[index],
      }))

      // Add to Pinecone index
      await this.addDocuments(vectorDocs)

      console.log(`Indexed ${documents.length} documents for user ${userId}`)
    } catch (error) {
      console.error("Error indexing user documents:", error)
      throw error
    }
  }

  // Search user's documents
  async searchUserDocuments(userId: string, query: string, k = 5): Promise<SearchResult[]> {
    try {
      // Get query embedding
      const [queryEmbedding] = await this.getEmbeddings([query])

      // Search with user filter
      return await this.search(queryEmbedding, {
        k: k,
        threshold: 0.6,
        filter: { userId },
      })
    } catch (error) {
      console.error("Error searching user documents:", error)
      return []
    }
  }

  // Delete documents
  async deleteDocuments(ids: string[]): Promise<void> {
    await this.ensureInitialized()

    try {
      // Get index
      const index = this.client.Index(this.indexName)

      // Delete from Pinecone
      await index.delete({
        deleteRequest: {
          ids,
          namespace: this.namespace,
        },
      })

      // Delete from database
      await prisma.vectorDocument.deleteMany({
        where: { id: { in: ids } },
      })

      console.log(`Deleted ${ids.length} documents from Pinecone index ${this.indexName}`)
    } catch (error) {
      console.error("Error deleting documents from Pinecone:", error)
      throw error
    }
  }

  // Delete documents by filter
  async deleteDocumentsByFilter(filter: Record<string, any>): Promise<void> {
    await this.ensureInitialized()

    try {
      // Get index
      const index = this.client.Index(this.indexName)

      // Delete from Pinecone
      await index.delete({
        deleteRequest: {
          filter,
          namespace: this.namespace,
        },
      })

      console.log(`Deleted documents matching filter from Pinecone index ${this.indexName}`)
    } catch (error) {
      console.error("Error deleting documents by filter from Pinecone:", error)
      throw error
    }
  }

  // Get index stats
  async getIndexStats(): Promise<any> {
    await this.ensureInitialized()

    try {
      // Get index
      const index = this.client.Index(this.indexName)

      // Get stats
      const stats = await index.describeIndexStats({
        describeIndexStatsRequest: {
          filter: {},
        },
      })

      return stats
    } catch (error) {
      console.error("Error getting Pinecone index stats:", error)
      throw error
    }
  }
}
