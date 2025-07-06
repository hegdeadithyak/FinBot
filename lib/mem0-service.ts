/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-07
 */
// /lib/memory.ts
import { createMem0, addMemories, retrieveMemories, getMemories } from "@mem0/vercel-ai-provider";

export const mem0 = createMem0({
  provider: "openai",
  mem0ApiKey: process.env.MEM0_API_KEY!,
  apiKey: process.env.OPENAI_API_KEY!,
});

/** Persist the latest turn (assistant + user) */
export async function persist(messages: any[], userId: string) {
  await addMemories(messages, { user_id: userId });
}

/** Recall the N most relevant memories to prep the prompt */
/** Semantic recall (default) */
export async function recall(
  messages: string[],
  userId: string,
  k = 6,
) {
  const query = messages.join(" ");

  const arr = await getMemories(query, { user_id: userId });
  return arr.map((item: any) => item.memory);

}

/** Full dump for analytics / export */
export async function recallAll(userId: string) {
  return recallAllMemories(userId);
}

export async function recallAllMemories(userId: string): Promise<any[]> {

  try {
    const res = await retrieveMemories("", { user_id: userId });
    if (typeof res === 'string') {
      return [res];
    }
    return res as any[];
  } catch (error) {
    console.error('Error retrieving all memories:', error);
    return [];
  }
}