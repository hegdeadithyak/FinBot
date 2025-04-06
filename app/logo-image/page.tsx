"use client"

import { LogoStatic } from "@/components/logo-static"
import { motion } from "framer-motion"

export default function LogoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black py-12 px-4">
      <motion.div
        className="flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-4 p-4 bg-black rounded-xl">
          <motion.div
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
            className="scale-150"
          >
            <LogoStatic />
          </motion.div>
        </div>
        <h1 className="text-2xl font-bold text-white mt-4">FinBot Logo</h1>
        <p className="text-gray-400 text-center mt-2 max-w-md">
          Take a screenshot of this logo to use in documentation or marketing materials.
        </p>
      </motion.div>
    </div>
  )
} 