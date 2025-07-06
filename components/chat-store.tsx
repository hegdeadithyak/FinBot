// lib/chat-store.ts
import { prisma } from "@/lib/prisma";
import type { MessageRole } from "@prisma/client";

export async function getOrCreateChatSession(userId: string, sessionId?: string) {
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (existing) return existing;
  }
  return prisma.chatSession.create({ data: { userId } });
}

export async function saveMessage(
  chatSessionId: string,
  userId: string,
  role: MessageRole,
  content: string,
  tokenCount?: number,
) {
  await prisma.message.create({
    data: {
      chatSessionId,
      userId,
      role,
      content,
      tokenCount,
    },
  });
}
