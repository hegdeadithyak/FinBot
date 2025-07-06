/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 */
// /lib/memory.ts
import { createMem0, addMemories, retrieveMemories } from "@mem0/vercel-ai-provider";

export const mem0 = createMem0({
  provider:  "openai",
  mem0ApiKey: process.env.MEM0_API_KEY!,
  apiKey:     process.env.OPENAI_API_KEY!,
});

/** Persist the latest turn (assistant + user) */
export async function persist(messages: any[], userId: string) {
  await addMemories(messages, { user_id: userId });
}

/** Recall the N most relevant memories to prep the prompt */
export async function recall(messages: String[], userId: string, k = 6) {
  const messagesString = messages.map(m => typeof m === "string" ? m : JSON.stringify(m)).join(" ");
  return await retrieveMemories(messagesString,{user_id: userId });
}
