"use client"

import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"
import { Bot, User, BellRing } from "lucide-react"

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  language?: string
  isEscalated?: boolean
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"
  const timeAgo = formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`p-4 rounded-lg max-w-[80%] shadow-sm ${
          isUser
            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            : isSystem
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-white border border-gray-200 text-gray-800"
        }`}
      >
        <div className="flex items-center mb-1">
          {!isUser && !isSystem && (
            <div className="flex items-center justify-center w-6 h-6 mr-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-sm">
              <Bot className="text-white w-3 h-3" />
            </div>
          )}
          {isUser && (
            <div className="flex items-center justify-center w-6 h-6 mr-2 bg-gray-700 rounded-full shadow-sm">
              <User className="text-white w-3 h-3" />
            </div>
          )}
          {isSystem && (
            <div className="flex items-center justify-center w-6 h-6 mr-2 bg-amber-500 rounded-full shadow-sm">
              <BellRing className="text-white w-3 h-3" />
            </div>
          )}
          <span className="font-medium text-sm">{isUser ? "You" : isSystem ? "System" : "FinBot"}</span>
          {message.language && message.language !== "English" && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
              {message.language}
            </span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div 
          className={`text-xs mt-1 ${
            isUser 
              ? "text-indigo-200" 
              : isSystem 
                ? "text-amber-600" 
                : "text-gray-500"
          }`}
        >
          {timeAgo}
        </div>
      </motion.div>
    </div>
  )
}

