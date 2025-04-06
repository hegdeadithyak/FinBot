"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { SendIcon, Mic, MicOff, Globe, Bot, TicketIcon, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "@/components/chat-message"
import { QuickActions } from "@/components/quick-actions"
import { motion, AnimatePresence } from "framer-motion"
import { TypingIndicator } from "@/components/typing-indicator"

type Language = "English" | "Spanish" | "French" | "German" | "Chinese"

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  language?: Language
  isEscalated?: boolean
}

type VoiceState = "idle" | "listening" | "processing"

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome-message",
    role: "assistant",
    content: "Hello! I'm FinBot, your banking assistant. How can I help you today?",
    timestamp: new Date(),
  },
]

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("English")
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [showSupportTicket, setShowSupportTicket] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // This would be replaced by actual voice recognition API
  const toggleVoiceInput = () => {
    if (voiceState === "idle") {
      setVoiceState("listening")
      // Simulate voice recognition after 3 seconds
      setTimeout(() => {
        setVoiceState("processing")
        setTimeout(() => {
          setInput("Can I check my account balance?")
          setVoiceState("idle")
        }, 1500)
      }, 3000)
    } else {
      setVoiceState("idle")
    }
  }

  // Function to detect if an issue needs escalation
  const needsEscalation = (text: string): boolean => {
    const escalationKeywords = [
      "fraud", "stolen", "urgent", "emergency", "complaint",
      "lost card", "unauthorized", "transaction", "dispute", "security breach"
    ]
    return escalationKeywords.some(keyword => text.toLowerCase().includes(keyword))
  }

  // Create support ticket function (for demo purposes)
  const createSupportTicket = (issue: string) => {
    setShowSupportTicket(true)
    const ticketMessage: Message = {
      id: Date.now().toString() + "-ticket",
      role: "system",
      content: `⚠️ Support ticket #${Math.floor(Math.random() * 10000)} has been created for your issue. A representative will contact you shortly.`,
      timestamp: new Date(),
      isEscalated: true
    }
    setMessages(prev => [...prev, ticketMessage])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      language: selectedLanguage,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Check if issue needs escalation
    const requiresEscalation = needsEscalation(input)
    if (requiresEscalation) {
      createSupportTicket(input)
    }

    // Simulate bot response (this would be replaced with actual backend call)
    setTimeout(() => {
      let botResponse = ""

      // Demo of contextual understanding
      const recentMessages = [...messages.slice(-3), userMessage]
      const isFollowUpQuestion = recentMessages.some(m => 
        m.role === "user" && m.content.toLowerCase().match(/what about|how about|and|also|then/i)
      )

      // Simple pattern matching for demo purposes
      if (input.toLowerCase().includes("account") || input.toLowerCase().includes("balance")) {
        botResponse = selectedLanguage === "English" 
          ? "I can help you check your account balance. For security purposes, could you please confirm your identity through our secure verification process?"
          : "Puedo ayudarte a verificar el saldo de tu cuenta. Por motivos de seguridad, ¿podrías confirmar tu identidad a través de nuestro proceso de verificación segura?";
      } else if (input.toLowerCase().includes("transfer")) {
        botResponse = selectedLanguage === "English" 
          ? "I'd be happy to help you make a transfer. Please specify the amount and the recipient's account details."
          : "Me complacería ayudarte a realizar una transferencia. Por favor, especifica el monto y los datos de la cuenta del destinatario.";
      } else if (isFollowUpQuestion) {
        botResponse = selectedLanguage === "English" 
          ? "Based on our conversation, I understand you're asking a follow-up question. I'm using my contextual database to provide a more relevant response."
          : "Basado en nuestra conversación, entiendo que estás haciendo una pregunta de seguimiento. Estoy utilizando mi base de datos contextual para proporcionar una respuesta más relevante.";
      } else {
        botResponse = selectedLanguage === "English" 
          ? "I understand you have a question about banking. How else can I assist you with your banking needs today?"
          : "Entiendo que tienes una pregunta sobre servicios bancarios. ¿Cómo más puedo ayudarte con tus necesidades bancarias hoy?";
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: botResponse,
        timestamp: new Date(),
        language: selectedLanguage,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)

      // Demo: Simulate voice output by reading latest message
      if (window.speechSynthesis && voiceState !== "idle") {
        const speech = new SpeechSynthesisUtterance(botResponse);
        speech.lang = selectedLanguage === "English" ? "en-US" : "es-ES";
        window.speechSynthesis.speak(speech);
      }
    }, 1500)
  }

  return (
    <motion.div
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      ref={chatContainerRef}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="animate-fade-in"
          >
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-1 border-gray-700 text-white hover:bg-gray-800 bg-black"
              onClick={() => setSelectedLanguage(selectedLanguage === "English" ? "Spanish" : "English")}
            >
              <Globe className="w-3 h-3" />
              {selectedLanguage}
            </Button>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            className="animate-fade-in"
            style={{ animationDelay: "100ms" }}
          >
            <Button
              size="sm"
              variant={voiceState !== "idle" ? "default" : "outline"}
              className={`flex items-center gap-1 ${
                voiceState !== "idle" 
                  ? "bg-white text-black hover:bg-gray-200" 
                  : "border-gray-700 text-white hover:bg-gray-800 bg-black"
              }`}
              onClick={toggleVoiceInput}
            >
              {voiceState === "idle" ? (
                <Mic className="w-3 h-3" />
              ) : (
                <MicOff className="w-3 h-3" />
              )}
              {voiceState === "idle" ? "Voice" : voiceState === "listening" ? "Listening..." : "Processing..."}
            </Button>
          </motion.div>
        </div>
        
        {showSupportTicket && (
          <motion.div 
            className="flex items-center text-amber-500 text-xs"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <TicketIcon className="w-3 h-3 mr-1" />
            <span>Support ticket created</span>
          </motion.div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 custom-scrollbar" style={{ maxHeight: "calc(100vh - 250px)" }}>
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
              className="animate-slide-in"
            >
              <ChatMessage message={message} />
              
              {/* If message is escalated, show the escalation info */}
              {message.isEscalated && (
                <motion.div 
                  className="ml-10 mt-2 p-2 bg-amber-900 border border-amber-700 rounded-md text-sm text-amber-300 flex items-center"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  This issue has been escalated to customer support
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center p-4 rounded-lg bg-gray-900 border border-gray-700 max-w-[80%] shadow-sm"
            >
              <div className="flex items-center">
                <div className="w-6 h-6 mr-2 flex items-center justify-center bg-black rounded-full border border-gray-700">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <p className="text-sm text-gray-300 mr-2">
                  {selectedLanguage === "English" ? "FinBot is typing" : "FinBot está escribiendo"}
                </p>
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed position for Quick Actions */}
      <div className="mb-4 mt-auto">
        <QuickActions onSelectAction={(action) => setInput(action)} />
      </div>

      <motion.form
        onSubmit={handleSendMessage}
        className="relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center border border-gray-700 rounded-lg bg-gray-900 shadow-md transition-all hover:shadow-lg focus-within:shadow-lg focus-within:border-gray-500">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedLanguage === "English" ? "Type your banking question..." : "Escribe tu pregunta bancaria..."}
            className="flex-1 p-3 bg-transparent focus:outline-none text-white"
            disabled={isLoading || voiceState !== "idle"}
          />
          
          <div className="flex items-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="mr-1 text-white hover:bg-gray-800"
                onClick={toggleVoiceInput}
                disabled={isLoading}
              >
                {voiceState === "idle" ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Button
                type="submit"
                size="icon"
                className="mr-2 bg-white hover:bg-gray-200 text-black transition-colors"
                disabled={!input.trim() || isLoading || voiceState !== "idle"}
              >
                <SendIcon className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.form>
    </motion.div>
  )
}

