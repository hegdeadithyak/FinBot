/**
 * @Author: Adithya
 * @Date:   2025-06-04
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-04
 */
import { Mistral } from "@mistralai/mistralai"

const FINBOT_AGENT_ID = "ag:decdcd4d:20250602:finbot:c365517a"

export class MistralAgent {
  private client: Mistral

  constructor(apiKey: string) {
    this.client = new Mistral({
      apiKey,
    })
  }

  async complete(messages: any[]) {
    return await this.client.agents.complete({
      agentId: FINBOT_AGENT_ID,
      messages,
    })
  }

  async stream(messages: any[]) {
    return await this.client.agents.stream({
      agentId: FINBOT_AGENT_ID,
      messages,
    })
  }

  getAgentInfo() {
    return {
      agentId: FINBOT_AGENT_ID,
      name: "FinBot",
      description: "Intelligent, multilingual banking assistant operated by Hegde Adithya Kota",
      capabilities: [
        "Banking queries",
        "Account management",
        "Financial advice",
        "RAG-enhanced responses",
        "Live web search",
        "Multilingual support",
      ],
      model: "ft:open-mistral-7b:decdcd4d:20250602:4b4d086d",
      temperature: 0.7,
    }
  }
}
