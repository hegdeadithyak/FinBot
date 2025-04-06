"use client"

import { useEffect, useRef } from "react"

export function Logo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = 44
    canvas.height = 44

    // Draw the logo
    const drawLogo = () => {
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background gradient - modern blue-purple gradient
      const gradient = ctx.createLinearGradient(0, 0, 44, 44)
      gradient.addColorStop(0, "#4f46e5") // indigo
      gradient.addColorStop(1, "#7c3aed") // purple

      // Draw rounded rectangle
      const radius = 10
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(radius, 0)
      ctx.lineTo(canvas.width - radius, 0)
      ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius)
      ctx.lineTo(canvas.width, canvas.height - radius)
      ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height)
      ctx.lineTo(radius, canvas.height)
      ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius)
      ctx.lineTo(0, radius)
      ctx.quadraticCurveTo(0, 0, radius, 0)
      ctx.closePath()
      ctx.fill()

      // Draw stylized 'F' for FinBot
      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      
      // Main vertical line of 'F'
      ctx.rect(14, 10, 4, 24);
      
      // Top horizontal of 'F'
      ctx.rect(14, 10, 16, 4);
      
      // Middle horizontal of 'F'
      ctx.rect(14, 20, 12, 4);
      
      ctx.fill()

      // Draw subtle accent line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(34, 10)
      ctx.lineTo(34, 34)
      ctx.stroke()
    }

    drawLogo()

    // Optional: Add animation to the logo
    let angle = 0
    const animate = () => {
      if (!ctx) return

      angle += 0.01

      // Redraw logo
      drawLogo()

      // Draw animated accent
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"
      ctx.lineWidth = 2
      ctx.beginPath()
      
      // Animated dot moving around edge
      const x = 22 + Math.cos(angle * 3) * 18
      const y = 22 + Math.sin(angle * 3) * 18
      
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = "#ffffff"
      ctx.fill()

      requestAnimationFrame(animate)
    }

    animate()
  }, [])

  return (
    <div className="relative w-11 h-11 flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  )
}

