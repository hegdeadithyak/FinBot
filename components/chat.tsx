"use client"

import { type FormEvent, useRef, useState, useEffect } from "react"
import {
  Send,
  Bot,
  User,
  Menu,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Check,
  Mic,
  Paperclip,
  Volume2,
  VolumeX,
  Globe,
  Loader2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

/* ───────────────────────── types ─────────────────────────── */
type Role = "user" | "assistant"
interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
  liked?: boolean
  disliked?: boolean
  language?: string
  isPlaying?: boolean
}

interface ChatProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_FINBOT_URL ?? "http://localhost:3001"
const SIMPLE_ENDPOINT = `/api/chat/simple`

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
    SpeechSynthesis: any
    SpeechSynthesisUtterance: any
  }
}

export function Chat({ sidebarOpen, onToggleSidebar }: ChatProps) {
  /* state */
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null)
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false)
  const [languageAsked, setLanguageAsked] = useState(false)

  /* refs */
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const speakingRef = useRef<SpeechSynthesisUtterance | null>(null)

  /* helper: autoscroll */
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  /* check server connection on mount */
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/chat/health`)
        setIsConnected(response.ok)
      } catch {
        setIsConnected(false)
      }
    }
    checkConnection()
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US" // Default language
        //@ts-ignore
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
          //@ts-ignore
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join("")
          setTranscript(transcript)
          if (inputRef.current) {
            inputRef.current.value = transcript
          }
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognition.onerror = (event:any) => {
          console.error("Speech recognition error", event.error)
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }

      if (window.speechSynthesis) {
        synthRef.current = window.speechSynthesis
      }
    }

    return () => {
      // Cleanup
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (synthRef.current && speakingRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (messages.length > 0 && !languageAsked && messages.length <= 2) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "user") {
        // Simulate language detection (in a real app, use Google Translate API)
        detectLanguage(lastMessage.content).then((lang) => {
          if (lang && lang !== "en" && !preferredLanguage) {
            setDetectedLanguage(lang)
            setShowLanguagePrompt(true)
          }
        })
      }
    }
  }, [messages, languageAsked, preferredLanguage])

  /* ────────────────── voice functions ─────────────────────── */
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        setIsListening(false)
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
          setIsListening(true)
        } catch (error) {
          console.error("Error starting speech recognition:", error)
        }
      } else {
        alert("Speech recognition is not supported in your browser.")
      }
    }
  }

  const speakText = (text: string, messageId: string, language = "en-US") => {
    if (!synthRef.current) return

    // Stop any current speech
    synthRef.current.cancel()

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language

    // Set the voice (optional)
    const voices = synthRef.current.getVoices()
    const voice = voices.find((v) => v.lang.startsWith(language.split("-")[0]))
    if (voice) utterance.voice = voice

    // Update UI to show playing state
    setMessages((msgs) =>
      msgs.map((m) => ({
        ...m,
        isPlaying: m.id === messageId,
      })),
    )

    // Handle speech end
    utterance.onend = () => {
      setMessages((msgs) =>
        msgs.map((m) => ({
          ...m,
          isPlaying: false,
        })),
      )
      speakingRef.current = null
    }

    // Start speaking
    speakingRef.current = utterance
    synthRef.current.speak(utterance)
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setMessages((msgs) =>
        msgs.map((m) => ({
          ...m,
          isPlaying: false,
        })),
      )
      speakingRef.current = null
    }
  }

  /* ────────────────── language functions ─────────────────────── */
  const detectLanguage = async (text: string): Promise<string | null> => {
    // In a real app, use Google Translate API for detection
    // This is a simple simulation
    const commonPhrases: Record<string, string[]> = {
      es: ["hola", "como estas", "gracias", "por favor", "ayuda"],
      fr: ["bonjour", "comment ça va", "merci", "s'il vous plaît", "aide"],
      de: ["hallo", "wie geht es dir", "danke", "bitte", "hilfe"],
      zh: ["你好", "如何", "谢谢", "请", "帮助"],
      hi: ["नमस्ते", "कैसे हो", "धन्यवाद", "कृपया", "मदद"],
      ar: ["مرحبا", "كيف حالك", "شكرا", "من فضلك", "مساعدة"],
    }

    const lowerText = text.toLowerCase()

    for (const [lang, phrases] of Object.entries(commonPhrases)) {
      if (phrases.some((phrase) => lowerText.includes(phrase))) {
        return lang
      }
    }

    return null // Default to null if no match
  }

  const translateText = async (text: string, targetLang: string): Promise<string> => {
    console.log(`Translating to ${targetLang}: ${text}`)
    return text 
  }

  const setUserLanguagePreference = (language: string) => {
    setPreferredLanguage(language)
    setShowLanguagePrompt(false)
    setLanguageAsked(true)

    // Update recognition language
    if (recognitionRef.current) {
      switch (language) {
        case "Spanish":
          recognitionRef.current.lang = "es-ES"
          break
        case "French":
          recognitionRef.current.lang = "fr-FR"
          break
        case "German":
          recognitionRef.current.lang = "de-DE"
          break
        case "Chinese":
          recognitionRef.current.lang = "zh-CN"
          break
        case "Hindi":
          recognitionRef.current.lang = "hi-IN"
          break
        case "Arabic":
          recognitionRef.current.lang = "ar-SA"
          break
        default:
          recognitionRef.current.lang = "en-US"
      }
    }

    // Add a system message about language preference
    const systemMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `I'll communicate with you in ${language}. Feel free to speak or type in ${language}.`,
      timestamp: new Date(),
    }

    setMessages((msgs) => [...msgs, systemMessage])
  }

  /* ────────────────── message actions ─────────────────────── */
  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const likeMessage = (id: string) => {
    setMessages((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, liked: !msg.liked, disliked: false } : msg)))
  }

  const dislikeMessage = (id: string) => {
    setMessages((msgs) => msgs.map((msg) => (msg.id === id ? { ...msg, disliked: !msg.disliked, liked: false } : msg)))
  }

  const regenerateResponse = async (messageIndex: number) => {
    const messagesUpToIndex = messages.slice(0, messageIndex)
    const userMessages = messagesUpToIndex.filter((m) => m.role === "user")

    if (userMessages.length === 0) return

    // Remove the assistant message and regenerate
    setMessages(messagesUpToIndex)
    setPending(true)

    try {
      const res = await fetch(SIMPLE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesUpToIndex }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.response) {
          setMessages((msgs) => [
            ...msgs,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: data.response,
              timestamp: new Date(),
            },
          ])
        }
      }
    } catch (error) {
      console.error("Regenerate error:", error)
    } finally {
      setPending(false)
    }
  }

  /* ────────────────── submit handler ─────────────────────── */
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const text = inputRef.current?.value.trim()
    if (!text || pending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    const initial = [...messages, userMessage]
    console.log("Sending messages to API:", initial)
    setMessages(initial)
    setPending(true)
    inputRef.current!.value = ""
    setTranscript("")

    try {
      console.log("Calling simple endpoint:", SIMPLE_ENDPOINT)
      
      const res = await fetch(SIMPLE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: initial }),
      })

      if (!res.ok) {
        console.error("API error:", res.status, res.statusText)
        setMessages((msgs) => [
          ...msgs,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "Sorry, I'm having trouble connecting to the server. Please try again.",
            timestamp: new Date(),
          },
        ])
        setPending(false)
        return
      }

      const data = await res.json()
      console.log("API response:", data)

      if (data.response) {
        const messageId = Date.now().toString()
        const responseContent = data.response

        setMessages((msgs) => [
          ...msgs,
          {
            id: messageId,
            role: "assistant",
            content: responseContent,
            timestamp: new Date(),
          },
        ])
      } else if (data.error) {
        console.error("API returned error:", data.error)
        setMessages((msgs) => [
          ...msgs,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Error: ${data.error}`,
            timestamp: new Date(),
          },
        ])
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((msgs) => [
        ...msgs,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <motion.header
        className="flex items-center justify-between p-4 border-b border-border bg-background"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <motion.button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Bot className="w-4 h-4 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="font-semibold text-foreground">FinBot</h1>
              <p className="text-xs text-muted-foreground">AI Banking Assistant</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {preferredLanguage && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              <Globe className="w-3 h-3" />
              <span>{preferredLanguage}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm text-muted-foreground">{isConnected ? "Online" : "Offline"}</span>
          </div>
        </div>
      </motion.header>

      {/* Chat Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 3,
                }}
              >
                <Bot className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome to FinBot</h2>
              <p className="text-muted-foreground mb-6">
                Your intelligent banking assistant. Ask me anything about your accounts, transactions, or banking
                services.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {[
                  "What's my account balance?",
                  "How do I transfer money?",
                  "Help with loan application",
                  "Credit card payment options",
                ].map((suggestion, index) => (
                  <motion.button
                    key={index}
                    className="p-3 text-left border border-border rounded-lg hover:border-muted-foreground hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => {
                      if (inputRef.current) {
                        inputRef.current.value = suggestion
                        inputRef.current.focus()
                      }
                    }}
                  >
                    <span className="text-sm text-foreground">{suggestion}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="space-y-6">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  className="group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`flex gap-4 ${message.role === "user" ? "justify-end" : ""}`}>
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}

                    <div className={`flex-1 ${message.role === "user" ? "max-w-xs ml-auto" : "max-w-none"}`}>
                      <div
                        className={`${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-md"
                        } px-4 py-3`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>

                      {message.role === "assistant" && (
                        <motion.div
                          className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                        >
                          <motion.button
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => copyMessage(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </motion.button>

                          <motion.button
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => regenerateResponse(index)}
                          >
                            <RotateCcw className="w-4 h-4 text-muted-foreground" />
                          </motion.button>

                          <motion.button
                            className={`p-1.5 hover:bg-muted rounded-md transition-colors ${
                              message.liked ? "text-green-600" : "text-muted-foreground"
                            }`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => likeMessage(message.id)}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </motion.button>

                          <motion.button
                            className={`p-1.5 hover:bg-muted rounded-md transition-colors ${
                              message.disliked ? "text-red-600" : "text-muted-foreground"
                            }`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => dislikeMessage(message.id)}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </motion.button>

                          <motion.button
                            className={`p-1.5 hover:bg-muted rounded-md transition-colors ${
                              message.isPlaying ? "text-primary" : "text-muted-foreground"
                            }`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() =>
                              message.isPlaying
                                ? stopSpeaking()
                                : speakText(
                                    message.content,
                                    message.id,
                                    preferredLanguage === "Spanish"
                                      ? "es-ES"
                                      : preferredLanguage === "French"
                                        ? "fr-FR"
                                        : preferredLanguage === "German"
                                          ? "de-DE"
                                          : preferredLanguage === "Chinese"
                                            ? "zh-CN"
                                            : preferredLanguage === "Hindi"
                                              ? "hi-IN"
                                              : preferredLanguage === "Arabic"
                                                ? "ar-SA"
                                                : "en-US",
                                  )
                            }
                          >
                            {message.isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </motion.button>
                        </motion.div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Language Prompt */}
            <AnimatePresence>
              {showLanguagePrompt && (
                <motion.div
                  className="bg-muted/50 border border-border rounded-lg p-4 my-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <p className="text-sm text-foreground">
                      I noticed you might prefer{" "}
                      {detectedLanguage === "es"
                        ? "Spanish"
                        : detectedLanguage === "fr"
                          ? "French"
                          : detectedLanguage === "de"
                            ? "German"
                            : detectedLanguage === "zh"
                              ? "Chinese"
                              : detectedLanguage === "hi"
                                ? "Hindi"
                                : detectedLanguage === "ar"
                                  ? "Arabic"
                                  : "another language"}
                      . Would you like me to communicate in a different language?
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["English", "Spanish", "French", "German", "Chinese", "Hindi", "Arabic"].map((lang) => (
                      <motion.button
                        key={lang}
                        className="px-3 py-1 text-xs bg-background text-foreground rounded-full border border-border hover:bg-muted transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setUserLanguagePreference(lang)}
                      >
                        {lang}
                      </motion.button>
                    ))}
                    <motion.button
                      className="px-3 py-1 text-xs bg-background text-muted-foreground rounded-full border border-border hover:bg-muted transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowLanguagePrompt(false)
                        setLanguageAsked(true)
                      }}
                    >
                      No, thanks
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thinking Animation */}
            <AnimatePresence>
              {pending && (
                <motion.div
                  className="flex gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <motion.div
                    className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </motion.div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-foreground">FinBot is thinking</span>
                      <div className="flex gap-1 ml-2">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 0.6,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <motion.div
        className="border-t border-border bg-background p-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-3xl mx-auto">
          <form onSubmit={onSubmit} className="relative">
            <div className="flex items-end gap-2 bg-muted/50 rounded-2xl border border-border focus-within:border-muted-foreground transition-colors">
              <button type="button" className="p-3 text-muted-foreground hover:text-foreground transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder={isListening ? "Listening..." : "Message FinBot..."}
                className="flex-1 bg-transparent px-2 py-3 outline-none resize-none max-h-32 text-foreground placeholder:text-muted-foreground"
                disabled={pending || !isConnected || isListening}
                value={isListening ? transcript : undefined}
              />

              <AnimatePresence mode="wait">
                {isListening ? (
                  <motion.button
                    key="listening"
                    type="button"
                    className="p-3 text-red-500 hover:text-red-600 transition-colors"
                    onClick={toggleListening}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                    >
                      <Mic className="w-5 h-5" />
                    </motion.div>
                  </motion.button>
                ) : (
                  <motion.button
                    key="mic"
                    type="button"
                    className="p-3 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={toggleListening}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Mic className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={pending || !isConnected || (isListening && !transcript)}
                className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors m-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </motion.button>
            </div>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-2">
            FinBot can make mistakes. Consider checking important information.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
