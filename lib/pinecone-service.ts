/**
 * @Author: 
 * @Date:   2025-07-06
 * @Last Modified by:   
 * @Last Modified time: 2025-07-09
 */


import { Pinecone } from '@pinecone-database/pinecone'

export class PineconeVectorService {
  private pc: Pinecone
  private indexName: string

  constructor(apiKey: string, indexName: string = "main") {
    this.pc = new Pinecone({ apiKey })
    this.indexName = indexName
  }

  /**
   * Search across all namespaces in the main index and return text results as string array
   */
  async searchSimilarContent(query: string, topK: number = 5): Promise<string[]> {
    try {
      // Get the main index
      const mainIndex = this.pc.index(this.indexName)
      
      // Get index stats to find all namespaces
      const indexStats = await mainIndex.describeIndexStats()
      const namespaces = Object.keys(indexStats.namespaces || {})
      
      console.log(`Found ${namespaces.length} namespaces in index: ${this.indexName}`)
      console.log(`Namespaces: ${namespaces.join(', ')}`)
      
      const allResults: string[] = []
      
      // Search in each namespace
      for (const namespaceName of namespaces) {
        try {
          console.log(`Searching in namespace: ${namespaceName}`)
          
          // Target the namespace
          const namespaceIndex = mainIndex.namespace(namespaceName)
          
          // Search the namespace
          const results = await namespaceIndex.searchRecords({
            query: {
              topK,
              inputs: { text: query },
            },
          })

          // Extract text from results
          const textResults: string[] = results.result.hits.map(hit => 
            hit.fields.text || hit.fields.chunk_text || hit.id
          )

          console.log(`Found ${textResults.length} results in namespace: ${namespaceName}`)
          
          // Add results to the combined array
          allResults.push(...textResults)
          
        } catch (namespaceError) {
          console.warn(`Error searching namespace ${namespaceName}:`, namespaceError)
          continue
        }
      }

      // Remove duplicates and limit results
      const uniqueResults = Array.from(new Set(allResults))
      const limitedResults = uniqueResults.slice(0, topK * 2) // Allow more results since we're searching multiple namespaces
      
      console.log(`✅ Found ${limitedResults.length} total unique results across all namespaces for query: "${query.substring(0, 50)}..."`)
      
      return limitedResults

    } catch (error) {
      console.error("Error searching Pinecone:", error)
      
      // Return empty array for graceful degradation
      console.warn("Returning empty results due to Pinecone search error")
      return []
    }
  }

  /**
   * Add content to the index
   */
  async addContent(records: Array<{ id: string; text: string; metadata?: Record<string, any> }>): Promise<void> {
    try {
      // Target the index with namespace
      const index = this.pc.index(this.indexName).namespace("example-namespace")
      
      // Format records for upsert
      const formattedRecords = records.map(record => ({
        id: record.id,
        fields: {
          text: record.text,
          timestamp: new Date().toISOString(),
          ...record.metadata,
        },
      }))

      // Upsert the records into the namespace
      await index.upsertRecords(formattedRecords)

      console.log(`✅ Successfully added ${records.length} records to Pinecone`)
    } catch (error) {
      console.error("Error adding content to Pinecone:", error)
      throw new Error(`Failed to add content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance with the provided API key
export const pineconeService = new PineconeVectorService(
  'pcsk_4HnA4v_SQbWasvbC6BUE9ZoynwHJsSDPGo5AMkMgvsCEecePU5vzA7wxS7cAeT8nnUFBYb'
)