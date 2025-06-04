"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, MessageSquare, Settings, MoreHorizontal, Bot, History, Download, Share, Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

interface SidebarProps {
    onToggle: () => void
    isOpen: boolean
}

interface ChatHistory {
    id: string
    title: string
    timestamp: string
    preview: string
}

export function Sidebar({ onToggle, isOpen }: SidebarProps) {
    const { theme, setTheme } = useTheme()
    const [chatHistory] = useState<ChatHistory[]>([
        {
            id: "1",
            title: "Account Balance Inquiry",
            timestamp: "2 hours ago",
            preview: "What's my current account balance?",
        },
        {
            id: "2",
            title: "Transfer Funds",
            timestamp: "Yesterday",
            preview: "How do I transfer money to another account?",
        },
        {
            id: "3",
            title: "Loan Application",
            timestamp: "3 days ago",
            preview: "I want to apply for a personal loan",
        },
        {
            id: "4",
            title: "Credit Card Help",
            timestamp: "1 week ago",
            preview: "Help with credit card payment",
        },
    ])

    const [showSettings, setShowSettings] = useState(false)
    const [selectedLanguage, setSelectedLanguage] = useState("English")

    if (!isOpen) return null

    return (
        <motion.div
            className="h-full bg-muted/40 border-r border-border flex flex-col"
            initial={{ x: -100 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="p-4 border-b border-border">
                <motion.button
                    className="w-full flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">New Chat</span>
                </motion.button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 flex items-center gap-2">
                        <History className="w-3 h-3" />
                        Recent Chats
                    </h3>
                    <div className="space-y-1">
                        {chatHistory.map((chat, index) => (
                            <motion.div
                                key={chat.id}
                                className="group px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                whileHover={{ x: 2 }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                            <h4 className="text-sm font-medium text-foreground truncate">{chat.title}</h4>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{chat.preview}</p>
                                        <p className="text-xs text-muted-foreground/70 mt-1">{chat.timestamp}</p>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all">
                                        <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border space-y-2">
                <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    whileHover={{ x: 2 }}
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </motion.button>

                <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    whileHover={{ x: 2 }}
                >
                    <Download className="w-4 h-4" />
                    <span>Export Chat</span>
                </motion.button>

                <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    whileHover={{ x: 2 }}
                >
                    <Share className="w-4 h-4" />
                    <span>Share</span>
                </motion.button>

                <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    whileHover={{ x: 2 }}
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </motion.button>

                <div className="pt-2 border-t border-border">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">FinBot</p>
                            <p className="text-xs text-muted-foreground">AI Banking Assistant</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            className="bg-card text-card-foreground rounded-lg p-6 w-80 max-w-sm mx-4 shadow-lg border border-border"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold mb-4">Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Theme</label>
                                    <select
                                        className="w-full p-2 bg-input border border-input rounded-md text-foreground"
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="system">System</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                                    <select
                                        className="w-full p-2 bg-input border border-input rounded-md text-foreground"
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                    >
                                        <option>English</option>
                                        <option>Spanish</option>
                                        <option>French</option>
                                        <option>German</option>
                                        <option>Chinese</option>
                                        <option>Japanese</option>
                                        <option>Hindi</option>
                                        <option>Arabic</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground">Voice Input</span>
                                    <input type="checkbox" className="rounded bg-input border-input" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground">Auto-Read Messages</span>
                                    <input type="checkbox" className="rounded bg-input border-input" />
                                </div>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button
                                    className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
                                    onClick={() => setShowSettings(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                                    onClick={() => setShowSettings(false)}
                                >
                                    Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
