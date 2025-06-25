import { Hono } from 'hono'
import { z } from 'zod'
import { updateMemoryAndFetchContext } from '../lib/memory-helper'

const memory = new Hono()

const bodySchema = z.object({
  userId: z.string(),
  content: z.string()
})

memory.post('/', async c => {
  try {
    const { userId, content } = bodySchema.parse(await c.req.json())
    const context = await updateMemoryAndFetchContext(userId, content)
    return c.json({ success: true, context })
  } catch (error) {
    console.error('Memory error', error)
    return c.json({ success: false, message: 'memory update failed' }, 500)
  }
})

memory.get('/:userId', async c => {
  try {
    const userId = c.req.param('userId')
    const query = c.req.query('q') ?? ''
    const context = await updateMemoryAndFetchContext(userId, query)
    return c.json({ success: true, context })
  } catch (error) {
    console.error('Memory fetch error', error)
    return c.json({ success: false }, 500)
  }
})

export default memory
