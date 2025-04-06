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
        transition={{ duration: 0.4 }}
        className={`p-4 rounded-lg max-w-[80%] shadow-lg ${
          isUser
            ? "bg-white text-black border border-gray-300"
            : isSystem
              ? "bg-gray-900 border border-amber-700 text-amber-300"
              : "bg-gray-900 border border-gray-700 text-white"
        }`}
        whileHover={{ 
          scale: 1.01, 
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" 
        }}
      >
        <div className="flex items-center mb-2">
          {!isUser && !isSystem && (
            <motion.div 
              className="flex items-center justify-center w-6 h-6 mr-2 bg-black rounded-full border border-gray-700 shadow-sm"
              whileHover={{ rotate: 15 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Bot className="text-white w-3 h-3" />
            </motion.div>
          )}
          {isUser && (
            <motion.div 
              className="flex items-center justify-center w-6 h-6 mr-2 bg-black rounded-full shadow-sm border border-gray-300"
              whileHover={{ rotate: 15 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <User className="text-white w-3 h-3" />
            </motion.div>
          )}
          {isSystem && (
            <motion.div 
              className="flex items-center justify-center w-6 h-6 mr-2 bg-amber-700 rounded-full shadow-sm"
              whileHover={{ rotate: 15 }}
              animate={{ 
                boxShadow: ["0 0 0px rgba(217, 119, 6, 0)", "0 0 8px rgba(217, 119, 6, 0.5)", "0 0 0px rgba(217, 119, 6, 0)"]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                rotate: { type: "spring", stiffness: 400, damping: 10 }
              }}
            >
              <BellRing className="text-white w-3 h-3" />
            </motion.div>
          )}
          <motion.span 
            className={`font-medium text-sm ${isUser ? "text-black" : isSystem ? "text-amber-300" : "text-white"}`}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {isUser ? "You" : isSystem ? "System" : "FinBot"}
          </motion.span>
          {message.language && message.language !== "English" && (
            <motion.span 
              className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {message.language}
            </motion.span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div 
          className={`text-xs mt-2 ${
            isUser 
              ? "text-gray-600" 
              : isSystem 
                ? "text-amber-500" 
                : "text-gray-400"
          }`}
        >
          {timeAgo}
        </div>
      </motion.div>
    </div>
  )
}

