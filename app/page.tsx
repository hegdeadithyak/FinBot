"use client"

import { Chat } from "@/components/chat"
import { Logo } from "@/components/logo"
import { LogoStatic } from "@/components/logo-static"
import { motion } from "framer-motion"
import { Mic, Globe, TicketIcon, BrainCircuit, Database } from "lucide-react"

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-white text-gray-800">
      <motion.header
        className="sticky top-0 z-10 bg-black text-white border-b border-gray-200 shadow-md"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            >
              <LogoStatic />
            </motion.div>
            <h1 className="text-xl font-bold text-white">
              FinBot
            </h1>
          </motion.div>
          
          <div className="hidden md:flex items-center space-x-4">
            <motion.div
              className="flex items-center text-sm text-gray-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Mic className="w-4 h-4 mr-1 text-white animate-pulse-slow" />
              <span>Voice Enabled</span>
            </motion.div>
            <motion.div
              className="flex items-center text-sm text-gray-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Globe className="w-4 h-4 mr-1 text-white animate-pulse-slow" />
              <span>Multilingual</span>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8 md:py-12 flex flex-col lg:flex-row gap-8">
        <motion.div
          className="lg:w-3/4 flex flex-col"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-4 mb-6 border border-gray-200 overflow-hidden">
            <motion.div 
              className="bg-black text-white p-4 rounded-xl mb-4 border border-gray-800"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <motion.h2 
                className="text-lg font-semibold mb-2 text-white"
                animate={{ 
                  textShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 10px rgba(255,255,255,0.5)", "0 0 0px rgba(255,255,255,0)"] 
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Your Banking Assistant
              </motion.h2>
              <p className="text-sm opacity-90 text-gray-300">Ask questions about accounts, transfers, loans, or any banking service. I'm here to help!</p>
            </motion.div>
            <Chat />
          </div>
        </motion.div>
        
        <motion.div 
          className="lg:w-1/4"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-6 flex items-center">
              <motion.span
                animate={{ 
                  textShadow: ["0 0 0px rgba(0,0,0,0)", "0 0 8px rgba(0,0,0,0.2)", "0 0 0px rgba(0,0,0,0)"]
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                Advanced Features
              </motion.span>
            </h3>
            
            <div className="space-y-5">
              <motion.div 
                className="flex items-start"
                whileHover={{ x: 5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <div className="bg-black p-2 rounded-lg mr-3 border border-gray-200">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Smart Responses</h4>
                  <p className="text-xs text-gray-600">AI-powered answers to all your banking queries</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-start"
                whileHover={{ x: 5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <div className="bg-black p-2 rounded-lg mr-3 border border-gray-200">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Contextual Database</h4>
                  <p className="text-xs text-gray-600">Remembers your conversation for personalized help</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-start"
                whileHover={{ x: 5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <div className="bg-black p-2 rounded-lg mr-3 border border-gray-200">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Multilingual</h4>
                  <p className="text-xs text-gray-600">Get assistance in multiple languages</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-start"
                whileHover={{ x: 5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <div className="bg-black p-2 rounded-lg mr-3 border border-gray-200">
                  <TicketIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Issue Escalation</h4>
                  <p className="text-xs text-gray-600">Automatic support tickets for complex issues</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-start"
                whileHover={{ x: 5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.1 }}
              >
                <div className="bg-black p-2 rounded-lg mr-3 border border-gray-200">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Voice Interaction</h4>
                  <p className="text-xs text-gray-600">Speak naturally with voice input & output</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.footer
        className="py-4 text-center text-sm text-gray-600 border-t border-gray-200 bg-black text-white mt-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <div className="container mx-auto">
          <p>© {new Date().getFullYear()} FinBot - Banking Assistant</p>
        </div>
      </motion.footer>
    </main>
  )
}

