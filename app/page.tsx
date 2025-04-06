"use client"

import { Chat } from "@/components/chat"
import { Logo } from "@/components/logo"
import { motion } from "framer-motion"
import { MicrophoneIcon, Globe, TicketIcon, BrainCircuit, Memory } from "lucide-react"

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <motion.header
        className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Logo />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
              FinBot
            </h1>
          </motion.div>
          
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <MicrophoneIcon className="w-4 h-4 mr-1 text-indigo-600" />
              <span>Voice Enabled</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Globe className="w-4 h-4 mr-1 text-indigo-600" />
              <span>Multilingual</span>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8 md:py-12 flex flex-col lg:flex-row gap-8">
        <motion.div
          className="lg:w-3/4 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-xl mb-4">
              <h2 className="text-lg font-semibold mb-2">Your Banking Assistant</h2>
              <p className="text-sm opacity-90">Ask questions about accounts, transfers, loans, or any banking service. I'm here to help!</p>
            </div>
            <Chat />
          </div>
        </motion.div>
        
        <motion.div 
          className="lg:w-1/4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Features</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                  <BrainCircuit className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Smart Responses</h4>
                  <p className="text-xs text-gray-600">AI-powered answers to all your banking queries</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                  <Memory className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Contextual Memory</h4>
                  <p className="text-xs text-gray-600">Remembers your conversation for personalized help</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                  <Globe className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Multilingual</h4>
                  <p className="text-xs text-gray-600">Get assistance in multiple languages</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                  <TicketIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Issue Escalation</h4>
                  <p className="text-xs text-gray-600">Automatic support tickets for complex issues</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                  <MicrophoneIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Voice Interaction</h4>
                  <p className="text-xs text-gray-600">Speak naturally with voice input & output</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.footer
        className="py-4 text-center text-sm text-gray-500 border-t border-gray-200 bg-white mt-auto"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto">
          <p>© {new Date().getFullYear()} FinBot - Banking Assistant</p>
        </div>
      </motion.footer>
    </main>
  )
}

