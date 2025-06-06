"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { CreditCard, Send, Clock, Wallet, Building, HelpCircle } from "lucide-react"

interface QuickActionsProps {
  onQuickActionClick: (action: string) => void
}

export function QuickActions({ onQuickActionClick }: QuickActionsProps) {
  const bankingActions = [
    {
      text: "Check my balance",
      icon: <Wallet className="w-3 h-3 mr-1" />,
    },
    {
      text: "Transfer money",
      icon: <Send className="w-3 h-3 mr-1" />,
    },
    {
      text: "Recent transactions",
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    {
      text: "Card services",
      icon: <CreditCard className="w-3 h-3 mr-1" />,
    },
    {
      text: "Branch locations",
      icon: <Building className="w-3 h-3 mr-1" />,
    },
    {
      text: "Help & Support",
      icon: <HelpCircle className="w-3 h-3 mr-1" />,
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)" }}
    >
      <motion.p 
        className="text-sm text-gray-800 mb-3 font-medium"
        animate={{ 
          textShadow: ["0 0 0px rgba(0,0,0,0)", "0 0 5px rgba(0,0,0,0.2)", "0 0 0px rgba(0,0,0,0)"] 
        }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
      >
        Quick Actions:
      </motion.p>
      <motion.div 
        className="flex flex-wrap gap-2" 
        variants={container} 
        initial="hidden" 
        animate="show"
      >
        {bankingActions.map((action, index) => (
          <motion.div 
            key={action.text} 
            variants={item}
            custom={index}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickActionClick(action.text)}
              className="text-xs border-gray-300 hover:bg-black hover:text-white transition-all flex items-center bg-white text-gray-800"
            >
              {action.icon}
              {action.text}
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

