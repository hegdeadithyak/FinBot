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
  ExternalLink,
  X,
  FileText,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"


/* ───────────────────────── types ─────────────────────────── */
type Role = "user" | "assistant"

interface Source {
  id: string
  type: string
  title: string
  content: string
  url: string
  source: string
}

interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
  liked?: boolean
  disliked?: boolean
  language?: string
  isPlaying?: boolean
  sources?: Source[]
}

interface ChatProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_FINBOT_URL ?? "http://localhost:3001"
const SIMPLE_ENDPOINT = `/api/chat/simple`
// Google Translate API key - should be stored in environment variables in production
const GOOGLE_TRANSLATE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY ?? ""

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
  const [sourcesPanel, setSourcesPanel] = useState<{
    isOpen: boolean
    sources: Source[]
  }>({
    isOpen: false,
    sources: [],
  })

  const [selectedLanguage, setSelectedLanguage] = useState("EN")
  const [autoReadMessages, setAutoReadMessages] = useState(false)

  const languageOptions = [
    { code: "EN", name: "English", speechLang: "en-US", translationCode: "en" },
    { code: "HI", name: "Hindi", speechLang: "hi-IN", translationCode: "hi" },
    { code: "TEL", name: "Telugu", speechLang: "te-IN", translationCode: "te" },
    { code: "ES", name: "Spanish", speechLang: "es-ES", translationCode: "es" },
    { code: "FR", name: "French", speechLang: "fr-FR", translationCode: "fr" },
    { code: "DE", name: "German", speechLang: "de-DE", translationCode: "de" },
    { code: "ZH", name: "Chinese", speechLang: "zh-CN", translationCode: "zh" },
    { code: "AR", name: "Arabic", speechLang: "ar-SA", translationCode: "ar" },
    { code: "JA", name: "Japanese", speechLang: "ja-JP", translationCode: "ja" },
    { code: "KO", name: "Korean", speechLang: "ko-KR", translationCode: "ko" },
  ]

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const speakingRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error)
          setIsListening(false)
        }

        recognitionRef.current = recognition
      }

      if (window.speechSynthesis) {
        synthRef.current = window.speechSynthesis
      }

      // Initialize AudioContext for recording
      if (window.AudioContext) {
        audioContextRef.current = new AudioContext()
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
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
        detectLanguage(lastMessage.content).then((lang) => {
          if (lang && lang !== "en" && !preferredLanguage) {
            setDetectedLanguage(lang)
            setShowLanguagePrompt(true)
          }
        })
      }
    }
  }, [messages, languageAsked, preferredLanguage])

  useEffect(() => {
    if (recognitionRef.current) {
      const currentLang = languageOptions.find((lang) => lang.code === selectedLanguage)
      if (currentLang) {
        recognitionRef.current.lang = currentLang.speechLang
      }
    }
  }, [selectedLanguage])

  /* ────────────────── voice functions ─────────────────────── */
  // Record audio using MediaRecorder API
  const recordAudioBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          audioChunksRef.current = []
          const mediaRecorder = new MediaRecorder(stream)

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              audioChunksRef.current.push(e.data)
            }
          }

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
            const tracks = stream.getTracks()
            tracks.forEach((track) => track.stop())
            resolve(audioBlob)
          }

          mediaRecorderRef.current = mediaRecorder
          mediaRecorder.start()

          // Record for a maximum of 15 seconds
          setTimeout(() => {
            if (mediaRecorder.state === "recording") {
              mediaRecorder.stop()
            }
          }, 15000)
        })
        .catch(reject)
    })
  }

  // Google Cloud Speech-to-Text API integration
  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    } else {
      try {
        setIsListening(true)
        setTranscript("")

        // Start recording
        const audioBlob = await recordAudioBlob()

        // Create form data for API request
        const formData = new FormData()
        formData.append("audio", audioBlob)
        formData.append(
          "language",
          languageOptions.find((lang) => lang.code === selectedLanguage)?.translationCode || "en",
        )

        // Call Google Cloud Speech-to-Text API via your backend proxy
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Speech recognition failed: ${response.statusText}`)
        }

        const { transcript, detectedLanguage } = await response.json()

        // Update the transcript and input field
        setTranscript(transcript)
        if (inputRef.current) {
          inputRef.current.value = transcript
        }

        // If language was detected and different from selected, maybe suggest changing
        if (detectedLanguage && detectedLanguage !== selectedLanguage) {
          const detectedOption = languageOptions.find(
            (lang) => lang.translationCode === detectedLanguage.toLowerCase().substring(0, 2),
          )
          if (detectedOption) {
            setDetectedLanguage(detectedOption.translationCode)
            if (!languageAsked) {
              setShowLanguagePrompt(true)
            }
          }
        }
      } catch (error) {
        console.error("Speech recognition error:", error)
        setIsListening(false)
      } finally {
        setIsListening(false)
      }
    }
  }

  // Google Cloud Text-to-Speech API integration
  const speakText = async (text: string, messageId: string, language?: string) => {
    try {
      // Stop any current speech
      if (synthRef.current) {
        synthRef.current.cancel()
      }

      // Update UI to show speaking state
      setMessages((msgs) =>
        msgs.map((m) => ({
          ...m,
          isPlaying: m.id === messageId,
        })),
      )

      // Get language code for TTS
      const currentLang = languageOptions.find((lang) => lang.code === selectedLanguage)
      const langCode = language || currentLang?.speechLang || "en-US"

      // Call Google Cloud Text-to-Speech API via your backend proxy
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          languageCode: langCode,
          // Optional parameters for voice selection
          voiceName: langCode.startsWith("en") ? "en-US-Wavenet-F" : undefined,
          ssmlGender: "FEMALE",
        }),
      })

      if (!response.ok) {
        throw new Error(`Text-to-speech failed: ${response.statusText}`)
      }

      // Get audio content as ArrayBuffer
      const audioData = await response.arrayBuffer()

      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      // Decode and play audio
      const audioContext = audioContextRef.current
      const audioBuffer = await audioContext.decodeAudioData(audioData)
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)

      // Handle completion
      source.onended = () => {
        setMessages((msgs) =>
          msgs.map((m) => ({
            ...m,
            isPlaying: false,
          })),
        )
      }

      // Start playback
      source.start(0)
    } catch (error) {
      console.error("Text-to-speech error:", error)
      // Reset playing state on error
      setMessages((msgs) =>
        msgs.map((m) => ({
          ...m,
          isPlaying: false,
        })),
      )
    }
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }

    // If using AudioContext
    if (audioContextRef.current) {
      // Create a new AudioContext to effectively stop all sounds
      audioContextRef.current
        .close()
        .then(() => {
          audioContextRef.current = new AudioContext()
        })
        .catch(console.error)
    }

    setMessages((msgs) =>
      msgs.map((m) => ({
        ...m,
        isPlaying: false,
      })),
    )
    speakingRef.current = null
  }

  const detectLanguage = async (text: string): Promise<string | null> => {
    try {
      // Call Google Translate API to detect language
      const response = await fetch("/api/detect-language", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.statusText}`)
      }

      const { language } = await response.json()
      return language
    } catch (error) {
      console.error("Language detection error:", error)

      // Fallback to simple detection for common phrases
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

      return null
    }
  }

  const translateText = async (text: string, targetLang: string): Promise<string> => {
    try {
      // Call Google Translate API
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          targetLanguage: targetLang,
        }),
      })

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`)
      }

      const { translatedText } = await response.json()
      return translatedText
    } catch (error) {
      console.error(`Translation error:`, error)
      return text // Return original text on error
    }
  }

  const translateToSelectedLanguage = async (text: string): Promise<string> => {
    const currentLang = languageOptions.find((lang) => lang.code === selectedLanguage)

    if (!currentLang || currentLang.code === "EN") {
      return text
    }

    try {
      return await translateText(text, currentLang.translationCode)
    } catch (error) {
      console.error("Translation error:", error)
      return text
    }
  }

  const setUserLanguagePreference = (language: string) => {
    setPreferredLanguage(language)
    setShowLanguagePrompt(false)
    setLanguageAsked(true)

    // Find the language code that matches the selected language name
    const langOption = languageOptions.find((option) => option.name.toLowerCase() === language.toLowerCase())

    if (langOption) {
      setSelectedLanguage(langOption.code)
    }

    const systemMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `I'll communicate with you in ${language}. Feel free to speak or type in ${language}.`,
      timestamp: new Date(),
    }

    setMessages((msgs) => [...msgs, systemMessage])
  }

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

  const showSources = (sources: Source[]) => {
    setSourcesPanel({
      isOpen: true,
      sources: sources,
    })
  }

  const closeSources = () => {
    setSourcesPanel({
      isOpen: false,
      sources: [],
    })
  }

  const regenerateResponse = async (messageIndex: number) => {
    const messagesUpToIndex = messages.slice(0, messageIndex)
    const userMessages = messagesUpToIndex.filter((m) => m.role === "user")

    if (userMessages.length === 0) return

    setMessages(messagesUpToIndex)
    setPending(true)

    try {
      const res = await fetch(SIMPLE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesUpToIndex }),
      })
      console.log(res)
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
              sources: data.sources || [],
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

        // Translate the response if not in English
        const translatedContent =
          selectedLanguage !== "EN" ? await translateToSelectedLanguage(responseContent) : responseContent

        const newMessage: Message = {
          id: messageId,
          role: "assistant",
          content: translatedContent,
          timestamp: new Date(),
          sources: data.sources || [],
        }

        setMessages((msgs) => [...msgs, newMessage])

        // Auto-read the assistant message
        if (autoReadMessages) {
          const currentLang = languageOptions.find((lang) => lang.code === selectedLanguage)
          setTimeout(() => {
            speakText(translatedContent, messageId, currentLang?.speechLang || "en-US")
          }, 500)
        }
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

  useEffect(() => {
    // Load and cache available voices
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Some browsers need a small delay to properly load voices
      setTimeout(() => {
        const voices = window.speechSynthesis.getVoices()
        console.log(
          "Available voices:",
          voices.map((v) => `${v.name} (${v.lang})`),
        )
      }, 100)
    }
  }, [])

  return (
    <div
      className="flex h-screen bg-background font-sans"
      style={{ fontFamily: "'Noto Sans', 'Noto Sans Telugu', sans-serif" }}
    >
      {/* Sources Panel */}
      <AnimatePresence>
        {sourcesPanel.isOpen && (
          <motion.div
            className="w-80 bg-background border-r border-border flex flex-col"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-white">Sources</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {sourcesPanel.sources.length}
                </span>
              </div>
              <motion.button
                onClick={closeSources}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sourcesPanel.sources.map((source, index) => (
                <motion.div
                  key={source.id}
                  className="bg-muted/50 rounded-lg p-3 border border-border hover:border-muted-foreground transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-sm text-foreground line-clamp-2">{source.title}</h3>
                    <motion.a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </motion.a>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{source.content}</p>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary/10 rounded flex items-center justify-center">
                      <Globe className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{source.source}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
        <div className="flex flex-col flex-1">
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
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                code: ({ children }) => (
                                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                                ),
                                pre: ({ children }) => (
                                  <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm">{children}</pre>
                                ),
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {children}
                                  </a>
                                ),
                                h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-muted pl-4 italic">{children}</blockquote>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>

                        {/* Sources buttons */}
                        {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            <motion.button
                              onClick={() => showSources(message.sources!)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white  text-primary rounded-full text-xs font-medium transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <FileText className="w-3 h-3" />
                              <span>{message.sources.length} Sources</span>
                            </motion.button>
                          </div>
                        )}

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
                                message.isPlaying ? stopSpeaking() : speakText(message.content, message.id)
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
            {/* Language and Auto-read Controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-muted border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.code} - {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoReadMessages}
                      onChange={(e) => setAutoReadMessages(e.target.checked)}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    />
                    Auto-read responses
                  </label>
                </div>
              </div>

              {/* Stop All Speech Button */}
              {messages.some((m) => m.isPlaying) && (
                <motion.button
                  onClick={stopSpeaking}
                  className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-md text-sm hover:bg-red-500/20 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <VolumeX className="w-4 h-4" />
                  Stop Reading
                </motion.button>
              )}
            </div>

            <form onSubmit={onSubmit} className="relative">
              <div className="flex items-end gap-2 bg-muted/50 rounded-2xl border border-border focus-within:border-muted-foreground transition-colors">
                <button type="button" className="p-3 text-muted-foreground hover:text-foreground transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    isListening
                      ? "Listening..."
                      : `Message FinBot in ${languageOptions.find((l) => l.code === selectedLanguage)?.name}...`
                  }
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
    </div>
  )
}
