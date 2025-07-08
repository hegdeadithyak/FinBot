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
  Sparkles,
  ChevronDown,
  BookOpen,
  Moon,
  Sun,
  Brain,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Sidebar } from "@/components/sidebar"

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

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
  const [isDarkMode, setIsDarkMode] = useState(false)

  const languageOptions = [
    { code: "EN", name: "English", speechLang: "en-US", translationCode: "en", flag: "🇺🇸" },
    { code: "HI", name: "Hindi", speechLang: "hi-IN", translationCode: "hi", flag: "🇮🇳" },
    { code: "TEL", name: "Telugu", speechLang: "te-IN", translationCode: "te", flag: "🇮🇳" },
    { code: "ES", name: "Spanish", speechLang: "es-ES", translationCode: "es", flag: "🇪🇸" },
    { code: "FR", name: "French", speechLang: "fr-FR", translationCode: "fr", flag: "🇫🇷" },
    { code: "DE", name: "German", speechLang: "German", translationCode: "de", flag: "🇩🇪" },
    { code: "ZH", name: "Chinese", speechLang: "zh-CN", translationCode: "zh", flag: "🇨🇳" },
    { code: "AR", name: "Arabic", speechLang: "ar-SA", translationCode: "ar", flag: "🇸🇦" },
    { code: "JA", name: "Japanese", speechLang: "ja-JP", translationCode: "ja", flag: "🇯🇵" },
    { code: "KO", name: "Korean", speechLang: "ko-KR", translationCode: "ko", flag: "🇰🇷" },
  ]

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  //@ts-ignore
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const speakingRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Enhanced GSAP Animation Functions
  const initializeAnimations = () => {
    // Animate chat container on load with more sophisticated entrance
    if (chatContainerRef.current) {
      gsap.fromTo(
        chatContainerRef.current,
        {
          opacity: 0,
          scale: 0.92,
          y: 40,
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1,
          ease: "power4.out",
        },
      )
    }

    // Enhanced floating elements animation
    gsap.to(".floating-element", {
      y: -12,
      x: 8,
      rotation: 3,
      duration: 4,
      ease: "power1.inOut",
      yoyo: true,
      repeat: -1,
      stagger: 0.3,
    })

    // More dynamic sparkle animation
    gsap.to(".sparkle", {
      rotation: 360,
      scale: 1.1,
      duration: 6,
      ease: "none",
      repeat: -1,
      stagger: 0.8,
      transformOrigin: "center center",
    })

    // Animate header elements with stagger
    gsap.fromTo(
      ".header-item",
      {
        y: -20,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        delay: 0.3,
        ease: "back.out(1.7)",
      },
    )
  }

  const animateMessageIn = (element: HTMLElement, delay = 0) => {
    gsap.fromTo(
      element,
      {
        opacity: 0,
        y: 40,
        scale: 0.95,
        rotationX: 10,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotationX: 0,
        duration: 0.8,
        delay,
        ease: "back.out(1.4)",
      },
    )
  }

  const animateButtonHover = (element: HTMLElement) => {
    const tl = gsap.timeline({ paused: true })
    tl.to(element, {
      scale: 1.05,
      y: -3,
      duration: 0.3,
      ease: "back.out(1.7)",
    })

    element.addEventListener("mouseenter", () => tl.play())
    element.addEventListener("mouseleave", () => tl.reverse())
  }

  const animateTyping = () => {
    const dots = document.querySelectorAll(".typing-dot")
    gsap.to(dots, {
      scale: 1.3,
      opacity: 0.9,
      duration: 0.8,
      ease: "power2.inOut",
      stagger: 0.15,
      yoyo: true,
      repeat: -1,
    })
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Enhanced theme toggle with animation
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")

    // Animate theme transition
    gsap.to(chatContainerRef.current, {
      scale: 0.98,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
    })
  }

  useEffect(() => {
    initializeAnimations()
  }, [])

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`/api/chat/health`)
        setIsConnected(response.ok)

  
  useEffect(() => {
    if (pending) {
      animateTyping()
    }
  }, [pending])

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
    setMessages(initial)
    setPending(true)
    inputRef.current!.value = ""
    setTranscript("")

    try {
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

  const currentLanguage = languageOptions.find((lang) => lang.code === selectedLanguage) || languageOptions[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-all duration-700">
      {/* Enhanced floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-element absolute top-20 left-10 w-40 h-40 bg-gradient-to-br from-blue-200/20 to-cyan-200/20 dark:from-blue-800/10 dark:to-cyan-800/10 rounded-full blur-3xl" />
        <div className="floating-element absolute top-40 right-20 w-32 h-32 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 dark:from-emerald-800/10 dark:to-teal-800/10 rounded-full blur-2xl" />
        <div className="floating-element absolute bottom-32 left-1/4 w-48 h-48 bg-gradient-to-br from-amber-200/20 to-orange-200/20 dark:from-amber-800/10 dark:to-orange-800/10 rounded-full blur-3xl" />
        <div className="floating-element absolute bottom-20 right-1/3 w-36 h-36 bg-gradient-to-br from-rose-200/20 to-pink-200/20 dark:from-rose-800/10 dark:to-pink-800/10 rounded-full blur-2xl" />
        <div className="floating-element absolute top-1/2 left-1/2 w-28 h-28 bg-gradient-to-br from-violet-200/15 to-purple-200/15 dark:from-violet-800/8 dark:to-purple-800/8 rounded-full blur-xl" />
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={onToggleSidebar} />

      <div className="relative flex h-screen">
        {/* Enhanced Sources Panel */}
        {sourcesPanel.isOpen && (
          <div className="w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/80 to-blue-50/80 dark:from-slate-800/80 dark:to-slate-900/80">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-2xl shadow-lg">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 text-xl">Sources</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {sourcesPanel.sources.length} references found
                  </p>
                </div>
              </div>
              <button
                onClick={closeSources}
                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {sourcesPanel.sources.map((source, index) => (
                <div
                  key={source.id}
                  className="group bg-gradient-to-br from-white/90 to-slate-50/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/40 dark:border-slate-700/40 hover:border-blue-300/60 dark:hover:border-blue-600/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed text-lg">
                      {source.title}
                    </h3>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-300 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </a>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-4 line-clamp-3 leading-relaxed">
                    {source.content}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-full flex items-center justify-center shadow-sm">
                      <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400 truncate font-semibold">
                      {source.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex flex-col flex-1" ref={chatContainerRef}>
          {/* Enhanced Modern Header */}
          <header className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/98 via-slate-50/98 to-blue-50/98 dark:from-slate-900/98 dark:via-slate-800/98 dark:to-slate-900/98 backdrop-blur-3xl" />
            <div className="relative flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => onToggleSidebar?.()}
                  className="header-item p-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 group shadow-lg backdrop-blur-sm"
                >
                  <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </button>

                <div className="flex items-center gap-5">
                  <div className="header-item relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl floating-element">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-3xl blur-xl opacity-40 animate-pulse" />
                    <div className="sparkle absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="header-item">
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-cyan-700 dark:from-slate-100 dark:via-blue-300 dark:to-cyan-300 bg-clip-text text-transparent">
                        FinBot
                      </h1>
                      <div className="sparkle">
                        <Brain className="w-6 h-6 text-blue-500" />
                      </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-bold text-lg">Your AI Banking Assistant</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => (window.location.href = "https://blogify-two-pi.vercel.app/")}
                  className="header-item flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-slate-100/80 to-blue-100/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300/70 dark:hover:border-blue-600/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 group"
                >
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Read Blogs</span>
                </button>

                <button
                  onClick={toggleTheme}
                  className="header-item p-3 bg-gradient-to-r from-slate-100/80 to-blue-100/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-300/70 dark:hover:border-blue-600/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 group"
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                  )}
                </button>

                {preferredLanguage && (
                  <div className="header-item flex items-center gap-3 bg-gradient-to-r from-slate-100/80 to-blue-100/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-slate-700 dark:text-slate-300 font-bold">{preferredLanguage}</span>
                  </div>
                )}

                <div className="header-item flex items-center gap-3 bg-gradient-to-r from-slate-100/80 to-blue-100/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
                  <div
                    className={`w-3 h-3 rounded-full shadow-sm ${
                      isConnected
                        ? "bg-gradient-to-r from-emerald-400 to-green-500 animate-pulse"
                        : "bg-gradient-to-r from-red-400 to-red-500"
                    }`}
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-bold">
                    {isConnected ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Enhanced Chat Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto px-8 py-12">
              {messages.length === 0 && (
                <div className="text-center py-24">
                  <div className="relative mx-auto mb-12 w-48 h-48">
                    <div className="w-48 h-48 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-full flex items-center justify-center shadow-3xl floating-element">
                      <Bot className="w-24 h-24 text-white" />
                    </div>
                    <div className="absolute -inset-6 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-full blur-3xl opacity-30 animate-pulse" />
                    <div className="sparkle absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-full flex items-center justify-center shadow-xl">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <h2 className="text-7xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-cyan-700 dark:from-slate-100 dark:via-blue-300 dark:to-cyan-300 bg-clip-text text-transparent mb-8">
                    Welcome to FinBot
                  </h2>

                  <p className="text-2xl text-slate-600 dark:text-slate-400 mb-20 max-w-4xl mx-auto leading-relaxed font-semibold">
                    Your intelligent banking assistant powered by advanced AI. Ask me anything about your accounts,
                    transactions, or banking services, and I'll provide personalized assistance.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {[
                      {
                        text: "What's my account balance?",
                        icon: "💰",
                        gradient: "from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30",
                        border: "border-emerald-200/60 dark:border-emerald-700/40",
                        hover: "hover:border-emerald-300/80 dark:hover:border-emerald-600/60",
                        iconBg: "bg-emerald-500",
                      },
                      {
                        text: "How do I transfer money?",
                        icon: "💸",
                        gradient: "from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30",
                        border: "border-blue-200/60 dark:border-blue-700/40",
                        hover: "hover:border-blue-300/80 dark:hover:border-blue-600/60",
                        iconBg: "bg-blue-500",
                      },
                      {
                        text: "Help with loan application",
                        icon: "🏠",
                        gradient: "from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
                        border: "border-amber-200/60 dark:border-amber-700/40",
                        hover: "hover:border-amber-300/80 dark:hover:border-amber-600/60",
                        iconBg: "bg-amber-500",
                      },
                      {
                        text: "Credit card payment options",
                        icon: "💳",
                        gradient: "from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30",
                        border: "border-rose-200/60 dark:border-rose-700/40",
                        hover: "hover:border-rose-300/80 dark:hover:border-rose-600/60",
                        iconBg: "bg-rose-500",
                      },
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        className={`group p-8 text-left bg-gradient-to-br ${suggestion.gradient} backdrop-blur-sm border ${suggestion.border} ${suggestion.hover} rounded-3xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 animate-fade-in-up`}
                        style={{ animationDelay: `${1 + index * 0.15}s` }}
                        onClick={() => {
                          if (inputRef.current) {
                            inputRef.current.value = suggestion.text
                            inputRef.current.focus()
                          }
                        }}
                      >
                        <div className="flex items-center gap-5">
                          <div
                            className={`w-14 h-14 ${suggestion.iconBg} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                          >
                            <span className="text-2xl">{suggestion.icon}</span>
                          </div>
                          <span className="text-slate-700 dark:text-slate-300 font-bold text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {suggestion.text}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-12">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className="group animate-fade-in-up"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className={`flex gap-6 ${message.role === "user" ? "justify-end" : ""}`}>
                      {message.role === "assistant" && (
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl">
                            <Bot className="w-8 h-8 text-white" />
                          </div>
                          <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl blur opacity-50" />
                        </div>
                      )}

                      <div className={`flex-1 ${message.role === "user" ? "max-w-3xl ml-auto" : "max-w-none"}`}>
                        <div
                          className={`${
                            message.role === "user"
                              ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-3xl rounded-br-xl shadow-2xl"
                              : "bg-gradient-to-br from-white/98 to-slate-50/98 dark:from-slate-800/98 dark:to-slate-900/98 backdrop-blur-sm text-slate-900 dark:text-slate-100 rounded-3xl rounded-bl-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50"
                          } px-8 py-6 hover:shadow-3xl transition-all duration-500`}
                        >
                          <div className="prose prose-xl max-w-none dark:prose-invert">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-4 last:mb-0 leading-relaxed text-lg">{children}</p>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-bold text-blue-600 dark:text-blue-400">{children}</strong>
                                ),
                                em: ({ children }) => (
                                  <em className="italic text-slate-600 dark:text-slate-300">{children}</em>
                                ),
                                code: ({ children }) => (
                                  <code className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl text-base font-mono text-slate-800 dark:text-slate-200 shadow-sm">
                                    {children}
                                  </code>
                                ),
                                pre: ({ children }) => (
                                  <pre className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl overflow-x-auto text-base border border-slate-200 dark:border-slate-700 shadow-sm">
                                    {children}
                                  </pre>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc list-inside mb-6 space-y-3">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal list-inside mb-6 space-y-3">{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li className="text-slate-700 dark:text-slate-300 text-lg">{children}</li>
                                ),
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-600 font-semibold"
                                  >
                                    {children}
                                  </a>
                                ),
                                h1: ({ children }) => (
                                  <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-2xl font-bold mb-5 text-slate-900 dark:text-slate-100">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                                    {children}
                                  </h3>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-blue-400 dark:border-blue-600 pl-8 italic text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 py-4 rounded-r-2xl my-6">
                                    {children}
                                  </blockquote>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>

                        {/* Enhanced Sources buttons */}
                        {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                          <div className="flex flex-wrap gap-4 mt-6">
                            <button
                              onClick={() => showSources(message.sources!)}
                              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-slate-100/90 to-blue-100/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-sm text-blue-600 dark:text-blue-400 rounded-2xl text-base font-bold border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300/80 dark:hover:border-blue-600/60 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                            >
                              <FileText className="w-5 h-5" />
                              <span>{message.sources.length} Sources</span>
                            </button>
                          </div>
                        )}

                        {message.role === "assistant" && (
                          <div className="flex items-center gap-3 mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <button
                              className="p-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-300 backdrop-blur-sm hover:scale-110 active:scale-95 shadow-sm"
                              onClick={() => copyMessage(message.content, message.id)}
                            >
                              {copiedId === message.id ? (
                                <Check className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Copy className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                              )}
                            </button>

                            <button
                              className="p-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-300 backdrop-blur-sm hover:scale-110 active:scale-95 shadow-sm"
                              onClick={() => regenerateResponse(index)}
                            >
                              <RotateCcw className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>

                            <button
                              className={`p-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-300 backdrop-blur-sm hover:scale-110 active:scale-95 shadow-sm ${
                                message.liked ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"
                              }`}
                              onClick={() => likeMessage(message.id)}
                            >
                              <ThumbsUp className="w-5 h-5" />
                            </button>

                            <button
                              className={`p-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-300 backdrop-blur-sm hover:scale-110 active:scale-95 shadow-sm ${
                                message.disliked ? "text-red-500" : "text-slate-500 dark:text-slate-400"
                              }`}
                              onClick={() => dislikeMessage(message.id)}
                            >
                              <ThumbsDown className="w-5 h-5" />
                            </button>

                            <button
                              className={`p-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-300 backdrop-blur-sm hover:scale-110 active:scale-95 shadow-sm ${
                                message.isPlaying ? "text-blue-500" : "text-slate-500 dark:text-slate-400"
                              }`}
                              onClick={() =>
                                message.isPlaying ? stopSpeaking() : speakText(message.content, message.id)
                              }
                            >
                              {message.isPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl">
                          <User className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Enhanced Language Prompt */}
                {showLanguagePrompt && (
                  <div className="bg-gradient-to-r from-slate-50/98 to-blue-50/98 dark:from-slate-800/98 dark:to-slate-900/98 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-3xl p-8 my-8 shadow-2xl animate-fade-in-up">
                    <div className="flex items-center gap-6 mb-8">
                      <div className="p-4 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 rounded-2xl shadow-lg">
                        <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-slate-100 mb-3 text-2xl">
                          Language Preference
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
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
                    <div className="flex flex-wrap gap-4">
                      {["English", "Spanish", "French", "German", "Chinese", "Hindi", "Arabic"].map((lang) => (
                        <button
                          key={lang}
                          className="px-6 py-3 text-base bg-gradient-to-r from-white/95 to-slate-50/95 dark:from-slate-800/95 dark:to-slate-900/95 backdrop-blur-sm text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300/80 dark:hover:border-blue-600/60 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                          onClick={() => setUserLanguagePreference(lang)}
                        >
                          {lang}
                        </button>
                      ))}
                      <button
                        className="px-6 py-3 text-base bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-500 dark:text-slate-400 rounded-2xl border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                        onClick={() => {
                          setShowLanguagePrompt(false)
                          setLanguageAsked(true)
                        }}
                      >
                        No, thanks
                      </button>
                    </div>
                  </div>
                )}

                {/* Enhanced Thinking Animation */}
                {pending && (
                  <div className="flex gap-6 animate-fade-in-up">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse">
                        <Bot className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl blur opacity-50" />
                    </div>
                    <div className="bg-gradient-to-br from-white/98 to-slate-50/98 dark:from-slate-800/98 dark:to-slate-900/98 backdrop-blur-sm rounded-3xl rounded-bl-xl px-8 py-6 shadow-2xl border border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center gap-5">
                        <span className="text-slate-700 dark:text-slate-300 font-bold text-xl">FinBot is thinking</span>
                        <div className="flex gap-2">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="typing-dot w-3 h-3 bg-blue-400 rounded-full"
                              style={{ animationDelay: `${i * 0.2}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Enhanced Modern Input Area */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/98 via-slate-50/98 to-blue-50/98 dark:from-slate-900/98 dark:via-slate-800/98 dark:to-slate-900/98 backdrop-blur-3xl" />
            <div className="relative border-t border-slate-200/50 dark:border-slate-700/50 p-6">
              <div className="max-w-6xl mx-auto">
                {/* Enhanced Language and Auto-read Controls */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-8">
                    <div className="relative">
                      <button
                        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-slate-100/90 to-blue-100/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl hover:border-blue-300/80 dark:hover:border-blue-600/80 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                      >
                        <span className="text-2xl">{currentLanguage.flag}</span>
                        <div className="text-left">
                          <div className="text-base font-bold text-slate-700 dark:text-slate-300">
                            {currentLanguage.name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{currentLanguage.code}</div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      </button>

                      {showLanguageDropdown && (
                        <div className="absolute top-full left-0 mt-3 w-80 bg-white/98 dark:bg-slate-800/98 backdrop-blur-3xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-2xl z-50 animate-fade-in-up">
                          <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                            {languageOptions.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() => {
                                  setSelectedLanguage(lang.code)
                                  setShowLanguageDropdown(false)
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-300 ${
                                  selectedLanguage === lang.code
                                    ? "bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 text-blue-700 dark:text-blue-300 shadow-sm"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                } hover:scale-105 active:scale-95`}
                              >
                                <span className="text-xl">{lang.flag}</span>
                                <div>
                                  <div className="font-bold">{lang.name}</div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400">{lang.code}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <label className="flex items-center gap-4 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={autoReadMessages}
                          onChange={(e) => setAutoReadMessages(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-16 h-8 rounded-full border-2 transition-all duration-300 shadow-lg ${
                            autoReadMessages
                              ? "bg-gradient-to-r from-blue-500 to-cyan-500 border-blue-500"
                              : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                              autoReadMessages ? "translate-x-8" : "translate-x-1"
                            } mt-0.5`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                          Auto-read responses
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Enhanced Stop All Speech Button */}
                  {messages.some((m) => m.isPlaying) && (
                    <button
                      onClick={stopSpeaking}
                      className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 text-red-600 dark:text-red-400 rounded-2xl text-base font-bold hover:from-red-200 hover:to-rose-200 dark:hover:from-red-900/50 dark:hover:to-rose-900/50 transition-all duration-300 shadow-lg hover:shadow-xl border border-red-200 dark:border-red-800 hover:scale-105 active:scale-95 animate-fade-in-left"
                    >
                      <VolumeX className="w-5 h-5" />
                      Stop Reading
                    </button>
                  )}
                </div>

                <form onSubmit={onSubmit} className="relative">
                  <div className="flex items-end gap-4 bg-gradient-to-r from-white/98 to-slate-50/98 dark:from-slate-800/98 dark:to-slate-900/98 backdrop-blur-3xl rounded-3xl border border-slate-200/60 dark:border-slate-700/60 focus-within:border-blue-400/80 dark:focus-within:border-blue-500/80 transition-all duration-300 shadow-2xl focus-within:shadow-3xl">
                    <button
                      type="button"
                      className="p-4 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:scale-110 active:scale-95"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={isListening ? "Listening..." : `Message FinBot in ${currentLanguage.name}...`}
                      className="flex-1 bg-transparent px-3 py-4 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-base font-medium"
                      disabled={pending || !isConnected || isListening}
                      value={isListening ? transcript : undefined}
                    />

                    {isListening ? (
                      <button
                        type="button"
                        className="p-4 text-red-500 hover:text-red-600 transition-all duration-300 hover:scale-110 active:scale-95"
                        onClick={toggleListening}
                      >
                        <div className="animate-pulse">
                          <Mic className="w-5 h-5" />
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="p-4 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:scale-110 active:scale-95"
                        onClick={toggleListening}
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={pending || !isConnected || (isListening && !transcript)}
                      className="p-4 m-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl disabled:shadow-none hover:shadow-2xl hover:scale-105 active:scale-95"
                    >
                      {pending ? (
                        <div className="animate-spin">
                          <Loader2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>

                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6 font-medium">
                  FinBot can make mistakes. Consider checking important information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return <Chat sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
}

export default Index
