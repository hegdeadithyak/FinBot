"use client"

import { motion } from "framer-motion"
import { Bot } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex items-center p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
      <div className="flex items-center">
        <div className="w-6 h-6 mr-2 flex items-center justify-center bg-black rounded-full border border-gray-200">
          <Bot className="w-3 h-3 text-white" />
        </div>
        <p className="text-sm text-gray-700 mr-2">
          FinBot is typing
        </p>
        <div className="flex space-x-1 items-center">
          {[0, 1, 2].map((dot) => (
            <motion.div
              key={dot}
              className="w-2 h-2 bg-black rounded-full"
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                delay: dot * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

