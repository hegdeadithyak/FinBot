import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { updateMemoryAndFetchContext } from '../lib/memory-helper'

const chat = new Hono()

const MessageSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  content: z.string()
})

chat.post('/', async c => {
  try {
    const { userId, sessionId, content } = MessageSchema.parse(await c.req.json())

    await prisma.message.create({
      data: {
        chatSessionId: sessionId,
        userId,
        role: 'USER',
        content
      }
    })

    const history = await prisma.message.findMany({
      where: { chatSessionId: sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20
    })

    const memoryContext = await updateMemoryAndFetchContext(userId, content)

    return c.json({ history, memoryContext })
  } catch (error) {
    console.error('Chat error', error)
    return c.json({ error: 'failed to send message' }, 500)
  }
})

export default chat
