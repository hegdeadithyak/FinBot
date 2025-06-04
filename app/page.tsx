"use client"

import { Chat } from "@/components/chat"
import { Sidebar } from "@/components/sidebar"
import { useState } from "react"
import { motion } from "framer-motion"
import { ThemeProvider } from "@/components/theme-provider"

export default function Home() {
    const [sidebarOpen, setSidebarOpen] = useState(true)

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
