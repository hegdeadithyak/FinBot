import { Mem0Service } from '../../lib/mem0-service'

const mem0 = new Mem0Service({ apiKey: process.env.MEM0_API_KEY || '' })

const debounceMap = new Map<string, NodeJS.Timeout>()

async function store(userId: string, content: string) {
  if (debounceMap.has(userId)) {
    clearTimeout(debounceMap.get(userId)!)
  }
  return new Promise<void>(resolve => {
    const t = setTimeout(async () => {
      try {
        await mem0.storeMemory(userId, content, 'chat')
      } catch (err) {
        console.error('Mem0 store failed', err)
      }
      resolve()
    }, 300)
    debounceMap.set(userId, t)
  })
}

export async function updateMemoryAndFetchContext(userId: string, content: string) {
  await store(userId, content)
  try {
    return await mem0.retrieveMemories(userId, content, { limit: 5 })
  } catch (err) {
    console.error('Mem0 retrieval failed', err)
    return []
  }
}
