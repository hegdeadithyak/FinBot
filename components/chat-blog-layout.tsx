"use client"
import { useState } from 'react'
import { Chat } from './chat'
import BlogPanel from './blog-panel'

interface Props {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function ChatBlogLayout({ sidebarOpen, onToggleSidebar }: Props) {
  const [mode, setMode] = useState<'chat' | 'blog'>('chat')

  return (
    <div className="flex flex-col h-full">
      {mode === 'chat' ? (
        <Chat sidebarOpen={sidebarOpen} onToggleSidebar={onToggleSidebar} />
      ) : (
        <BlogPanel />
      )}
      <div className="p-2 text-center border-t border-border">
        
      </div>
    </div>
  )
}
