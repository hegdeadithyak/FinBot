"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Plus,
  MessageSquare,
  Settings,
  MoreHorizontal,
  History,
  Bot,
  Download,
  Share,
  Moon,
  Sun,
  X,
  ChevronRight,
  Sparkles,
  Zap,
  Search,
  Archive,
  Pin,
  Clock,
} from "lucide-react"
import { gsap } from "gsap"

/* ── Types ─────────────────────────────────────────── */
interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

interface ChatCard {
  id: string
  title: string
  preview: string
  updatedAt: string
  isPinned?: boolean
  isArchived?: boolean
}

/* ── Component ─────────────────────────────────────── */
export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [sessions, setSessions] = useState<ChatCard[] | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeHover, setActiveHover] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showArchived, setShowArchived] = useState(false)

  const router = useRouter()
  const pathname = usePathname()

  const sidebarRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Toggle theme with smooth animation
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")

    // Animate theme transition
    gsap.to(sidebarRef.current, {
      scale: 0.98,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
    })
  }

  // Enhanced GSAP animations
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      // Main sidebar entrance animation
      gsap.fromTo(
        sidebarRef.current,
        {
          x: -320,
          opacity: 0,
          scale: 0.95,
        },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: "power4.out",
        },
      )

      // Animate floating background elements
      gsap.to(".sidebar-float", {
        y: -8,
        rotation: 5,
        duration: 3,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.3,
      })

      // Sparkle rotation animation
      gsap.to(".sidebar-sparkle", {
        rotation: 360,
        duration: 6,
        ease: "none",
        repeat: -1,
        transformOrigin: "center center",
      })

      // Header elements stagger animation
      gsap.fromTo(
        ".sidebar-header-item",
        {
          y: 20,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          delay: 0.3,
          ease: "back.out(1.7)",
        },
      )
    }
  }, [isOpen])

  // Animate chat list items
  useEffect(() => {
    if (sessions && listRef.current) {
      const items = listRef.current.querySelectorAll(".chat-item")
      gsap.fromTo(
        items,
        {
          opacity: 0,
          y: 30,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: "back.out(1.4)",
          delay: 0.2,
        },
      )
    }
  }, [sessions])

  // Settings modal animation
  useEffect(() => {
    if (showSettings && settingsRef.current) {
      gsap.fromTo(
        settingsRef.current,
        {
          scale: 0.8,
          opacity: 0,
          y: 50,
        },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "back.out(2)",
        },
      )
    }
  }, [showSettings])

  // Enhanced button hover animations
  const animateButtonHover = (element: HTMLElement, isEnter: boolean) => {
    if (isEnter) {
      gsap.to(element, {
        x: 6,
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out",
      })
    } else {
      gsap.to(element, {
        x: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      })
    }
  }

  // Chat item hover animation
  const animateChatItemHover = (element: HTMLElement, isEnter: boolean) => {
    if (isEnter) {
      gsap.to(element, {
        x: 4,
        scale: 1.01,
        duration: 0.3,
        ease: "power2.out",
      })
    } else {
      gsap.to(element, {
        x: 0,
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      })
    }
  }

  // Load sessions
  useEffect(() => {
    if (!isOpen || sessions !== null) return
    ;(async () => {
      try {
        const r = await fetch("/api/chat/sessions", { credentials: "include" })
        const { sessions: s } = r.ok ? await r.json() : { sessions: [] }
        setSessions(s)
      } catch {
        setSessions([])
      }
    })()
  }, [isOpen, sessions])

  // Handle new chat creation
  const handleNewChat = async () => {
    try {
      const r = await fetch("/api/chat/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })

      if (!r.ok) throw new Error("create failed")

      const { session } = await r.json()
      setSessions((prev) => (prev ? [session, ...prev] : [session]))
      router.push(`/chat/${session.id}`)
      onToggle()

      // Animate new chat creation
      gsap.fromTo(".new-chat-btn", { scale: 0.95 }, { scale: 1, duration: 0.2, ease: "back.out(1.7)" })

      // Summarize via server
      try {
        const sRes = await fetch("/api/chat/summary", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: session.id }),
        })

        if (sRes.ok) {
          const { title } = await sRes.json()
          setSessions((prev) => prev?.map((c) => (c.id === session.id ? { ...c, title } : c)) ?? prev)
        }
      } catch {
        /* ignore – keep "New chat" */
      }
    } catch (err) {
      console.error("New-chat error:", err)
    }
  }

  // Filter sessions based on search and archive status
  const filteredSessions =
    sessions?.filter((session) => {
      const matchesSearch =
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.preview.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesArchive = showArchived ? session.isArchived : !session.isArchived
      return matchesSearch && matchesArchive
    }) || []

  // Skeleton list while loading
  const list =
    sessions ??
    [...Array(6)].map((_, i) => ({
      id: `sk-${i}`,
      title: "",
      preview: "",
      updatedAt: "",
    }))

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-20 md:hidden" onClick={onToggle} />

      <div
        ref={sidebarRef}
        className="fixed inset-y-0 left-0 z-30 w-80 h-full bg-gradient-to-br from-white/98 via-slate-50/98 to-blue-50/98 dark:from-slate-900/98 dark:via-slate-800/98 dark:to-slate-900/98 backdrop-blur-2xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col shadow-2xl"
      >
        {/* Enhanced floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="sidebar-float absolute top-16 left-8 w-28 h-28 bg-gradient-to-br from-blue-200/20 to-cyan-200/20 dark:from-blue-800/10 dark:to-cyan-800/10 rounded-full blur-2xl" />
          <div className="sidebar-float absolute top-32 right-6 w-20 h-20 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 dark:from-emerald-800/10 dark:to-teal-800/10 rounded-full blur-xl" />
          <div className="sidebar-float absolute bottom-40 left-12 w-24 h-24 bg-gradient-to-br from-amber-200/20 to-orange-200/20 dark:from-amber-800/10 dark:to-orange-800/10 rounded-full blur-xl" />
          <div className="sidebar-float absolute bottom-20 right-8 w-32 h-32 bg-gradient-to-br from-rose-200/20 to-pink-200/20 dark:from-rose-800/10 dark:to-pink-800/10 rounded-full blur-2xl" />
        </div>

        {/* Close button for mobile */}
        <button
          onClick={onToggle}
          className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-400 md:hidden transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Enhanced Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="sidebar-header-item flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl sidebar-float">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-2xl blur opacity-40 animate-pulse" />
              <div className="sidebar-sparkle absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-cyan-700 dark:from-slate-100 dark:via-blue-300 dark:to-cyan-300 bg-clip-text text-transparent">
                FinBot
              </h1>
              <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">AI Banking Assistant</p>
            </div>
          </div>

          <button
            onClick={handleNewChat}
            className="new-chat-btn sidebar-header-item w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-base group"
            onMouseEnter={(e) => {
              gsap.to(e.currentTarget, {
                scale: 1.03,
                y: -2,
                duration: 0.3,
                ease: "back.out(1.7)",
              })
            }}
            onMouseLeave={(e) => {
              gsap.to(e.currentTarget, {
                scale: 1,
                y: 0,
                duration: 0.3,
                ease: "power2.out",
              })
            }}
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            New Chat
          </button>
        </div>

        {/* Enhanced Search Bar */}
        <div className="sidebar-header-item p-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Chat list with enhanced styling */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4" ref={listRef}>
          {/* Section Header */}
          <div className="flex items-center justify-between px-3 py-3 mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                {showArchived ? "Archived Chats" : "Recent Chats"}
              </h3>
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <Archive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          <div className="space-y-2">
            {(searchQuery ? filteredSessions : list).map((c, i) => {
              const active = pathname === `/chat/${c.id}`
              const skeleton = !c.title

              return (
                <div
                  key={c.id}
                  className={`
                    chat-item group px-4 py-4 rounded-xl border transition-all duration-300 cursor-pointer
                    ${
                      skeleton
                        ? "bg-slate-100/50 dark:bg-slate-800/50 animate-pulse border-transparent"
                        : active
                          ? "bg-gradient-to-r from-blue-100/80 to-cyan-100/80 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-300/50 dark:border-blue-700/40 shadow-lg"
                          : "hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/30 hover:shadow-md"
                    }
                  `}
                  onClick={() => !skeleton && router.push(`/chat/${c.id}`)}
                  onMouseEnter={(e) => {
                    setActiveHover(c.id)
                    if (!skeleton) animateChatItemHover(e.currentTarget, true)
                  }}
                  onMouseLeave={(e) => {
                    setActiveHover(null)
                    if (!skeleton) animateChatItemHover(e.currentTarget, false)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {c.isPinned && <Pin className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />}
                        <div
                          className={`
                          w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300
                          ${
                            active
                              ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg"
                              : "bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"
                          }
                        `}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                          {c.title || "Loading..."}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate pl-10 leading-relaxed">
                        {c.preview || (skeleton ? "" : "Start a new conversation")}
                      </p>
                      {c.updatedAt && (
                        <div className="flex items-center gap-1 pl-10 mt-2">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(c.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {!skeleton && (
                      <div
                        className={`flex items-center gap-1 transition-all duration-300 ${
                          activeHover === c.id || active ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <button
                          className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 transition-all duration-300 hover:scale-110 active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle pin toggle
                          }}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 transition-all duration-300 hover:scale-110 active:scale-95"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle more options
                          }}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="p-5 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1">
          {[
            {
              icon: <Settings className="w-5 h-5" />,
              label: "Settings",
              onClick: () => setShowSettings(true),
              color: "text-slate-600 dark:text-slate-400",
            },
            {
              icon: <Download className="w-5 h-5" />,
              label: "Export Chat",
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              icon: <Share className="w-5 h-5" />,
              label: "Share",
              color: "text-blue-600 dark:text-blue-400",
            },
            {
              icon: isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />,
              label: isDarkMode ? "Light Mode" : "Dark Mode",
              onClick: toggleTheme,
              color: isDarkMode ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400",
            },
          ].map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-300 group hover:shadow-md"
              onMouseEnter={(e) => animateButtonHover(e.currentTarget, true)}
              onMouseLeave={(e) => animateButtonHover(e.currentTarget, false)}
            >
              <div className="flex items-center gap-3">
                <div className={`${item.color} group-hover:scale-110 transition-all duration-300`}>{item.icon}</div>
                <span className="font-semibold">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 group-hover:translate-x-1" />
            </button>
          ))}

          {/* Enhanced Pro Section */}
          <div className="pt-4 mt-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-4 px-4 py-4 bg-gradient-to-r from-slate-100/80 to-blue-100/80 dark:from-slate-800/80 dark:to-blue-900/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-xl blur opacity-40" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">FinBot Pro</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Unlock premium features</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            ref={settingsRef}
            className="bg-gradient-to-br from-white/98 to-slate-50/98 dark:from-slate-800/98 dark:to-slate-900/98 backdrop-blur-2xl rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200/50 dark:border-slate-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all duration-300 hover:scale-110 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Theme Setting */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Theme Preference
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setIsDarkMode(false)
                      document.documentElement.classList.remove("dark")
                    }}
                    className={`
                      p-4 rounded-xl border transition-all duration-300 flex items-center justify-center gap-3 font-semibold
                      ${
                        !isDarkMode
                          ? "bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300/50 shadow-lg text-blue-700"
                          : "bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-blue-300/50 dark:hover:border-blue-600/50"
                      }
                    `}
                  >
                    <Sun className="w-5 h-5" />
                    Light
                  </button>
                  <button
                    onClick={() => {
                      setIsDarkMode(true)
                      document.documentElement.classList.add("dark")
                    }}
                    className={`
                      p-4 rounded-xl border transition-all duration-300 flex items-center justify-center gap-3 font-semibold
                      ${
                        isDarkMode
                          ? "bg-gradient-to-r from-slate-800 to-slate-900 border-slate-600/50 shadow-lg text-slate-200"
                          : "bg-slate-100/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-slate-400/50 dark:hover:border-slate-500/50"
                      }
                    `}
                  >
                    <Moon className="w-5 h-5" />
                    Dark
                  </button>
                </div>
              </div>

              {/* Language Setting */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Language
                </label>
                <select className="w-full p-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 font-medium">
                  <option value="en">🇺🇸 English (US)</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="zh">🇨🇳 中文</option>
                  <option value="ja">🇯🇵 日本語</option>
                </select>
              </div>

              {/* Notification Setting */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Push Notifications</label>
                </div>
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-cyan-500 transition-all duration-300 shadow-inner">
                    <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-lg peer-checked:translate-x-7"></div>
                  </div>
                </div>
              </div>

              {/* Auto-save Setting */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Auto-save Chats</label>
                </div>
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 transition-all duration-300 shadow-inner">
                    <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-lg peer-checked:translate-x-7"></div>
                  </div>
                </div>
              </div>

              <button
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold text-base hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => setShowSettings(false)}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
