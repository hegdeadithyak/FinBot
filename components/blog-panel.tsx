"use client"
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface BlogPost {
  id: string
  title: string
  content: string
  tags: string[]
}

export default function BlogPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    fetch('/api/blog')
      .then(res => res.json())
      .then(setPosts)
      .catch(err => console.error(err))
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-8">
      {posts.map(post => (
        <div key={post.id} className="border-b border-border pb-4">
          <h2 className="text-lg font-semibold mb-2">{post.title}</h2>
          <ReactMarkdown className="prose prose-invert max-w-none">{post.content}</ReactMarkdown>
          <div className="mt-2 space-x-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-1 bg-muted rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
