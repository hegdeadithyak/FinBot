/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-09
 */
import { Mistral } from "@mistralai/mistralai"

interface MistralConfig {
  apiKey: string
  model?: string
}

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

interface MistralResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class MistralService {
  private client: Mistral
  private model: string

  constructor(config: MistralConfig) {
    this.client = new Mistral({
      apiKey: config.apiKey,
    })
    this.model = config.model || "mistral-large-latest"
  }

  // Generate chat completion
  async generateResponse(
    messages: ChatMessage[],
    options: {
      temperature?: number
      maxTokens?: number
      topP?: number
      stream?: boolean
    } = {},
  ): Promise<MistralResponse> {
    try {
      const { temperature = 0.7, maxTokens = 2000, topP = 1.0, stream = false } = options

      const response = await this.client.chat.complete({
        model: this.model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        maxTokens,
        topP,
        stream,
      })

      const content = response.choices?.[0]?.message?.content || ""
      const usage = response.usage
        ? {
            promptTokens: response.usage.promptTokens || 0,
            completionTokens: response.usage.completionTokens || 0,
            totalTokens: response.usage.totalTokens || 0,
          }
        : undefined

      return { content, usage }
    } catch (error) {
      console.error("Mistral API error:", error)
      throw new Error("Failed to generate response from Mistral")
    }
  }

  // Stream chat completion
  async *streamResponse(
    messages: ChatMessage[],
    options: {
      temperature?: number
      maxTokens?: number
      topP?: number
    } = {},
  ): AsyncGenerator<string, void, unknown> {
    try {
      const { temperature = 0.7, maxTokens = 2000, topP = 1.0 } = options

      const stream = await this.client.chat.stream({
        model: this.model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        maxTokens,
        topP,
      })

      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error) {
      console.error("Mistral streaming error:", error)
      throw new Error("Failed to stream response from Mistral")
    }
  }

  // Generate response with sources
  async generateResponseWithSources(
    query: string,
    context: {
      vectorResults: any[]
      webResults: any[]
      memoryResults: any[]
      bankingData: any[]
    },
    userProfile: any,
  ): Promise<{ content: string; sources: any[] }> {
    try {
      // Build system prompt with context and sources
      const systemPrompt = this.buildSystemPromptWithSources(context, userProfile)

      // Prepare messages
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ]

      // Generate response
      const response = await this.generateResponse(messages, {
        temperature: 0.7,
        maxTokens: 2000,
      })

      // Extract and format sources
      const sources = this.extractSources(context)

      return {
        content: response.content,
        sources,
      }
    } catch (error) {
      console.error("Error generating response with sources:", error)
      throw error
    }
  }

  // Build system prompt with sources
  private buildSystemPromptWithSources(context: any, userProfile: any): string {
    let prompt = `You are FinBot, an intelligent banking assistant. You have access to multiple knowledge sources and should provide accurate, helpful responses with proper source citations.

User Profile:
- Name: ${userProfile.firstName || "User"}
- Preferred Language: ${userProfile.preferredLanguage || "English"}

AVAILABLE CONTEXT AND SOURCES:
`

    // Add web search results
    if (context.webResults && context.webResults.length > 0) {
      prompt += `\nWEB SEARCH RESULTS:\n`
      context.webResults.forEach((result: any, index: number) => {
        prompt += `[${index + 1}] ${result.title}\n`
        prompt += `    ${result.snippet}\n`
        prompt += `    Source: ${result.link}\n\n`
      })
    }

    // Add vector search results if available
    if (context.vectorResults && context.vectorResults.length > 0) {
      prompt += `\nDOCUMENT SEARCH RESULTS:\n`
      context.vectorResults.forEach((result: any, index: number) => {
        prompt += `[V${index + 1}] ${result.content.substring(0, 300)}...\n`
        prompt += `    Relevance: ${(result.score * 100).toFixed(1)}%\n\n`
      })
    }

    // Add banking data if available
    if (context.bankingData && context.bankingData.length > 0) {
      prompt += `\nUSER BANKING DATA:\n`
      context.bankingData.forEach((data: any, index: number) => {
        if (data.type === "account_info") {
          prompt += `[B${index + 1}] Account: ${data.accountType} - Balance: ${data.balance} ${data.currency}\n`
        } else if (data.type === "transaction") {
          prompt += `[B${index + 1}] Transaction: ${data.description} - ${data.amount} ${data.currency} (${data.transactionDate})\n`
        }
      })
    }

    console.log(`Built system prompt with ${context.webResults?.length || 0} web results`)

    prompt += `\nINSTRUCTIONS:
1. Use the provided context to answer the user's question accurately
2. ALWAYS cite your sources using the reference numbers (e.g., [1],[2],[3]) so with links 
    formatted for library react-markdown
3. If using web sources, mention the website name
4. Prioritize user's personal data (V, M, B sources) over web sources
5. If information is uncertain or conflicting, mention this clearly
6. Respond in ${userProfile.preferredLanguage || "English"} if it's not English
7. For financial advice, always recommend consulting with financial professionals
8. Be conversational but professional
9. If you cannot find relevant information in the sources, say so clearly

Remember to cite sources in your response using the reference numbers provided above.`

    return prompt
  }

  // Extract and format sources
  private extractSources(context: any): any[] {
    const sources: any[] = []

    // // Add vector sources
    // if (context.vectorResults) {
    //   context.vectorResults.forEach((result: any, index: number) => {
    //     sources.push({
    //       id: `V${index + 1}`,
    //       type: "document",
    //       title: result.metadata?.title || "Personal Document",
    //       content: result.content.substring(0, 200) + "...",
    //       relevance: result.score,
    //       url: result.metadata?.url || null,
    //     })
    //   })
    // }

    // Add web sources
    if (context.webResults) {
      context.webResults.forEach((result: any, index: number) => {
        sources.push({
          id: `W${index + 1}`,
          type: "web",
          title: result.title,
          content: result.snippet,
          url: result.link,
          source: result.source || "Web",
        })
      })
    }

    // Add memory sources
    // if (context.memoryResults) {
    //   context.memoryResults.forEach((memory: any, index: number) => {
    //     sources.push({
    //       id: `M${index + 1}`,
    //       type: "memory",
    //       title: "Conversation History",
    //       content: memory.content.substring(0, 200) + "...",
    //       timestamp: memory.timestamp,
    //     })
    //   })
    // }

    // // Add banking sources
    // if (context.bankingData) {
    //   context.bankingData.forEach((data: any, index: number) => {
    //     sources.push({
    //       id: `B${index + 1}`,
    //       type: "banking",
    //       title: data.type === "account_info" ? "Account Information" : "Transaction Data",
    //       content: data.type === "account_info" ? `${data.accountType} Account` : data.description,
    //       amount: data.amount,
    //       currency: data.currency,
    //     })
    //   })
    // }

    return sources
  }
}
