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

      // Background gradient - black and white
      const gradient = ctx.createLinearGradient(0, 0, 44, 44)
      gradient.addColorStop(0, "#ffffff") // white
      gradient.addColorStop(1, "#a0a0a0") // light gray

      // Draw rounded rectangle
      const radius = 10
      ctx.fillStyle = "#000000"  // black background
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
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(34, 10)
      ctx.lineTo(34, 34)
      ctx.stroke()
      
      // Add subtle border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(22, 22, 19, 0, Math.PI * 2)
      ctx.stroke()
    }

    drawLogo()

    // Add more animation to the logo
    let angle = 0
    const animate = () => {
      if (!ctx) return

      angle += 0.01

      // Redraw logo
      drawLogo()

      // Draw animated elements
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      
      // Animated particles
      const particles = 3
      for (let i = 0; i < particles; i++) {
        const offset = (Math.PI * 2 / particles) * i
        const x = 22 + Math.cos(angle * 2 + offset) * 15
        const y = 22 + Math.sin(angle * 2 + offset) * 15
        
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = "#ffffff"
        ctx.fill()
      }

      // Pulsating outer ring
      const pulseSize = 1 + Math.sin(angle * 3) * 0.1
      ctx.beginPath()
      ctx.arc(22, 22, 20 * pulseSize, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
      ctx.stroke()

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

