import { Hono } from 'hono'
import { prisma } from '../../lib/prisma'

const blog = new Hono()

blog.get('/', async c => {
  try {
    const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } })
    return c.json(posts)
  } catch (error) {
    console.error('Blog error', error)
    return c.json({ error: 'failed to fetch posts' }, 500)
  }
})

export default blog
