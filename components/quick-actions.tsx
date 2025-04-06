"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { CreditCard, Send, Clock, Wallet, Building, HelpCircle } from "lucide-react"

interface QuickActionsProps {
  onSelectAction: (action: string) => void
}

export function QuickActions({ onSelectAction }: QuickActionsProps) {
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
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <p className="text-sm text-gray-500 mb-2">Quick Actions:</p>
      <motion.div className="flex flex-wrap gap-2" variants={container} initial="hidden" animate="show">
        {bankingActions.map((action) => (
          <motion.div key={action.text} variants={item}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectAction(action.text)}
              className="text-xs border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center"
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

