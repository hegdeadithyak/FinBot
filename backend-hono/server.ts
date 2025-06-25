import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import chat from './api/chat'
import memory from './api/memory'
import blog from './api/blog'

export const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.route('/chat', chat)
app.route('/memory', memory)
app.route('/blog', blog)

export default app
