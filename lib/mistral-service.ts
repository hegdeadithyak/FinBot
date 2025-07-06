/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
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
     apiKey: "nfmpeCwgZ6GDeH30qSyhw4DfeB1PPhFZ",
    });

    const FINBOT_AGENT_ID = "ag:decdcd4d:20250602:finbot:c365517a";
    this.model = "ft:open-mistral-7b:decdcd4d:20250602:4b4d086d"
    // this.client = new Mistral({
    // })
    // apiKey: config.apiKey,
    // this.model = config.model || "mistral-large-latest"
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

      const response = await this.client.agents.complete({
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        agentId:"ag:26507ac4:20250604:finbot:9cc49639",
        
      })
      console.log(response);
      let contentRaw = response.choices?.[0]?.message?.content ?? '';
      let content: string;
      if (Array.isArray(contentRaw)) {
        content = contentRaw.map((chunk: any) => typeof chunk === "string" ? chunk : chunk.content ?? '').join('');
      } else {
        content = contentRaw;
      }
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

 private buildSystemPromptWithSources(context: any, userProfile: any): string {
  /* ────────────────────────────────────────────────────────────── */
  /* 1. Header – role & user profile                               */
  /* ────────────────────────────────────────────────────────────── */
  let prompt = `You are FinBot – a multilingual, intelligent banking assistant.
Answer clearly, securely, and with context. Use the knowledge sources below,
weighted in the order **Memories → Banking Data → Documents → Web**.

User Profile:
- Name: ${userProfile.firstName || "User"}
- Preferred Language: ${userProfile.preferredLanguage || "English"}

AVAILABLE CONTEXT AND SOURCES:`;

  /* ────────────────────────────────────────────────────────────── */
  /* 2. Memories (highest priority)                                */
  /* ────────────────────────────────────────────────────────────── */
 prompt += context.memoryResults;
  // if (context.memoryResults && context.memoryResults.length > 0) {
  //   prompt += `\nMEMORIES (highest‑priority):\n`;

  //   const memories = Array.isArray(context.memoryResults)
  //     ? context.memoryResults
  //     : [context.memoryResults];

  //   memories.forEach((mem: any, idx: number) => {
  //     const text = typeof mem === "string"
  //       ? mem
  //       : (mem.content?.[0]?.text as string | undefined) ?? "";

  //     prompt += `[M${idx + 1}] ${text.slice(0, 300)}...\n`;
  //   });
  // }

  /* ────────────────────────────────────────────────────────────── */
  /* 3. Banking data (second)                                      */
  /* ────────────────────────────────────────────────────────────── */
  if (context.bankingData && context.bankingData.length > 0) {
    prompt += `\nUSER BANKING DATA:\n`;
    context.bankingData.forEach((data: any, index: number) => {
      if (data.type === "account_info") {
        prompt += `[B${index + 1}] Account: ${data.accountType} – Balance: ${data.balance} ${data.currency}\n`;
      } else if (data.type === "transaction") {
        prompt += `[B${index + 1}] Transaction: ${data.description} – ${data.amount} ${data.currency} (${data.transactionDate})\n`;
      }
    });
  }

  /* ────────────────────────────────────────────────────────────── */
  /* 4. Vector / internal docs (third)                             */
  /* ────────────────────────────────────────────────────────────── */
  if (context.vectorResults && context.vectorResults.length > 0) {
    prompt += `\nDOCUMENT SEARCH RESULTS:\n`;
    context.vectorResults.forEach((result: any, index: number) => {
      prompt += `[V${index + 1}] ${result.content.substring(0, 300)}...\n`;
      prompt += `    Relevance: ${(result.score * 100).toFixed(1)}%\n\n`;
    });
  }

  /* ────────────────────────────────────────────────────────────── */
  /* 5. Web results (lowest priority)                              */
  /* ────────────────────────────────────────────────────────────── */
  if (context.webResults && context.webResults.length > 0) {
    prompt += `\nWEB SEARCH RESULTS:\n`;
    context.webResults.forEach((result: any, index: number) => {
      prompt += `[W${index + 1}] ${result.title}\n`;
      prompt += `    ${result.snippet}\n`;
      prompt += `    Source: ${result.link}\n\n`;
    });
  }

  prompt += `\nINSTRUCTIONS – How to answer:\n` +
    `1. Focus on the user's current question first.\n` +
    `2. Weave in information from sources in priority order **M → B → V → W**.\n` +
    `3. If sources conflict, prefer the higher‑priority one, but mention the conflict.\n` +
    `5. Use clear, user‑friendly language in ${userProfile.preferredLanguage || "English"}.\n` +
    `7. Provide a friendly closing line.\n\n` +
    `Only expose the actual memory text if the user explicitly asks "What do you remember? or something about memory"`;

  return prompt;
}


  // Extract and format sources
  private extractSources(context: any): any[] {
    const sources: any[] = []
    // In extractSources()
    console.log(context);
    if (context.memoryResults) {
      const memoryArr: Array<{ content: string; timestamp?: string }> =
        Array.isArray(context.memoryResults)
          ? context.memoryResults
          : [{ content: String(context.memoryResults) }];

      memoryArr.forEach((mem, i) => {
        sources.push({
          id: `M${i + 1}`,
          type: "memory",
          title: "Prior Conversation",
          content: mem.content.slice(0, 200) + "...",
          timestamp: mem.timestamp ?? null,
        });
      });
    }


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
