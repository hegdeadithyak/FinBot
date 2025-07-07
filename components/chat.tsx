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
  Settings,
  Star,
  Sparkles,
  ChevronDown,
  BookOpen
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { redirect, useRouter } from "next/navigation"

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
  const [isConnected, setIsConnected] = useState(true)
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
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showBlogPanel, setShowBlogPanel] = useState(false)

  const languageOptions = [
    { code: "EN", name: "English", speechLang: "en-US", translationCode: "en", flag: "🇺🇸" },
    { code: "HI", name: "Hindi", speechLang: "hi-IN", translationCode: "hi", flag: "🇮🇳" },
    { code: "TEL", name: "Telugu", speechLang: "te-IN", translationCode: "te", flag: "🇮🇳" },
    { code: "ES", name: "Spanish", speechLang: "es-ES", translationCode: "es", flag: "🇪🇸" },
    { code: "FR", name: "French", speechLang: "fr-FR", translationCode: "fr", flag: "🇫🇷" },
    { code: "DE", name: "German", speechLang: "de-DE", translationCode: "de", flag: "🇩🇪" },
    { code: "ZH", name: "Chinese", speechLang: "zh-CN", translationCode: "zh", flag: "🇨🇳" },
    { code: "AR", name: "Arabic", speechLang: "ar-SA", translationCode: "ar", flag: "🇸🇦" },
    { code: "JA", name: "Japanese", speechLang: "ja-JP", translationCode: "ja", flag: "🇯🇵" },
    { code: "KO", name: "Korean", speechLang: "ko-KR", translationCode: "ko", flag: "🇰🇷" },
  ]

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  //@ts-ignore
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
        recognition.lang = "en-US"
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

      if (window.AudioContext) {
        audioContextRef.current = new AudioContext()
      }
    }

    return () => {
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

          setTimeout(() => {
            if (mediaRecorder.state === "recording") {
              mediaRecorder.stop()
            }
          }, 15000)
        })
        .catch(reject)
    })
  }

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

        const audioBlob = await recordAudioBlob()

        const formData = new FormData()
        formData.append("audio", audioBlob)
        formData.append(
          "language",
          languageOptions.find((lang) => lang.code === selectedLanguage)?.translationCode || "en",
        )

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Speech recognition failed: ${response.statusText}`)
        }

        const { transcript, detectedLanguage } = await response.json()

        setTranscript(transcript)
        if (inputRef.current) {
          inputRef.current.value = transcript
        }

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

  const speakText = async (text: string, messageId: string, language?: string) => {
    try {
      if (synthRef.current) {
        synthRef.current.cancel()
      }

      setMessages((msgs) =>
        msgs.map((m) => ({
          ...m,
          isPlaying: m.id === messageId,
        })),
      )

      const currentLang = languageOptions.find((lang) => lang.code === selectedLanguage)
      const langCode = language || currentLang?.speechLang || "en-US"

      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          languageCode: langCode,
          voiceName: langCode.startsWith("en") ? "en-US-Wavenet-F" : undefined,
          ssmlGender: "FEMALE",
        }),
      })

      if (!response.ok) {
        throw new Error(`Text-to-speech failed: ${response.statusText}`)
      }

      const audioData = await response.arrayBuffer()

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const audioContext = audioContextRef.current
      const audioBuffer = await audioContext.decodeAudioData(audioData)
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)

      source.onended = () => {
        setMessages((msgs) =>
          msgs.map((m) => ({
            ...m,
            isPlaying: false,
          })),
        )
      }

      source.start(0)
    } catch (error) {
      console.error("Text-to-speech error:", error)
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

    if (audioContextRef.current) {
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
      return text
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
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setTimeout(() => {
        const voices = window.speechSynthesis.getVoices()
        console.log(
          "Available voices:",
          voices.map((v) => `${v.name} (${v.lang})`),
        )
      }, 100)
    }
  }, [])

  const currentLanguage = languageOptions.find((lang) => lang.code === selectedLanguage) || languageOptions[0]
  const router =  useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      
      <div className="relative flex h-screen">
        {/* Blog Panel */}
        
        {/* Sources Panel */}
        <AnimatePresence>
          {sourcesPanel.isOpen && (
            <motion.div
              className="w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col shadow-xl"
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">Sources</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{sourcesPanel.sources.length} references</p>
                  </div>
                </div>
                <motion.button
                  onClick={closeSources}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {sourcesPanel.sources.map((source, index) => (
                  <motion.div
                    key={source.id}
                    className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">
                        {source.title}
                      </h3>
                      <motion.a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </motion.a>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 line-clamp-3 leading-relaxed">
                      {source.content}
                    </p>

                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                        <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{source.source}</span>
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
            className="flex items-center justify-between p-6 border-b border-white/20 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => onToggleSidebar?.()}
                className="p-3 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </motion.button>
              
              <div className="flex items-center gap-4">
                <motion.div
                  className="relative"
                  animate={{ 
                    rotate: [0, 360],
                  }}
                  transition={{ 
                    duration: 20, 
                    repeat: Number.POSITIVE_INFINITY, 
                    ease: "linear" 
                  }}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-white-500 via-gray-700 to-black-900 rounded-2xl flex items-center justify-center shadow-lg">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-white-500 via-gray-700 to-black-900 rounded-2xl blur opacity-20 animate-pulse" />
                </motion.div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-slate-100 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                      FinBot
                    </h1>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    >
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                    </motion.div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    AI Banking Assistant
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => window.location.href = "https://blogify-two-pi.vercel.app/"}
                className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full border border-white/20 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 shadow-sm"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Read Blogs</span>
              </motion.button>

              {preferredLanguage && (
                <motion.div 
                  className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 rounded-full border border-white/20 dark:border-slate-700/50"
                  whileHover={{ scale: 1.05 }}
                >
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{preferredLanguage}</span>
                </motion.div>
              )}
              
              <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 dark:border-slate-700/50">
                <motion.div 
                  className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}
                  animate={{ scale: isConnected ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {isConnected ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </motion.header>

          {/* Chat Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8">
              {messages.length === 0 && (
                <motion.div
                  className="text-center py-16"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <motion.div
                    className="relative mx-auto mb-8"
                    animate={{
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatDelay: 2,
                    }}
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-white-500 via-gray-700 to-black-900 rounded-3xl flex items-center justify-center shadow-2xl">
                      <Bot className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-white-500 via-gray-700 to-black-900 rounded-3xl blur-xl opacity-20 animate-pulse" />
                  </motion.div>
                  
                  <motion.h2 
                    className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-slate-100 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    Welcome to FinBot
                  </motion.h2>
                  
                  <motion.p 
                    className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    Your intelligent banking assistant powered by advanced AI. Ask me anything about your accounts, 
                    transactions, or banking services, and I'll provide personalized assistance.
                  </motion.p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {[
                      { text: "What's my account balance?", icon: "💰" },
                      { text: "How do I transfer money?", icon: "💸" },
                      { text: "Help with loan application", icon: "🏠" },
                      { text: "Credit card payment options", icon: "💳" },
                    ].map((suggestion, index) => (
                      <motion.button
                        key={index}
                        className="group p-4 text-left bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl hover:border-blue-200/50 dark:hover:border-blue-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        onClick={() => {
                          if (inputRef.current) {
                            inputRef.current.value = suggestion.text
                            inputRef.current.focus()
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{suggestion.icon}</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {suggestion.text}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="space-y-8">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      className="group"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className={`flex gap-4 ${message.role === "user" ? "justify-end" : ""}`}>
                        {message.role === "assistant" && (
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-white-500 via-gray-700 to-black-900 rounded-2xl flex items-center justify-center shadow-lg">
                              <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute -inset-1 bg-gradient-to-br from-white-500 via-gray-700 to-black-900 rounded-2xl blur opacity-20" />
                          </div>
                        )}

                        <div className={`flex-1 ${message.role === "user" ? "max-w-md ml-auto" : "max-w-none"}`}>
                          <motion.div
                            className={`${
                              message.role === "user"
                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl rounded-br-lg shadow-lg"
                                : "bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 rounded-3xl rounded-bl-lg shadow-lg border border-white/20 dark:border-slate-700/50"
                            } px-6 py-4`}
                            whileHover={{ scale: 1.01 }}
                          >
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold text-blue-600 dark:text-blue-400">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-slate-600 dark:text-slate-300">{children}</em>,
                                  code: ({ children }) => (
                                    <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg text-sm font-mono text-slate-800 dark:text-slate-200">{children}</code>
                                  ),
                                  pre: ({ children }) => (
                                    <pre className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl overflow-x-auto text-sm border border-slate-200 dark:border-slate-600">{children}</pre>
                                  ),
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                                  li: ({ children }) => <li className="text-slate-700 dark:text-slate-300">{children}</li>,
                                  a: ({ href, children }) => (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-600"
                                    >
                                      {children}
                                    </a>
                                  ),
                                  h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-slate-900 dark:text-slate-100">{children}</h3>,
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-blue-300 dark:border-blue-600 pl-4 italic text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 py-2 rounded-r-lg">{children}</blockquote>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </motion.div>

                          {/* Sources buttons */}
                          {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                            <div className="flex flex-wrap gap-3 mt-4">
                              <motion.button
                                onClick={() => showSources(message.sources!)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium border border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-300 shadow-sm"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <FileText className="w-4 h-4" />
                                <span>{message.sources.length} Sources</span>
                              </motion.button>
                            </div>
                          )}

                          {message.role === "assistant" && (
                            <motion.div
                              className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0 }}
                              whileHover={{ opacity: 1 }}
                            >
                              <motion.button
                                className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-xl transition-colors backdrop-blur-sm"
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => copyMessage(message.content, message.id)}
                              >
                                {copiedId === message.id ? (
                                  <Check className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                )}
                              </motion.button>

                              <motion.button
                                className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-xl transition-colors backdrop-blur-sm"
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => regenerateResponse(index)}
                              >
                                <RotateCcw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              </motion.button>

                              <motion.button
                                className={`p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-xl transition-colors backdrop-blur-sm ${
                                  message.liked ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"
                                }`}
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => likeMessage(message.id)}
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </motion.button>

                              <motion.button
                                className={`p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-xl transition-colors backdrop-blur-sm ${
                                  message.disliked ? "text-red-500" : "text-slate-500 dark:text-slate-400"
                                }`}
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => dislikeMessage(message.id)}
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </motion.button>

                              <motion.button
                                className={`p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-xl transition-colors backdrop-blur-sm ${
                                  message.isPlaying ? "text-blue-500" : "text-slate-500 dark:text-slate-400"
                                }`}
                                whileHover={{ scale: 1.1, y: -2 }}
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
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
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
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-6 my-6 shadow-lg"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                          <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Language Preference</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
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
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        {["English", "Spanish", "French", "German", "Chinese", "Hindi", "Arabic"].map((lang) => (
                          <motion.button
                            key={lang}
                            className="px-4 py-2 text-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-300 rounded-xl border border-white/50 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 font-medium"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setUserLanguagePreference(lang)}
                          >
                            {lang}
                          </motion.button>
                        ))}
                        <motion.button
                          className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300"
                          whileHover={{ scale: 1.05, y: -2 }}
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
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                    >
                      <motion.div
                        className="relative"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-white-500 via-gray-700 to-black-900 rounded-2xl flex items-center justify-center shadow-lg">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -inset-1 bg-gradient-to-br from-white-500 via-gray-700 to-black-900 rounded-2xl blur opacity-20" />
                      </motion.div>
                      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl rounded-bl-lg px-6 py-4 shadow-lg border border-white/20 dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">FinBot is thinking</span>
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 bg-blue-400 rounded-full"
                                animate={{
                                  scale: [1, 1.5, 1],
                                  opacity: [0.3, 1, 0.3],
                                }}
                                transition={{
                                  duration: 0.8,
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
            className="border-t border-white/20 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl p-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="max-w-4xl mx-auto">
              {/* Language and Auto-read Controls */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <motion.button
                      onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                      className="flex items-center gap-3 px-4 py-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 shadow-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-lg">{currentLanguage.flag}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {currentLanguage.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {currentLanguage.code}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </motion.button>

                    <AnimatePresence>
                      {showLanguageDropdown && (
                        <motion.div
                          className="absolute top-full left-0 mt-2 w-64 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-xl shadow-xl z-50"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <div className="p-2 max-h-64 overflow-y-auto">
                            {languageOptions.map((lang) => (
                              <motion.button
                                key={lang.code}
                                onClick={() => {
                                  setSelectedLanguage(lang.code)
                                  setShowLanguageDropdown(false)
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                  selectedLanguage === lang.code
                                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                                whileHover={{ x: 4 }}
                              >
                                <span className="text-lg">{lang.flag}</span>
                                <div>
                                  <div className="font-medium">{lang.name}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">{lang.code}</div>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={autoReadMessages}
                        onChange={(e) => setAutoReadMessages(e.target.checked)}
                        className="sr-only"
                      />
                      <motion.div
                        className={`w-12 h-6 rounded-full border-2 transition-colors ${
                          autoReadMessages
                            ? "bg-blue-500 border-blue-500"
                            : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                          animate={{
                            x: autoReadMessages ? 24 : 2,
                          }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Auto-read responses
                      </span>
                    </div>
                  </label>
                </div>

                {/* Stop All Speech Button */}
                {messages.some((m) => m.isPlaying) && (
                  <motion.button
                    onClick={stopSpeaking}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-300 shadow-sm border border-red-200 dark:border-red-800"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <VolumeX className="w-4 h-4" />
                    Stop Reading
                  </motion.button>
                )}
              </div>

              <form onSubmit={onSubmit} className="relative">
                <div className="flex items-end gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-700/50 focus-within:border-blue-300 dark:focus-within:border-blue-700 transition-all duration-300 shadow-xl">
                  <motion.button 
                    type="button" 
                    className="p-4 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Paperclip className="w-5 h-5" />
                  </motion.button>

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={
                      isListening
                        ? "Listening..."
                        : `Message FinBot in ${currentLanguage.name}...`
                    }
                    className="flex-1 bg-transparent px-2 py-4 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-lg"
                    disabled={pending || !isConnected || isListening}
                    value={isListening ? transcript : undefined}
                  />

                  <AnimatePresence mode="wait">
                    {isListening ? (
                      <motion.button
                        key="listening"
                        type="button"
                        className="p-4 text-red-500 hover:text-red-600 transition-colors"
                        onClick={toggleListening}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                        >
                          <Mic className="w-5 h-5" />
                        </motion.div>
                      </motion.button>
                    ) : (
                      <motion.button
                        key="mic"
                        type="button"
                        className="p-4 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
                    className="p-4 m-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg disabled:shadow-none"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {pending ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <Loader2 className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </motion.button>
                </div>
              </form>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4 font-medium">
                FinBot can make mistakes. Consider checking important information.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <Chat 
      sidebarOpen={sidebarOpen} 
      onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
    />
  )
}

export default Index