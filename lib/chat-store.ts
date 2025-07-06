/**
 * @Author: Adithya
 * @Date:   2025-07-06
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-06
 */
import { prisma } from "@/lib/prisma";
import { MessageRole } from "@prisma/client";


export async function getOrCreateChat(uid: string, chatId?: string) {
  if (chatId) {
    const found = await prisma.chatSession.findUnique({ where: { id: chatId } });
    if (found) return found;
  }
  return prisma.chatSession.create({ data: { userId: uid } });
}

export async function saveMsg(
  chatSessionId: string,
  userId: string,
  role: MessageRole,
  content: string,
) {
  return prisma.message.create({
    data: { chatSessionId, userId, role, content },
  });
}
