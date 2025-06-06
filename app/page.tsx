"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ThemeProvider } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, MessageSquare, Brain, Shield, Sparkles, ArrowRight, Bot, TrendingUp, Star } from "lucide-react"
import Link from "next/link"
import { Chat } from "@/components/chat"
import { Sidebar } from "@/components/sidebar"

interface User {
  id: string
  email: string
  name: string
  preferredLanguage: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include", // Include cookies
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user) {
            setUser(data.user)
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // If user is authenticated, show the chat interface
  if (user) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="finbot-theme">
        <div className="flex h-screen bg-background text-foreground">
          {/* Sidebar */}
          <motion.div
            className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 overflow-hidden`}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Sidebar onToggle={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />
          </motion.div>

          <div className="flex-1 flex flex-col">
            <Chat sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          </div>
        </div>
      </ThemeProvider>
    )
  }

  // If loading, show a simple loading state
  if (isLoading) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="finbot-theme">
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          <motion.div
            className="flex items-center space-x-2 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Bot className="w-8 h-8" />
            </motion.div>
            <span className="text-lg">Loading...</span>
          </motion.div>
        </div>
      </ThemeProvider>
    )
  }

  // If not authenticated, show the landing page
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Intelligence",
      description: "Advanced AI that understands context and provides intelligent responses",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get instant responses with our optimized AI processing",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your conversations are encrypted and completely private",
    },
    {
      icon: TrendingUp,
      title: "Continuous Learning",
      description: "AI that adapts and improves with every interaction",
    },
  ]

  return (
    <ThemeProvider defaultTheme="dark" storageKey="finbot-theme">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-foreground overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full mix-blend-screen filter blur-xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-400/10 rounded-full mix-blend-screen filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/3 rounded-full mix-blend-screen filter blur-xl animate-pulse delay-500"></div>
        </div>

        {/* Lightning effects */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-px h-px bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <motion.header
            className="p-6 flex justify-between items-center border-b border-gray-800/50"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center space-x-3">
              <motion.div
                className="p-2 bg-white rounded-lg shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bot className="w-6 h-6 text-black" />
              </motion.div>
              <span className="text-2xl font-bold text-white">FinBot</span>
            </div>
            <div className="flex space-x-3">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button className="bg-white text-black hover:bg-gray-200 font-medium" asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </motion.header>

          {/* Hero Section */}
          <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-4xl mx-auto"
            >
              <Badge className="mb-6 bg-gray-800/80 text-gray-200 border-gray-700">
                <Star className="w-4 h-4 mr-2" />
                Powered by Advanced AI
              </Badge>

              <motion.h1
                className="text-5xl md:text-7xl font-bold mb-6 text-white"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Your AI Financial
                <br />
                <span className="relative">
                  Assistant
                  <motion.div
                    className="absolute -top-2 -right-2 text-white"
                    animate={{
                      rotate: [0, 15, -15, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <Zap className="w-8 h-8 drop-shadow-lg" />
                  </motion.div>
                </span>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                Experience the future of financial conversations with our intelligent AI assistant. Get instant
                insights, personalized advice, and lightning-fast responses.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-lg font-medium group shadow-lg"
                  asChild
                >
                  <Link href="/register">
                    Start Chatting Now
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-600 text-gray-200 hover:bg-gray-800 hover:text-white px-8 py-3 text-lg"
                  asChild
                >
                  <Link href="/login">
                    <MessageSquare className="mr-2 w-5 h-5" />
                    Sign In
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  onHoverStart={() => setHoveredFeature(index)}
                  onHoverEnd={() => setHoveredFeature(null)}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm h-full hover:bg-gray-800/50 transition-colors">
                    <CardContent className="p-6 text-center">
                      <motion.div
                        className="inline-flex p-3 bg-gray-800 rounded-lg mb-4 border border-gray-700"
                        animate={{
                          scale: hoveredFeature === index ? 1.1 : 1,
                          borderColor: hoveredFeature === index ? "rgb(255, 255, 255)" : "rgb(55, 65, 81)",
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <feature.icon className="w-6 h-6 text-white" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats Section */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16 mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              {[
                { number: "10K+", label: "Active Users" },
                { number: "1M+", label: "Messages Processed" },
                { number: "99.9%", label: "Uptime" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <motion.div
                    className="text-3xl md:text-4xl font-bold text-white mb-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.4 + index * 0.1 }}
                  >
                    {stat.number}
                  </motion.div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </main>

          {/* Footer CTA */}
          <motion.footer
            className="p-6 text-center border-t border-gray-800/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <p className="text-gray-400 mb-4">Ready to revolutionize your financial conversations?</p>
            <Button className="bg-white text-black hover:bg-gray-200 font-medium" asChild>
              <Link href="/register">
                Join FinBot Today
                <Sparkles className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </motion.footer>
        </div>
      </div>
    </ThemeProvider>
  )
}
